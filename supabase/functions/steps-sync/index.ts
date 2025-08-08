import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

interface SyncBody {
  provider: 'fitbit' | 'strava' | 'healthkit' | 'googlefit';
  backfillDays?: number;
}

function getUserClient(req: Request) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const authHeader = req.headers.get('Authorization') ?? '';
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });
}

function getServiceClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(supabaseUrl, serviceKey);
}

function buildCorsHeaders(origin: string | null) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  } as Record<string, string>;
}

// Fit a 30s timeout for external API
async function withTimeout<T>(promise: Promise<T>, ms = 30000): Promise<T> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), ms);
  try {
    // @ts-ignore
    return await promise(controller.signal);
  } finally {
    clearTimeout(t);
  }
}

async function fetchFitbitSteps(accessToken: string, backfillDays: number) {
  const url = `https://api.fitbit.com/1/user/-/activities/steps/date/today/${backfillDays}d.json`;
  const doFetch = async (signal?: AbortSignal) => {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Fitbit API error ${res.status}: ${text}`);
    }
    const json = await res.json();
    const items = (json['activities-steps'] || []) as Array<{ dateTime: string; value: string }>;
    return items.map((d) => ({ date: d.dateTime, steps: Number(d.value) || 0, raw: d }));
  };
  return await withTimeout(doFetch() as any, 30000);
}

function normalizeDateToLocal(dateStr: string, tz?: string): string {
  // Fitbit returns date in user's account local date already; trust dateStr
  // For generalization we keep tz for storage and return the input
  return dateStr;
}

async function upsertSteps(
  serviceClient: ReturnType<typeof createClient>,
  userId: string,
  source: string,
  items: Array<{ date: string; steps: number; raw?: unknown }>,
  localTz?: string
) {
  if (!items.length) return 0;
  const rows = items.map((i) => ({
    user_id: userId,
    source,
    date: normalizeDateToLocal(i.date, localTz),
    steps: i.steps,
    raw: i.raw ?? {},
    local_tz: localTz ?? null,
  }));
  const { error } = await serviceClient
    .from('activity_steps')
    .upsert(rows, { onConflict: 'user_id,source,date' });
  if (error) throw error;
  return rows.length;
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin');
  const corsHeaders = buildCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = (await req.json()) as SyncBody;
    const provider = body.provider;
    const backfillDays = Math.min(Math.max(body.backfillDays ?? 7, 1), 60);

    if (!['fitbit', 'strava', 'healthkit', 'googlefit'].includes(provider)) {
      return new Response(JSON.stringify({ error: 'Invalid provider' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Require auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userClient = getUserClient(req);
    const serviceClient = getServiceClient();

    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const clientTz = req.headers.get('x-client-timezone') || undefined;

    // Fetch oauth token for provider (fitbit/strava)
    let accessToken: string | null = null;
    if (provider === 'fitbit' || provider === 'strava') {
      const { data: tokenRow } = await serviceClient
        .from('oauth_tokens')
        .select('access_token, refresh_token, expires_at')
        .eq('user_id', user.id)
        .eq('provider', provider)
        .maybeSingle();
      accessToken = tokenRow?.access_token ?? null;
    }

    let importedDays = 0;

    if (provider === 'fitbit') {
      if (!accessToken) {
        return new Response(
          JSON.stringify({ importedDays: 0, provider, note: 'No Fitbit connection found' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const items = await fetchFitbitSteps(accessToken, backfillDays);
      importedDays = await upsertSteps(serviceClient, user.id, 'fitbit', items, clientTz);
    } else if (provider === 'strava') {
      // Strava rarely provides raw steps
      return new Response(
        JSON.stringify({ importedDays: 0, provider, note: 'Strava may not provide step counts; Fitbit recommended for steps.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else if (provider === 'healthkit' || provider === 'googlefit') {
      return new Response(
        JSON.stringify({ importedDays: 0, provider, note: 'Native-only; coming soon' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify({ importedDays, provider }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('steps-sync error:', e);
    const origin = req.headers.get('origin');
    const corsHeaders = buildCorsHeaders(origin);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

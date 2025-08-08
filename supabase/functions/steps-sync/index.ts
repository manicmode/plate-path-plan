import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SyncBody {
  provider: 'fitbit' | 'strava' | 'healthkit' | 'googlefit';
  backfillDays?: number;
}

function getSupabaseClient(req: Request) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const authHeader = req.headers.get('Authorization') ?? '';
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });
}

async function fetchFitbitSteps(accessToken: string, backfillDays: number) {
  // Fitbit intraday steps: daily summary endpoint returns a list by date
  const url = `https://api.fitbit.com/1/user/-/activities/steps/date/today/${backfillDays}d.json`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Fitbit API error ${res.status}: ${text}`);
  }
  const json = await res.json();
  // Response shape: { "activities-steps": [ { dateTime: 'YYYY-MM-DD', value: '1234' }, ... ] }
  const items = (json['activities-steps'] || []) as Array<{ dateTime: string; value: string }>;
  return items.map((d) => ({ date: d.dateTime, steps: Number(d.value) || 0, raw: d }));
}

async function upsertSteps(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  source: string,
  items: Array<{ date: string; steps: number; raw?: unknown }>,
  localTz?: string
) {
  if (!items.length) return 0;
  const rows = items.map((i) => ({
    user_id: userId,
    source,
    date: i.date,
    steps: i.steps,
    raw: i.raw ?? {},
    local_tz: localTz ?? null,
  }));
  const { error } = await supabase
    .from('activity_steps')
    .upsert(rows, { onConflict: 'user_id,source,date' });
  if (error) throw error;
  return rows.length;
}

Deno.serve(async (req: Request) => {
  // Handle CORS
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
    const backfillDays = Math.min(Math.max(body.backfillDays ?? 7, 1), 60); // clamp 1..60

    if (!['fitbit', 'strava', 'healthkit', 'googlefit'].includes(provider)) {
      return new Response(JSON.stringify({ error: 'Invalid provider' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = getSupabaseClient(req);

    // Get user
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Timezone hint from client if provided
    const clientTz = req.headers.get('x-client-timezone') || undefined;

    // Fetch oauth token for provider (for fitbit/strava)
    let accessToken: string | null = null;
    if (provider === 'fitbit' || provider === 'strava') {
      const { data: tokenRow, error: tokenErr } = await supabase
        .from('oauth_tokens')
        .select('access_token, refresh_token, expires_at')
        .eq('user_id', user.id)
        .eq('provider', provider)
        .maybeSingle();

      if (tokenErr) {
        console.error('Token fetch error:', tokenErr.message);
      }
      accessToken = tokenRow?.access_token ?? null;
    }

    let importedDays = 0;

    if (provider === 'fitbit') {
      if (!accessToken) {
        // No token yet
        return new Response(
          JSON.stringify({ importedDays: 0, source: 'fitbit', note: 'No Fitbit connection found' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const items = await fetchFitbitSteps(accessToken, backfillDays);
      importedDays = await upsertSteps(supabase, user.id, 'fitbit', items, clientTz);
    } else if (provider === 'strava') {
      // Strava rarely provides raw steps via public APIs
      // Gracefully return with 0 imported days
      return new Response(
        JSON.stringify({ importedDays: 0, source: 'strava', note: 'Strava does not provide step counts via API' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else if (provider === 'healthkit' || provider === 'googlefit') {
      // Native-only providers; stubs for now
      return new Response(
        JSON.stringify({ importedDays: 0, source: provider, note: 'Native-only; coming soon' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify({ importedDays, source: provider }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('steps-sync error:', e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

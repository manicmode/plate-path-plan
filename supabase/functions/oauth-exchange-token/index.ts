import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

interface ExchangeBody {
  provider: 'fitbit' | 'strava';
  code: string;
  redirectUri: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function getUserClient(req: Request) {
  const url = Deno.env.get('SUPABASE_URL')!;
  const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
  return createClient(url, anon, { global: { headers: { Authorization: req.headers.get('Authorization') || '' } } });
}

function getServiceClient() {
  const url = Deno.env.get('SUPABASE_URL')!;
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(url, key);
}

async function exchangeFitbit(code: string, redirectUri: string) {
  const clientId = Deno.env.get('FITBIT_CLIENT_ID')?.trim();
  const clientSecret = Deno.env.get('FITBIT_CLIENT_SECRET')?.trim();
  if (!clientId || !clientSecret) throw new Error('Fitbit not configured');
  const basic = btoa(`${clientId}:${clientSecret}`);
  const params = new URLSearchParams();
  params.set('client_id', clientId);
  params.set('grant_type', 'authorization_code');
  params.set('code', code);
  params.set('redirect_uri', redirectUri);
  const res = await fetch('https://api.fitbit.com/oauth2/token', {
    method: 'POST',
    headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  const txt = await res.text();
  if (!res.ok) throw new Error(`Fitbit token error ${res.status}`);
  const json = JSON.parse(txt);
  return {
    access_token: json.access_token as string,
    refresh_token: json.refresh_token as string,
    // Fitbit returns expires_in seconds from now
    expires_at: Math.floor(Date.now() / 1000) + (json.expires_in || 28800),
    scope: json.scope as string,
  };
}

async function exchangeStrava(code: string, redirectUri: string) {
  const clientId = Deno.env.get('STRAVA_CLIENT_ID')?.trim();
  const clientSecret = Deno.env.get('STRAVA_CLIENT_SECRET')?.trim();
  if (!clientId || !clientSecret) throw new Error('Strava not configured');
  const params = new URLSearchParams();
  params.set('client_id', clientId);
  params.set('client_secret', clientSecret);
  params.set('code', code);
  params.set('grant_type', 'authorization_code');
  // redirectUri not required by Strava on exchange
  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  const txt = await res.text();
  if (!res.ok) throw new Error(`Strava token error ${res.status}`);
  const json = JSON.parse(txt);
  return {
    access_token: json.access_token as string,
    refresh_token: json.refresh_token as string,
    expires_at: json.expires_at as number, // epoch seconds
    scope: (json.scope as string) || '',
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  try {
    const userClient = getUserClient(req);
    const service = getServiceClient();
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const body = (await req.json()) as ExchangeBody;
    if (!body?.provider || !body?.code || !body?.redirectUri) {
      return new Response(JSON.stringify({ error: 'Missing parameters' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    let tokens: { access_token: string; refresh_token: string; expires_at: number; scope?: string };
    if (body.provider === 'fitbit') tokens = await exchangeFitbit(body.code, body.redirectUri);
    else if (body.provider === 'strava') tokens = await exchangeStrava(body.code, body.redirectUri);
    else return new Response(JSON.stringify({ error: 'Unsupported provider' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    // Upsert without logging tokens
    const { error } = await service.from('oauth_tokens').upsert(
      {
        user_id: userData.user.id,
        provider: body.provider,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: tokens.expires_at,
        scopes: tokens.scope || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,provider' }
    );
    if (error) throw error;

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

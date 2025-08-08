import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'GET') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  try {
    // No auth required to read public config; but keep consistent auth requirements
    const fitbitClientId = Deno.env.get('FITBIT_CLIENT_ID')?.trim() || '';
    const fitbitRedirect = Deno.env.get('FITBIT_REDIRECT_URI')?.trim() || '';
    const stravaClientId = Deno.env.get('STRAVA_CLIENT_ID')?.trim() || '';
    const stravaRedirect = Deno.env.get('STRAVA_REDIRECT_URI')?.trim() || '';

    const resp = {
      fitbit: {
        configured: !!(fitbitClientId && fitbitRedirect),
        clientId: fitbitClientId || null,
        redirectUri: fitbitRedirect || null,
      },
      strava: {
        configured: !!(stravaClientId && stravaRedirect),
        clientId: stravaClientId || null,
        redirectUri: stravaRedirect || null,
      },
    };

    return new Response(JSON.stringify(resp), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

// Edge function: test-share-cards
// Runs a safe insert to share_cards, verifies trigger + unique index, returns before/after + counts
// Uses Service Role to bypass RLS for deterministic testing and optional cleanup

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type TestBody = {
  owner_user_id: string;
  template?: string;
  size?: string; // 'og' | 'square' | 'story'
  image_url?: string;
  hash?: string; // e.g. 'abc123'
  cleanup?: boolean; // default true
};

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Dev guard
    const ENV = Deno.env.get('ENV') || 'dev';
    if (ENV !== 'dev') {
      return new Response('Not available', { status: 403, headers: corsHeaders });
    }

    // Shared secret guard
    const secret = Deno.env.get('TEST_FN_SECRET') ?? '';
    const provided = req.headers.get('x-test-secret') ?? '';
    if (!secret || provided !== secret) {
      return new Response('Forbidden', { status: 403, headers: corsHeaders });
    }

    const url = new URL(req.url);

    const body = (await req.json().catch(() => ({}))) as Partial<TestBody>;

    const template = body.template || 'win_basic';
    const size = body.size || 'og';
    const image_url = body.image_url || 'https://example.com/test.png';
    const hash = body.hash || 'abc123';

    // cleanup: defaults to true; can be overridden by ?cleanup=false
    const cleanupParam = url.searchParams.get('cleanup');
    const cleanup = cleanupParam ? cleanupParam !== 'false' : body.cleanup !== false;

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return new Response(JSON.stringify({ error: 'Missing Supabase env vars' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Authenticated client with caller's JWT
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    });

    // Require signed-in user
    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr || !authData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const owner_user_id = authData.user.id;

    // Before snapshot
    const { data: beforeProfile } = await supabase
      .from('user_profiles')
      .select('shares_count, updated_at')
      .eq('user_id', owner_user_id)
      .single();

    // Upsert with ON CONFLICT (owner_user_id, hash, size) DO NOTHING
    const { error: upsertErr } = await supabase
      .from('share_cards')
      .upsert(
        {
          owner_user_id,
          template,
          size,
          image_url,
          hash,
          is_public: false, // keep test data private
        },
        { onConflict: 'owner_user_id,hash,size', ignoreDuplicates: true, returning: 'representation' }
      );

    if (upsertErr) {
      console.error('upsertErr', upsertErr);
      return new Response(JSON.stringify({ error: 'Upsert failed', details: upsertErr }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // After snapshot
    const { data: afterProfile } = await supabase
      .from('user_profiles')
      .select('shares_count, updated_at')
      .eq('user_id', owner_user_id)
      .single();

    // Count rows for (owner_user_id, hash, size)
    const { count } = await supabase
      .from('share_cards')
      .select('*', { count: 'exact', head: true })
      .eq('owner_user_id', owner_user_id)
      .eq('hash', hash)
      .eq('size', size);

    let afterCleanup: { shares_count: number | null; updated_at: string | null; count: number | null } | null = null;

    if (cleanup) {
      // Delete the test row
      await supabase
        .from('share_cards')
        .delete()
        .eq('owner_user_id', owner_user_id)
        .eq('hash', hash)
        .eq('size', size);

      // Decrement shares_count deterministically
      const current = (afterProfile?.shares_count ?? 0) as number;
      const decremented = Math.max(current - 1, 0);
      const nowIso = new Date().toISOString();
      await supabase
        .from('user_profiles')
        .update({ shares_count: decremented, updated_at: nowIso })
        .eq('user_id', owner_user_id);

      const { data: postCleanup } = await supabase
        .from('user_profiles')
        .select('shares_count, updated_at')
        .eq('user_id', owner_user_id)
        .single();

      const { count: postCleanupCount } = await supabase
        .from('share_cards')
        .select('*', { count: 'exact', head: true })
        .eq('owner_user_id', owner_user_id)
        .eq('hash', hash)
        .eq('size', size);

      afterCleanup = {
        shares_count: (postCleanup?.shares_count as number | null) ?? null,
        updated_at: (postCleanup?.updated_at as string | null) ?? null,
        count: postCleanupCount ?? null,
      };
    }

    return new Response(
      JSON.stringify({
        input: { owner_user_id, template, size, image_url, hash, cleanup },
        before: beforeProfile ?? null,
        after: afterProfile ?? null,
        count: count ?? null,
        afterCleanup,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    console.error('Unhandled error in test-share-cards:', err);
    return new Response(JSON.stringify({ error: 'Internal error', details: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

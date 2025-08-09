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
    const body = (await req.json().catch(() => ({}))) as Partial<TestBody>;
    const owner_user_id = body.owner_user_id?.trim();
    if (!owner_user_id) {
      return new Response(JSON.stringify({ error: 'owner_user_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const template = body.template || 'win_basic';
    const size = body.size || 'og';
    const image_url = body.image_url || 'https://example.com/test.png';
    const hash = body.hash || 'abc123';
    const cleanup = body.cleanup !== false; // default true

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!SUPABASE_URL || !SERVICE_ROLE) {
      return new Response(JSON.stringify({ error: 'Missing Supabase env vars' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Before snapshot
    const { data: beforeProfile, error: beforeErr } = await supabase
      .from('user_profiles')
      .select('shares_count, updated_at')
      .eq('user_id', owner_user_id)
      .single();

    if (beforeErr) {
      console.error('beforeErr', beforeErr);
    }

    // Upsert with ON CONFLICT (owner_user_id, hash, size) DO NOTHING behavior
    // Using upsert with ignoreDuplicates to avoid raising an error on duplicates
    const { error: upsertErr } = await supabase
      .from('share_cards')
      .upsert(
        {
          owner_user_id,
          template,
          size,
          image_url,
          hash,
          is_public: true,
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
    const { data: afterProfile, error: afterErr } = await supabase
      .from('user_profiles')
      .select('shares_count, updated_at')
      .eq('user_id', owner_user_id)
      .single();

    if (afterErr) {
      console.error('afterErr', afterErr);
    }

    // Count rows for (owner_user_id, hash, size)
    const { count, error: countErr } = await supabase
      .from('share_cards')
      .select('*', { count: 'exact', head: true })
      .eq('owner_user_id', owner_user_id)
      .eq('hash', hash)
      .eq('size', size);

    if (countErr) {
      console.error('countErr', countErr);
    }

    let afterCleanup: { shares_count: number | null; updated_at: string | null; count: number | null } | null = null;

    if (cleanup) {
      // Delete the test row
      const { error: delErr } = await supabase
        .from('share_cards')
        .delete()
        .eq('owner_user_id', owner_user_id)
        .eq('hash', hash)
        .eq('size', size);
      if (delErr) {
        console.error('delErr', delErr);
      }

      // Decrement shares_count deterministically
      const current = (afterProfile?.shares_count ?? 0) as number;
      const decremented = Math.max(current - 1, 0);
      const nowIso = new Date().toISOString();
      const { error: decErr } = await supabase
        .from('user_profiles')
        .update({ shares_count: decremented, updated_at: nowIso })
        .eq('user_id', owner_user_id);
      if (decErr) {
        console.error('decErr', decErr);
      }

      const { data: postCleanup, error: postCleanupErr } = await supabase
        .from('user_profiles')
        .select('shares_count, updated_at')
        .eq('user_id', owner_user_id)
        .single();
      if (postCleanupErr) {
        console.error('postCleanupErr', postCleanupErr);
      }
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

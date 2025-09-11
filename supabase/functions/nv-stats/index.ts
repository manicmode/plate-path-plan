import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!; // read-only is fine via RLS

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[NV][STATS] Getting vault statistics...');
    
    const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Get counts from each table
    const itemsCount = await sb
      .from("nutrition_vault.items")
      .select("id", { count: "exact", head: true });

    const aliasesCount = await sb
      .from("nutrition_vault.aliases")
      .select("id", { count: "exact", head: true });

    const lookupsCount = await sb
      .from("nutrition_vault.lookups")
      .select("id", { count: "exact", head: true });

    // Get latest update info
    const latest = await sb
      .from("nutrition_vault.items")
      .select("first_seen,updated_at")
      .order("updated_at", { ascending: false })
      .limit(1);

    const stats = {
      counts: {
        items: itemsCount.count ?? 0,
        aliases: aliasesCount.count ?? 0,
        lookups: lookupsCount.count ?? 0,
      },
      latest: latest.data?.[0] ?? null,
      generated_at: new Date().toISOString()
    };

    console.log('[NV][STATS] Vault stats:', stats);

    return new Response(
      JSON.stringify(stats),
      { 
        headers: { 
          ...corsHeaders,
          "content-type": "application/json" 
        } 
      }
    );

  } catch (error) {
    console.error('[NV][STATS] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to get vault statistics' }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders,
          "content-type": "application/json" 
        } 
      }
    );
  }
});
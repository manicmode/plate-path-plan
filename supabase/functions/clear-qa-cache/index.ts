import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TEST_QUERIES = [
  'club sandwich',
  'club sandwich on wheat', 
  'yakisoba',
  'aloo gobi',
  'pollo con rajas'
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[QA-CLEAR] Clearing enrichment cache for QA test queries...');
    
    // Use service role client for cache operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      }
    );

    // Delete specific test queries
    const { error: deleteError } = await supabaseAdmin
      .from('food_enrichment_cache')
      .delete()
      .in('query', TEST_QUERIES);
      
    if (deleteError) {
      console.error('[QA-CLEAR] Specific query deletion failed:', deleteError);
      return new Response(JSON.stringify({
        success: false,
        error: deleteError.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log('[QA-CLEAR] ✅ Cache cleared successfully');
    
    return new Response(JSON.stringify({
      success: true,
      cleared_queries: TEST_QUERIES
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error(`[QA-CLEAR] Failed: ${error.message}`);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
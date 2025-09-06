import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('🧹 cleanup-expired-cache function started at:', new Date().toISOString());
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Use service role client to bypass RLS
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

    console.log('🧹 Starting cleanup of expired food enrichment cache entries...');

    // Delete expired cache entries
    const { data, error } = await supabaseAdmin
      .from('food_enrichment_cache')
      .delete()
      .not('expires_at', 'is', null)
      .lt('expires_at', new Date().toISOString());

    if (error) {
      console.error('🚨 Error during cache cleanup:', error);
      throw error;
    }

    const deletedCount = data?.length || 0;
    console.log(`✅ Cache cleanup completed. Deleted ${deletedCount} expired entries.`);

    return new Response(JSON.stringify({
      success: true,
      deletedCount,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('🚨 Critical error in cleanup-expired-cache:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
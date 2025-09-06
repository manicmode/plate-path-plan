import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('🍎 food-cache-example function started at:', new Date().toISOString());
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, canonical, source, confidence } = await req.json();
    
    if (!query || !canonical || !source) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use service role client to bypass RLS for cache writes
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

    // Create query hash (in production, use crypto-js or similar)
    const encoder = new TextEncoder();
    const data = encoder.encode(query.toLowerCase());
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const query_hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    console.log('📝 Caching food enrichment data with TTL...');

    // Cache with 90-day TTL
    const { error } = await supabaseAdmin
      .from('food_enrichment_cache')
      .upsert({
        query_hash,
        query,
        response_data: canonical,   // your EnrichedFood payload
        source,
        confidence: Math.max(0, Math.min(1, confidence || 0.7)), // Clamp confidence to [0,1]
        expires_at: new Date(Date.now() + 90*24*3600*1000).toISOString() // 90d TTL
      }, { onConflict: 'query_hash' });

    if (error) {
      console.error('🚨 Error caching food enrichment:', error);
      throw error;
    }

    console.log('✅ Food enrichment cached successfully with 90-day TTL');

    return new Response(JSON.stringify({
      success: true,
      cached: true,
      query_hash,
      expires_at: new Date(Date.now() + 90*24*3600*1000).toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('🚨 Critical error in food-cache-example:', error);
    return new Response(JSON.stringify({
      error: 'Caching failed',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
// Minimal stub edge function to prevent deploy failures
// This function is not currently implemented but referenced in deployment config

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// deno-lint-ignore no-explicit-any
export const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[PARSE-FOOD-ITEMS] Stub function called');
    
    return new Response(JSON.stringify({ 
      ok: true, 
      reason: "stub - function not yet implemented",
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json' 
      },
    });
    
  } catch (error) {
    console.error('[PARSE-FOOD-ITEMS] Error:', error);
    
    return new Response(JSON.stringify({ 
      ok: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json' 
      },
    });
  }
};

// Supabase Deno serve
Deno.serve(handler);
// Stub edge function to fix deploy issues
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  return new Response(JSON.stringify({ 
    ok: true, 
    message: "Parse food items stub - not implemented" 
  }), {
    headers: { 
      ...corsHeaders,
      "content-type": "application/json" 
    },
    status: 200
  });
});
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    
    console.log("🔍 Debug Email Config Request:", {
      method: req.method,
      headers: Object.fromEntries(req.headers.entries()),
      body,
      timestamp: new Date().toISOString()
    })

    // Log environment variables (safely)
    console.log("🌍 Environment Check:", {
      supabaseUrl: Deno.env.get("SUPABASE_URL"),
      hasSupabaseKey: !!Deno.env.get("SUPABASE_ANON_KEY"),
      timestamp: new Date().toISOString()
    })

    return new Response(JSON.stringify({
      success: true,
      message: "Debug info logged to console",
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    })

  } catch (error: any) {
    console.error("❌ Debug function error:", error)
    
    return new Response(JSON.stringify({
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    })
  }
})
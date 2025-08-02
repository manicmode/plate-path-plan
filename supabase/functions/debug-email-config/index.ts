import { serve } from "https://deno.land/std@0.190.0/http/server.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

interface DebugEmailRequest {
  action: 'signup' | 'resend' | 'test';
  email?: string;
  emailRedirectTo?: string;
  metadata?: any;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const body: DebugEmailRequest = await req.json()
    
    console.log("🔍 DEBUG EMAIL CONFIG - Request Details:", {
      method: req.method,
      timestamp: new Date().toISOString(),
      userAgent: req.headers.get('user-agent'),
      referer: req.headers.get('referer'),
      origin: req.headers.get('origin'),
      body
    })

    // Log environment variables (safely)
    console.log("🌍 DEBUG EMAIL CONFIG - Environment Check:", {
      supabaseUrl: Deno.env.get("SUPABASE_URL"),
      hasSupabaseKey: !!Deno.env.get("SUPABASE_ANON_KEY"),
      hasServiceKey: !!Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
      timestamp: new Date().toISOString()
    })

    // Validate emailRedirectTo if provided
    if (body.emailRedirectTo) {
      console.log("📧 DEBUG EMAIL CONFIG - Redirect URL Analysis:", {
        url: body.emailRedirectTo,
        isValid: isValidUrl(body.emailRedirectTo),
        protocol: getProtocol(body.emailRedirectTo),
        hostname: getHostname(body.emailRedirectTo),
        path: getPath(body.emailRedirectTo),
        timestamp: new Date().toISOString()
      })
    }

    // Log any metadata
    if (body.metadata) {
      console.log("📋 DEBUG EMAIL CONFIG - Additional Metadata:", {
        metadata: body.metadata,
        timestamp: new Date().toISOString()
      })
    }

    // Generate response with debug info
    const debugInfo = {
      requestReceived: true,
      timestamp: new Date().toISOString(),
      action: body.action,
      email: body.email ? maskEmail(body.email) : 'not provided',
      emailRedirectTo: body.emailRedirectTo || 'not provided',
      environment: {
        hasSupabaseUrl: !!Deno.env.get("SUPABASE_URL"),
        hasSupabaseKey: !!Deno.env.get("SUPABASE_ANON_KEY")
      }
    }

    console.log("✅ DEBUG EMAIL CONFIG - Response Generated:", debugInfo)

    return new Response(JSON.stringify({
      success: true,
      message: "Debug info logged successfully",
      debugInfo
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    })

  } catch (error: any) {
    console.error("❌ DEBUG EMAIL CONFIG - Error:", {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    })
    
    return new Response(JSON.stringify({
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    })
  }
})

// Helper functions
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function getProtocol(url: string): string {
  try {
    return new URL(url).protocol;
  } catch {
    return 'invalid';
  }
}

function getHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return 'invalid';
  }
}

function getPath(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return 'invalid';
  }
}

function maskEmail(email: string): string {
  const parts = email.split('@');
  if (parts.length !== 2) return 'invalid-email';
  
  const username = parts[0];
  const domain = parts[1];
  
  if (username.length <= 2) {
    return `${username}***@${domain}`;
  }
  
  return `${username.substring(0, 2)}***@${domain}`;
}
// supabase/functions/vision-ocr/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ALLOWLIST: (string | RegExp)[] = [
  "http://localhost:5173",
  "http://localhost:5174",
  /\.lovable\.dev$/i,        // previews/sandboxes
  /\.sandbox\.lovable\.dev$/i,
  /\.lovable\.app$/i,        // ✅ production domains
  Deno.env.get("APP_WEB_ORIGIN") || "",
  Deno.env.get("APP_APP_ORIGIN") || "",
  // Bonus: comma-separated allowed origins from env
  ...(Deno.env.get("APP_ALLOWED_ORIGINS")?.split(",").map(s => s.trim()).filter(Boolean) || [])
].filter(Boolean);

function isAllowed(origin: string) {
  try {
    const u = new URL(origin);
    const full = u.origin;   // e.g. https://plate-path-plan.lovable.app
    const host = u.host;     // e.g. plate-path-plan.lovable.app
    return ALLOWLIST.some((e) =>
      typeof e === "string" ? (full === e || host === e.replace(/^https?:\/\//, "")) :
      e instanceof RegExp ? (e.test(full) || e.test(host)) : false
    );
  } catch { return false; }
}

function corsHeaders(origin: string | null) {
  const o = origin && isAllowed(origin) ? origin : "http://localhost:5173";
  return {
    "Access-Control-Allow-Origin": o,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Vary": "Origin",
  };
}

// Rate limiting store (in-memory, resets on function restart)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const key = userId || 'anonymous';
  const limit = rateLimitStore.get(key);
  
  // Reset if window expired (1 minute)
  if (!limit || now > limit.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + 60000 });
    return true;
  }
  
  // Check if under limit (6 requests per minute)
  if (limit.count < 6) {
    limit.count++;
    return true;
  }
  
  return false;
}

function redactToken(token?: string): string {
  if (!token) return 'none';
  return token.slice(0, 10) + '***';
}

serve(async (req) => {
  const startTime = Date.now();
  const origin = req.headers.get("origin");
  const baseHeaders = corsHeaders(origin);

  // Log origin for forensics (next 24h)
  console.info(`[vision-ocr] request from origin: ${origin || 'none'}`);

  if (req.method === "OPTIONS") {  
    console.info(`[vision-ocr] OPTIONS preflight for origin: ${origin}`);
    return new Response("ok", { headers: baseHeaders });
  }

  const { pathname } = new URL(req.url);

  if (pathname.endsWith("/ping")) {
    const hasAuth = !!req.headers.get("authorization");
    const apikey = req.headers.get("apikey") ? true : false;
    console.info(`[vision-ocr] ping from origin: ${origin}, auth: ${hasAuth}, apikey: ${apikey}`);
    const payload = { status: "ok", ts: Date.now(), origin, hasAuth, apikey };
    return new Response(JSON.stringify(payload), {
      headers: { "Content-Type": "application/json", ...baseHeaders },
    });
  }

  // Main OCR endpoint
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "method_not_allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...baseHeaders },
    });
  }

  try {
    // Check authorization
    const authHeader = req.headers.get('authorization');
    const apikey = req.headers.get('apikey');
    
    if (!authHeader || !apikey) {
      return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...baseHeaders },
      });
    }

    // Extract user ID from JWT for rate limiting
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    const userId = user?.id || 'anonymous';
    
    // Rate limiting
    if (!checkRateLimit(userId)) {
      console.info(`[vision-ocr] rate limit exceeded for user: ${userId}`);
      return new Response(JSON.stringify({ 
        ok: false, 
        error: "rate_limit_exceeded",
        message: "Maximum 6 OCR requests per minute exceeded"
      }), {
        status: 429,
        headers: { "Content-Type": "application/json", ...baseHeaders },
      });
    }

    console.info(`[vision-ocr] OCR request from origin: ${origin}, user: ${userId}, auth: ${redactToken(authHeader)}`);

    let imageData: Uint8Array;
    let mimeType: string;
    let bytes: number;

    // Handle both multipart/form-data and JSON payloads
    const contentType = req.headers.get('content-type') || '';
    
    if (contentType.includes('multipart/form-data')) {
      // Handle multipart/form-data with file
      const formData = await req.formData();
      const imageFile = formData.get('image') as File;
      
      if (!imageFile) {
        return new Response(JSON.stringify({ 
          ok: false, 
          error: "missing_image",
          message: "No image file provided in form data"
        }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...baseHeaders },
        });
      }

      imageData = new Uint8Array(await imageFile.arrayBuffer());
      mimeType = imageFile.type;
      bytes = imageFile.size;
    } else {
      // Handle JSON with dataUrl
      const body = await req.json();
      const dataUrl = body.dataUrl;
      
      if (!dataUrl || typeof dataUrl !== 'string') {
        return new Response(JSON.stringify({ 
          ok: false, 
          error: "missing_data_url",
          message: "No dataUrl provided in JSON body"
        }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...baseHeaders },
        });
      }

      // Parse data URL
      const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) {
        return new Response(JSON.stringify({ 
          ok: false, 
          error: "invalid_data_url",
          message: "Invalid data URL format"
        }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...baseHeaders },
        });
      }

      mimeType = match[1];
      const base64Data = match[2];
      
      try {
        imageData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
        bytes = imageData.length;
      } catch (decodeError) {
        return new Response(JSON.stringify({ 
          ok: false, 
          error: "invalid_base64",
          message: "Failed to decode base64 data"
        }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...baseHeaders },
        });
      }
    }

    // Validate image
    if (bytes > 8 * 1024 * 1024) { // 8MB limit
      return new Response(JSON.stringify({ 
        ok: false, 
        error: "file_too_large",
        message: "Image must be smaller than 8MB"
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...baseHeaders },
      });
    }

    if (!['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(mimeType)) {
      return new Response(JSON.stringify({ 
        ok: false, 
        error: "invalid_mime_type",
        message: "Only PNG, JPEG, and WebP images are supported"
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...baseHeaders },
      });
    }

    const duration = Date.now() - startTime;
    console.info(`[vision-ocr] processing image: ${bytes} bytes, ${mimeType}, user: ${userId}, duration: ${duration}ms`);

    // Mock OCR processing (replace with actual OCR logic)
    const mockText = bytes < 100 ? "" : "Sample OCR text - function is working";
    const words = mockText.split(/\s+/).filter(w => w.length > 0).length;

    const result = {
      ok: true,
      ts: Date.now(),
      duration_ms: duration,
      origin,
      summary: {
        text_joined: mockText,
        words
      },
      blocks: mockText ? [
        { type: "text", content: mockText }
      ] : [],
      meta: {
        bytes,
        mime: mimeType
      }
    };

    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json", ...baseHeaders },
    });

  } catch (err) {
    const duration = Date.now() - startTime;
    console.error(`[vision-ocr] error after ${duration}ms:`, err);
    return new Response(JSON.stringify({ 
      ok: false,
      error: "internal_error",
      message: err instanceof Error ? err.message : "Unknown error"
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...baseHeaders },
    });
  }
});
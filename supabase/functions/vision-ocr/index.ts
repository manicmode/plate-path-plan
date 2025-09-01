// supabase/functions/vision-ocr/index.ts - Real Google Vision OCR
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, x-client, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const VISION_URL = "https://vision.googleapis.com/v1/images:annotate";

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

  console.info(`[vision-ocr] request from origin: ${origin || 'none'}`);

  if (req.method === "OPTIONS") {  
    console.info(`[vision-ocr] OPTIONS preflight for origin: ${origin}`);
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "method_not_allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  try {
    // Check authorization
    const authHeader = req.headers.get('authorization');
    const apikey = req.headers.get('apikey');
    
    if (!authHeader || !apikey) {
      return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
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
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.info(`[vision-ocr] OCR request from origin: ${origin}, user: ${userId}, auth: ${redactToken(authHeader)}`);

    const body = await req.json();
    const { dataUrl, image_base64 } = body;
    
    // Handle both dataUrl and image_base64 formats
    let base64Data: string;
    if (dataUrl) {
      const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) {
        return new Response(JSON.stringify({ 
          ok: false, 
          error: "invalid_data_url",
          message: "Invalid data URL format"
        }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
      base64Data = match[2];
    } else if (image_base64) {
      base64Data = image_base64;
    } else {
      return new Response(JSON.stringify({ 
        ok: false, 
        error: "missing_image",
        message: "No image data provided"
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const apiKey = Deno.env.get("GOOGLE_VISION_API_KEY");
    if (!apiKey) {
      console.error("[vision-ocr] Missing GOOGLE_VISION_API_KEY");
      // Fallback to mock for development
      const mockText = base64Data.length < 100 ? "" : "Sample OCR text - API key not configured";
      const duration = Date.now() - startTime;
      
      return new Response(JSON.stringify({
        ok: true,
        ts: Date.now(),
        duration_ms: duration,
        origin,
        summary: {
          text_joined: mockText,
          words: mockText.split(/\s+/).filter(w => w.length > 0).length
        },
        blocks: mockText ? [{ type: "text", content: mockText }] : [],
        meta: { api_key_missing: true }
      }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Real Google Vision API call
    const visionBody = {
      requests: [{
        image: { content: base64Data },
        features: [
          { type: "TEXT_DETECTION" },
          { type: "LABEL_DETECTION", maxResults: 10 }
        ],
      }],
    };

    const visionResponse = await fetch(`${VISION_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(visionBody),
    });

    if (!visionResponse.ok) {
      console.error(`[vision-ocr] Google Vision API error: ${visionResponse.status}`);
      throw new Error(`Vision API error: ${visionResponse.statusText}`);
    }

    const visionData = await visionResponse.json();
    const response = visionData?.responses?.[0] ?? {};
    const text = response?.fullTextAnnotation?.text ?? "";
    const labels = (response?.labelAnnotations ?? []).map((x: any) => x.description);

    const duration = Date.now() - startTime;
    console.info(`[vision-ocr] processing image: ${base64Data.length} chars base64, user: ${userId}, duration: ${duration}ms`);

    const result = {
      ok: true,
      ts: Date.now(),
      duration_ms: duration,
      origin,
      summary: {
        text_joined: text,
        words: text.split(/\s+/).filter(w => w.length > 0).length
      },
      blocks: text ? [{ type: "text", content: text }] : [],
      labels: labels,
      meta: {
        base64_length: base64Data.length,
        labels_count: labels.length
      }
    };

    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
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
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
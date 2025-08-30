// supabase/functions/vision-ocr/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ALLOWLIST = [
  "http://localhost:5173",
  "http://localhost:5174",
  /\.?lovable\.dev$/,
  /\.?sandbox\.lovable\.dev$/,
  // Optionally add production domains from env:
  Deno.env.get("APP_WEB_ORIGIN") || "",
  Deno.env.get("APP_APP_ORIGIN") || "",
].filter(Boolean);

function isAllowed(origin: string) {
  try {
    const u = new URL(origin);
    const host = u.host;
    return ALLOWLIST.some((entry) =>
      typeof entry === "string"
        ? origin === entry
        : entry instanceof RegExp
          ? entry.test(host)
          : false
    );
  } catch {
    return false;
  }
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

serve(async (req) => {
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
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...baseHeaders },
    });
  }

  try {
    // Check authorization
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "missing_authorization" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...baseHeaders },
      });
    }

    console.info(`[vision-ocr] OCR request from origin: ${origin}, auth: ${authHeader.substring(0, 20)}...`);

    // Get form data
    const formData = await req.formData();
    const imageFile = formData.get('image') as File;
    
    if (!imageFile) {
      return new Response(JSON.stringify({ error: "missing_image" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...baseHeaders },
      });
    }

    console.info(`[vision-ocr] processing image: ${imageFile.name}, size: ${imageFile.size} bytes`);

    // For now, return a stub response - this will be enhanced with actual OCR logic
    const result = {
      status: "ok",
      timestamp: Date.now(),
      image: {
        name: imageFile.name,
        size: imageFile.size,
        type: imageFile.type
      },
      ocr: {
        text: "Sample OCR text - function is working",
        confidence: 0.95,
        detected_food_items: [
          {
            name: "Apple",
            confidence: 0.9,
            bbox: [10, 10, 100, 100]
          }
        ]
      },
      health: {
        score: 75
      }
    };

    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json", ...baseHeaders },
    });

  } catch (err) {
    console.error("[vision-ocr] error", err);
    return new Response(JSON.stringify({ 
      error: "internal_error",
      message: err instanceof Error ? err.message : "Unknown error"
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...baseHeaders },
    });
  }
});
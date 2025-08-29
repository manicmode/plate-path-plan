import { serve } from "https://deno.land/std/http/server.ts";
import { buildCors, handleOptions } from '../_shared/cors.ts';
// @ts-ignore - use ESM from gcloud if already vendored; otherwise use REST fetch below
import vision from "npm:@google-cloud/vision";

function getCredJSON(): string | null {
  return (
    Deno.env.get("GOOGLE_APPLICATION_CREDENTIALS_JSON") ??
    Deno.env.get("GOOGLE_APPLICATION_CREDENTIAL") ??
    Deno.env.get("GOOGLE_SERVICE_ACCOUNT") ??
    null
  );
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return handleOptions(req);

  const cors = buildCors(req.headers.get('origin'));
  const enabled = (Deno.env.get("VISION_OCR_ENABLED") ?? "").toLowerCase() === "true";
  const debug = (Deno.env.get("DEBUG_PERF") ?? "").toLowerCase() === "true";

  try {
    if (!enabled) {
      return new Response(JSON.stringify({ 
        ok: false, provider: 'vision', text: '', textLen: 0, reason: 'provider_disabled' 
      }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const body = await req.json().catch(() => ({}));
    // Support both new (image_b64) and existing (image/imageBase64) parameter names
    const b64 = body?.image_b64 ?? body?.image ?? body?.imageBase64 ?? "";
    
    if (!b64) {
      return new Response(JSON.stringify({ 
        ok: false, provider: 'vision', text: '', textLen: 0, reason: 'missing_image' 
      }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Strip data URL prefix if present
    const clean = b64.replace(/^data:image\/\w+;base64,/, "");
    const credentialsJSON = getCredJSON();
    
    if (!credentialsJSON) {
      return new Response(JSON.stringify({ 
        ok: false, provider: 'vision', text: '', textLen: 0, reason: 'missing_credentials' 
      }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const credentials = JSON.parse(credentialsJSON);

    // Use official Google Cloud Vision client
    const client = new vision.ImageAnnotatorClient({ credentials });
    const [result] = await client.textDetection({ image: { content: clean } });
    const text = result?.fullTextAnnotation?.text ?? result?.textAnnotations?.[0]?.description ?? "";

    if (debug) console.log("[VISION][OCR] len:", text?.length ?? 0);

    if (!text?.trim()) {
      return new Response(JSON.stringify({ 
        ok: false, provider: 'vision', text: '', textLen: 0, reason: 'no_text_detected' 
      }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    return new Response(JSON.stringify({ 
      ok: true, provider: 'vision', text, textLen: text.length 
    }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (err) {
    console.error("[VISION][ERROR]", err?.message || err);
    // Keep error text minimal in response
    return new Response(JSON.stringify({ 
      ok: false, provider: 'vision', text: '', textLen: 0, reason: 'vision_api_error' 
    }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
      status: 200,
    });
  }
});
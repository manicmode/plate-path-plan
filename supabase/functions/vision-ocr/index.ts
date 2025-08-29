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

Deno.serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
    });
  }

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Content-Type': 'application/json',
  };

  try {
    const { imageBase64 } = await req.json().catch(() => ({} as any));
    
    if (!Deno.env.get('VISION_OCR_ENABLED') || Deno.env.get('VISION_OCR_ENABLED').toLowerCase() !== 'true') {
      return Response.json({ ok: false, reason: 'provider_disabled' }, { 
        status: 200, 
        headers: corsHeaders 
      });
    }
    
    if (!imageBase64) {
      return Response.json({ ok: false, reason: 'missing_image' }, { 
        status: 200, 
        headers: corsHeaders 
      });
    }

    // Strip data URL prefix if present
    const clean = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    const credentialsJSON = getCredJSON();
    
    if (!credentialsJSON) {
      return Response.json({ ok: false, reason: 'missing_credentials' }, { 
        status: 200, 
        headers: corsHeaders 
      });
    }

    const credentials = JSON.parse(credentialsJSON);

    // Use official Google Cloud Vision client
    const client = new vision.ImageAnnotatorClient({ credentials });
    const [result] = await client.textDetection({ image: { content: clean } });
    const text = result?.fullTextAnnotation?.text ?? result?.textAnnotations?.[0]?.description ?? "";

    const debug = (Deno.env.get("DEBUG_PERF") ?? "").toLowerCase() === "true";
    if (debug) console.log("[VISION][OCR] len:", text?.length ?? 0);

    if (!text?.trim()) {
      return Response.json({ ok: false, reason: 'no_text_detected' }, { 
        status: 200, 
        headers: corsHeaders 
      });
    }

    return Response.json({ ok: true, text }, { 
      status: 200, 
      headers: corsHeaders 
    });

  } catch (err) {
    console.error("[VISION][ERROR]", err?.message || err);
    return Response.json({ ok: false, reason: 'vision_exception', error: String(err) }, { 
      status: 200, 
      headers: corsHeaders 
    });
  }
});
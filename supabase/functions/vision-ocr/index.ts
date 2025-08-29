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
  const DEBUG = Deno.env.get('HEALTH_DEBUG_SAFE') === 'true';
  const cid = req.headers.get('x-cid') ?? crypto.randomUUID();
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cid',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
    });
  }

  function json(body: unknown, init: ResponseInit = {}) {
    const headers = new Headers(init.headers);
    headers.set('content-type','application/json');
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Headers', 'authorization, x-client-info, apikey, content-type, x-cid');
    return new Response(JSON.stringify(body), { ...init, headers });
  }

  try {
    const { imageBase64 } = await req.json().catch(() => ({} as any));
    
    if (!Deno.env.get('VISION_OCR_ENABLED') || Deno.env.get('VISION_OCR_ENABLED').toLowerCase() !== 'true') {
      return json({ ok: false, cid, reason: 'provider_disabled' }, { status: 200 });
    }
    
    if (!imageBase64) {
      return json({ ok: false, cid, reason: 'missing_image' }, { status: 200 });
    }

    // Strip data URL prefix if present
    const clean = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    const credentialsJSON = getCredJSON();
    
    if (!credentialsJSON) {
      return json({ ok: false, cid, reason: 'missing_credentials' }, { status: 200 });
    }

    const credentials = JSON.parse(credentialsJSON);

    // Use official Google Cloud Vision client
    const client = new vision.ImageAnnotatorClient({ credentials });
    const [result] = await client.textDetection({ image: { content: clean } });
    const text = result?.fullTextAnnotation?.text ?? result?.textAnnotations?.[0]?.description ?? "";

    if (DEBUG) console.log(`[VISION][OCR][${cid}] len:`, text?.length ?? 0);

    if (!text?.trim()) {
      return json({ ok: false, cid, reason: 'no_text_detected' }, { status: 200 });
    }

    const response: any = { ok: true, cid, text };
    
    // Add audit info if debug enabled (no PHI)
    if (DEBUG) {
      response.audit = {
        cid,
        textLen: text?.length ?? 0,
        timestamp: new Date().toISOString()
      };
    }

    return json(response, { status: 200 });

  } catch (err) {
    console.error(`[VISION][ERROR][${cid}]`, err?.message || err);
    return json({ ok: false, cid, reason: 'vision_exception', error: String(err) }, { status: 200 });
  }
});
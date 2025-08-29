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

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cid',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests immediately
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
  }

  // Handle ping endpoint for connectivity testing
  if (new URL(req.url).pathname.endsWith('/ping')) {
    return new Response(JSON.stringify({ 
      ok: true, 
      timestamp: new Date().toISOString(),
      service: 'vision-ocr' 
    }), { 
      status: 200, 
      headers: { ...cors, 'content-type': 'application/json' } 
    });
  }

  const DEBUG = Deno.env.get('HEALTH_DEBUG_SAFE') === 'true';
  const cid = req.headers.get('x-cid') ?? crypto.randomUUID();

  function json(body: unknown, init: ResponseInit = {}) {
    const headers = new Headers(init.headers);
    headers.set('content-type','application/json');
    Object.entries(cors).forEach(([k, v]) => headers.set(k, v));
    return new Response(JSON.stringify(body), { ...init, headers });
  }

  try {
    const contentType = req.headers.get('content-type') ?? '';
    let imageBase64 = '';

    // Handle multipart/form-data (preferred for reliability)
    if (contentType.includes('multipart/form-data')) {
      try {
        const formData = await req.formData();
        const file = formData.get('file') as File | null;
        
        if (file) {
          const arrayBuffer = await file.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);
          imageBase64 = btoa(String.fromCharCode(...uint8Array));
        }
      } catch (e) {
        if (DEBUG) console.log(`[VISION][FORM][${cid}] FormData parse error:`, e);
        return json({ ok: false, cid, reason: 'form_parse_error' }, { status: 400 });
      }
    } else {
      // Handle JSON body (legacy support)
      try {
        const body = await req.json();
        imageBase64 = body?.imageBase64 || '';
      } catch (e) {
        if (DEBUG) console.log(`[VISION][JSON][${cid}] JSON parse error:`, e);
        return json({ ok: false, cid, reason: 'json_parse_error' }, { status: 400 });
      }
    }
    
    if (!Deno.env.get('VISION_OCR_ENABLED') || Deno.env.get('VISION_OCR_ENABLED').toLowerCase() !== 'true') {
      return json({ ok: false, cid, reason: 'provider_disabled' }, { status: 200 });
    }
    
    if (!imageBase64) {
      return json({ ok: false, cid, reason: 'missing_image' }, { status: 400 });
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

    // Validate blob size for guards
    if (clean.length > 0) {
      const estimatedSize = (clean.length * 3) / 4; // base64 to bytes approximation
      if (DEBUG) console.log(`[VISION][BLOB_SIZE][${cid}] estimated bytes:`, estimatedSize);
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
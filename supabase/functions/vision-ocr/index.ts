import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { create } from "https://deno.land/x/djwt@v3.0.1/mod.ts";

// JSON response helper with proper headers
const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8' };

function json(data: unknown, init: number | ResponseInit = 200) {
  return new Response(JSON.stringify(data), {
    ...(typeof init === 'number' ? { status: init } : init),
    headers: JSON_HEADERS,
  });
}

// Get Google Cloud credentials (supports JSON string or file path)
function getCreds() {
  const raw = Deno.env.get('GOOGLE_APPLICATION_CREDENTIALS');
  if (!raw) return null;
  
  // Raw may be the JSON itself (secret) or a path to a file
  if (raw.trim().startsWith('{')) {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  
  try { 
    return JSON.parse(Deno.readTextFileSync(raw)); 
  } catch { 
    return null; 
  }
}

serve(async (req) => {
  try {
    const enabled = Deno.env.get('VISION_OCR_ENABLED') === 'true';
    if (!enabled) {
      return json({ ok: false, provider: 'vision', text: '', textLen: 0, reason: 'provider_disabled' });
    }

    const body = await req.json().catch(() => null);
    const b64 = body?.image as string | undefined;
    const mode = (Deno.env.get('VISION_OCR_MODE') || 'document').toUpperCase(); // 'DOCUMENT' | 'TEXT'

    if (!b64) {
      return json({ ok: false, provider: 'vision', text: '', textLen: 0, reason: 'missing_image' });
    }

    const creds = getCreds();
    if (!creds?.client_email || !creds?.private_key) {
      return json({ ok: false, provider: 'vision', text: '', textLen: 0, reason: 'missing_credentials' });
    }

    // ---- Get access token via JWT ----
    const now = Math.floor(Date.now() / 1000);
    const claim = {
      iss: creds.client_email,
      scope: 'https://www.googleapis.com/auth/cloud-platform',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now,
    };

    const jwt = await create({ alg: 'RS256', typ: 'JWT' }, claim, creds.private_key);

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    });

    const tokenJson = await tokenRes.json();
    const accessToken = tokenJson.access_token;
    if (!accessToken) {
      return json({ ok: false, provider: 'vision', text: '', textLen: 0, reason: 'token_error' });
    }

    // ---- Vision annotate ----
    const featureType = mode.startsWith('DOC') ? 'DOCUMENT_TEXT_DETECTION' : 'TEXT_DETECTION';
    const visionRes = await fetch('https://vision.googleapis.com/v1/images:annotate', {
      method: 'POST',
      headers: { 
        'authorization': `Bearer ${accessToken}`, 
        'content-type': 'application/json' 
      },
      body: JSON.stringify({
        requests: [{
          image: { content: b64.replace(/^data:image\/\w+;base64,/, '') },
          features: [{ type: featureType }],
          imageContext: {
            languageHints: ['en']
          }
        }]
      }),
    });

    if (!visionRes.ok) {
      const errorText = await visionRes.text().catch(() => '');
      console.error('[VISION-OCR] API Error:', visionRes.status, errorText);
      return json({ ok: false, provider: 'vision', text: '', textLen: 0, reason: 'vision_api_error' });
    }

    const visionJson = await visionRes.json().catch(() => null);
    if (!visionJson?.responses?.[0]) {
      return json({ ok: false, provider: 'vision', text: '', textLen: 0, reason: 'vision_no_response' });
    }

    const response = visionJson.responses[0];
    if (response.error) {
      console.error('[VISION-OCR] Vision Error:', response.error);
      return json({ ok: false, provider: 'vision', text: '', textLen: 0, reason: 'vision_error' });
    }

    const text = response?.fullTextAnnotation?.text
              ?? response?.textAnnotations?.[0]?.description
              ?? '';

    return json({
      ok: text.length > 0,
      provider: 'vision',
      text,
      textLen: text.length,
      reason: text.length ? undefined : 'no_text_detected',
      mode: mode.toLowerCase()
    });

  } catch (e) {
    console.error('[VISION-OCR] Server Error:', e);
    return json({ 
      ok: false, 
      provider: 'vision', 
      text: '', 
      textLen: 0, 
      reason: 'vision_api_error', 
      error: String(e?.message || e) 
    });
  }
});
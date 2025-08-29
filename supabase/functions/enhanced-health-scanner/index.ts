import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders } from '../_shared/cors.ts';

// Environment flags
const DEBUG = Deno.env.get('DEBUG_PERF') === 'true';
const OCR_ENABLED = Deno.env.get('VISION_OCR_ENABLED') === 'true';
const OCR_MODE = (Deno.env.get('VISION_OCR_MODE') || 'document').toLowerCase(); // 'document' | 'text'

// Helper for json response
function json200(obj: any) { 
  return new Response(JSON.stringify(obj), { 
    status: 200, 
    headers: { ...getCorsHeaders(), 'Content-Type': 'application/json' } 
  }); 
}

function json(status: number, data: any) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...getCorsHeaders(), 'Content-Type': 'application/json' },
  });
}

// Vision OCR Handler
async function handleOCR(body: any) {
  try {
    if (!OCR_ENABLED) {
      return json(200, { ok: false, provider: 'none', text: '', textLen: 0, reason: 'provider_disabled' });
    }

    const base64 = String(body?.image_base64 || '');
    if (!base64) {
      return json(400, { ok: false, provider: 'vision', text: '', textLen: 0, reason: 'missing_image' });
    }

    // Decode base64 to bytes for validation
    let buf: Uint8Array;
    try {
      const binaryString = atob(base64);
      buf = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        buf[i] = binaryString.charCodeAt(i);
      }
    } catch (e) {
      return json(400, { ok: false, provider: 'vision', text: '', textLen: 0, reason: 'bad_base64' });
    }

    if (buf.length === 0) {
      return json(400, { ok: false, provider: 'vision', text: '', textLen: 0, reason: 'empty_image' });
    }

    // Get Google Cloud credentials
    const credentials = Deno.env.get('GOOGLE_APPLICATION_CREDENTIALS');
    if (!credentials) {
      if (DEBUG) console.log('[EDGE][OCR][ERROR] Missing Google credentials');
      return json(500, { ok: false, provider: 'vision', text: '', textLen: 0, reason: 'missing_credentials' });
    }

    let serviceAccount;
    try {
      serviceAccount = JSON.parse(credentials);
    } catch (e) {
      if (DEBUG) console.log('[EDGE][OCR][ERROR] Invalid Google credentials JSON');
      return json(500, { ok: false, provider: 'vision', text: '', textLen: 0, reason: 'invalid_credentials' });
    }

    // Get OAuth2 access token
    const tokenResponse = await getAccessToken(serviceAccount);
    if (!tokenResponse.success) {
      if (DEBUG) console.log('[EDGE][OCR][ERROR] Auth failed:', tokenResponse.error);
      return json(500, { ok: false, provider: 'vision', text: '', textLen: 0, reason: 'auth_failed' });
    }

    // Prepare Vision API request
    const visionRequest = {
      requests: [{
        image: { content: base64 },
        features: [{
          type: OCR_MODE === 'document' ? 'DOCUMENT_TEXT_DETECTION' : 'TEXT_DETECTION',
          maxResults: 1
        }],
        imageContext: {
          languageHints: ['en']
        }
      }]
    };

    // Call Google Vision API
    const visionResponse = await fetch('https://vision.googleapis.com/v1/images:annotate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenResponse.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(visionRequest),
    });

    if (!visionResponse.ok) {
      if (DEBUG) console.log('[EDGE][OCR][ERROR] Vision API failed', visionResponse.status);
      const errorText = await visionResponse.text().catch(() => '');
      if (DEBUG) console.log('[EDGE][OCR][ERROR] Vision API response:', errorText);
      return json(500, { ok: false, provider: 'vision', text: '', textLen: 0, reason: 'vision_api_error' });
    }

    const visionResult = await visionResponse.json();
    const annotation = visionResult.responses?.[0];

    if (annotation?.error) {
      if (DEBUG) console.log('[EDGE][OCR][ERROR] Vision API error', annotation.error);
      return json(500, { ok: false, provider: 'vision', text: '', textLen: 0, reason: 'vision_error' });
    }

    // Extract text from response
    const text = OCR_MODE === 'document'
      ? annotation?.fullTextAnnotation?.text || ''
      : annotation?.textAnnotations?.[0]?.description || '';

    const out = {
      ok: !!text,
      provider: 'vision',
      text,
      textLen: text.length || 0,
      reason: text ? undefined : 'no_text_detected',
      mode: OCR_MODE,
    };

    if (DEBUG) {
      console.log('[EDGE][OCR]', {
        bytes: buf.length,
        ok: out.ok,
        textLen: out.textLen,
        snippet: text ? text.slice(0, 120) : '',
        mode: OCR_MODE,
      });
    }

    return json(200, out);
  } catch (err: any) {
    if (DEBUG) console.error('[EDGE][OCR][ERROR]', err?.message || err);
    return json(500, { ok: false, provider: 'vision', text: '', textLen: 0, reason: 'server_error' });
  }
}

// Get OAuth2 access token using service account
async function getAccessToken(serviceAccount: any): Promise<{ success: boolean; accessToken?: string; error?: string }> {
  try {
    // Create JWT payload
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: serviceAccount.client_email,
      scope: 'https://www.googleapis.com/auth/cloud-platform',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now,
    };

    // Create JWT header
    const header = { alg: 'RS256', typ: 'JWT' };

    // Encode header and payload
    const encodedHeader = btoa(JSON.stringify(header))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    const encodedPayload = btoa(JSON.stringify(payload))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

    const unsignedToken = `${encodedHeader}.${encodedPayload}`;

    // Import private key and sign
    const privateKeyPem = serviceAccount.private_key.replace(/\\n/g, '\n');
    
    // Convert PEM to raw format for crypto.subtle
    const pemMatch = privateKeyPem.match(/-----BEGIN PRIVATE KEY-----\s*([\s\S]+?)\s*-----END PRIVATE KEY-----/);
    if (!pemMatch) {
      return { success: false, error: 'Invalid private key format' };
    }

    const keyData = Uint8Array.from(atob(pemMatch[1].replace(/\s/g, '')), c => c.charCodeAt(0));

    // Import key
    const cryptoKey = await crypto.subtle.importKey(
      'pkcs8',
      keyData,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['sign']
    );

    // Sign the token
    const signature = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      cryptoKey,
      new TextEncoder().encode(unsignedToken)
    );

    // Encode signature
    const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

    const jwt = `${unsignedToken}.${encodedSignature}`;

    // Exchange JWT for access token
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `Token exchange failed: ${errorText}` };
    }

    const tokenData = await response.json();
    return { success: true, accessToken: tokenData.access_token };

  } catch (error) {
    return { success: false, error: error.message };
  }
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { mode, barcode, imageBase64, image_base64, source } = await req.json().catch(() => ({}));
    
    console.log('[ENHANCED-HEALTH-SCANNER]', { mode, hasBarcode: !!barcode, hasImage: !!(imageBase64 || image_base64), source });

    // Helper for score normalization
    const normalizeScore = (s: any): number => {
      const n = Number(s);
      if (!isFinite(n)) return 0;
      const v = n <= 1 ? n * 10 : n > 10 ? n / 10 : n;
      return Math.max(0, Math.min(10, v));
    };

    // Handle mode: "extract" with barcode - behave like barcode mode
    if (mode === 'extract' && barcode) {
      // Redirect to barcode mode for consistency
      const offUrl = `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`;
      let offResult = null;
      
      try {
        const response = await fetch(offUrl);
        offResult = await response.json();
      } catch (error) {
        console.log('[EDGE][EXTRACT→BARCODE][OFF_ERROR]', { barcode, error: error.message });
      }

      if (offResult?.status === 1 && offResult?.product) {
        const p = offResult.product ?? {};
        const to10 = (v: any) => {
          const n = Number(v);
          if (!isFinite(n)) return 0;
          if (n <= 1) return Math.max(0, Math.min(10, n * 10));
          if (n > 10) return Math.max(0, Math.min(10, n / 10));
          return Math.max(0, Math.min(10, n));
        };
        const normalizedScore = to10(p.nutriscore_score ?? 0);

        return json200({
          ok: true,
          fallback: false,
          mode: 'extract',
          barcode,
          product: {
            productName: p.product_name || p.generic_name || `Product ${barcode}`,
            ingredients_text: p.ingredients_text || '',
            nutriments: p.nutriments || {},
            health: { score: normalizedScore },
            brands: p.brands || '',
            image_url: p.image_front_url || p.image_url || '',
            code: barcode
          }
        });
      }

      return json200({
        ok: false, fallback: true, error: 'Product not found', barcode
      });
    }

    // Handle mode: "ocr" - Vision OCR
    if (mode === 'ocr') {
      return handleOCR({ image_base64: image_base64 || imageBase64 });
    }

    // Handle mode: "scan" - remove placeholder data
    if (mode === 'scan') {
      return json200({
        ok: false,
        fallback: true,
        mode: 'scan',
        error: 'Image analysis not implemented'
      });
    }

    // Handle mode: "barcode" - OFF lookup
    if (mode === 'barcode' && barcode) {
      const offUrl = `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`;
      let offResult = null;
      
      try {
        const response = await fetch(offUrl);
        offResult = await response.json();
      } catch (error) {
        console.log('[EDGE][BARCODE][OFF_ERROR]', { barcode, error: error.message });
      }

      if (offResult?.status === 1 && offResult?.product) {
        const p = offResult.product ?? {};
        const to10 = (v: any) => {
          const n = Number(v);
          if (!isFinite(n)) return 0;
          if (n <= 1) return Math.max(0, Math.min(10, n * 10));
          if (n > 10) return Math.max(0, Math.min(10, n / 10));
          return Math.max(0, Math.min(10, n));
        };
        const normalizedScore = to10(p.nutriscore_score ?? 0);

        console.log('[EDGE][BARCODE]', { hasNutriments: !!p.nutriments, score: normalizedScore });

        return json200({
          ok: true,
          fallback: false,
          mode: 'barcode',
          barcode,
          product: {
            productName: p.product_name || p.generic_name || `Product ${barcode}`,
            ingredients_text: p.ingredients_text || '',
            nutriments: p.nutriments || {},     // raw OFF object
            health: { score: normalizedScore }, // 0..10
            brands: p.brands || '',
            image_url: p.image_front_url || p.image_url || '',
            code: barcode
          }
        });
      }

      // OFF miss
      return json200({
        ok: false, fallback: true, error: 'Product not found', barcode
      });
    }

    // Default response for unknown modes - never return 4xx
    return json200({
      ok: false,
      error: 'Unknown mode or insufficient data',
      fallback: true
    });

  } catch (error) {
    console.error('[ENHANCED-HEALTH-SCANNER] Error:', error);
    return new Response(
      JSON.stringify({ 
        ok: false,
        error: error.message,
        product: null
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || '';

  console.log('[CORS][DEBUG]', { requestOrigin: origin, ts: new Date().toISOString() });

  const allowed = [
    'https://plate-path-plan.lovable.app',
    /^https:\/\/.*\.lovable\.dev$/,
    /^https:\/\/.*\.lovable\.app$/
  ];
  const isAllowed = allowed.some(a => typeof a === 'string' ? a === origin : a.test(origin));

  const cors = {
    'Access-Control-Allow-Origin': isAllowed ? origin : 'https://plate-path-plan.lovable.app',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-auth',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true'
  };

  console.log('[CORS][HEADERS]', { origin, isAllowed, returnedOrigin: cors['Access-Control-Allow-Origin'] });
  return cors;
}

serve(async (req) => {
  const cors = getCorsHeaders(req);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: cors });
  }

  try {
    const authHeader = req.headers.get('authorization');
    console.log('[AUTH][DEBUG]', {
      hasAuth: !!authHeader,
      authPreview: authHeader?.slice(0, 30),
      origin: req.headers.get('origin')
    });

    const { mode, barcode, imageBase64, source } = await req.json().catch(() => ({}));
    
    console.log('[ENHANCED-HEALTH-SCANNER]', { mode, hasBarcode: !!barcode, hasImage: !!imageBase64, source });

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

        return new Response(JSON.stringify({
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
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...cors }
        });
      }

      return new Response(JSON.stringify({
        ok: false, fallback: true, error: 'Product not found', barcode
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...cors }
      });
    }

    // Handle mode: "scan" - remove placeholder data
    if (mode === 'scan') {
      return new Response(JSON.stringify({
        ok: false,
        fallback: true,
        mode: 'scan',
        error: 'Image analysis not implemented'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...cors }
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

        return new Response(JSON.stringify({
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
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...cors }
        });
      }

      // OFF miss
      return new Response(JSON.stringify({
        ok: false, fallback: true, error: 'Product not found', barcode
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...cors }
      });
    }

    // Default response for unknown modes - never return 4xx
    return new Response(JSON.stringify({
      ok: false,
      error: 'Unknown mode or insufficient data',
      fallback: true
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...cors }
    });

  } catch (error: any) {
    console.error('[ENHANCED-HEALTH-SCANNER] Error:', error);
    return new Response(JSON.stringify({ 
      error: error?.message || 'unknown error',
      ok: false
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...cors }
    });
  }
});
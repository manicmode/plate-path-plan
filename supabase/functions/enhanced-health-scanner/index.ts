import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Enhanced CORS with expanded allowlist
const getCorsHeaders = (origin?: string | null): HeadersInit => {
  const allow = (() => {
    if (!origin) return 'https://plate-path-plan.lovable.app';
    try {
      const u = new URL(origin);
      const host = u.hostname;
      // Allow all Lovable domains and localhost
      if (host.endsWith('.lovable.dev') || 
          host.endsWith('.sandbox.lovable.dev') || 
          host.endsWith('.lovable.app')) return origin;
      if (origin === 'http://localhost:5173' || origin === 'http://localhost:5174') return origin;
    } catch {}
    return 'https://plate-path-plan.lovable.app';
  })();

  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
};

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { mode, barcode, imageBase64, source } = await req.json().catch(() => ({}));
    
    console.log('[ENHANCED-HEALTH-SCANNER]', { mode, hasBarcode: !!barcode, hasImage: !!imageBase64, source });

    // helper
    const normalizeScore = (s: any): number => {
      const n = Number(s);
      if (!isFinite(n)) return 0;
      const v = n <= 1 ? n * 10 : n > 10 ? n / 10 : n;
      return Math.max(0, Math.min(10, v));
    };

    if (mode === 'barcode' && barcode) {
      // OFF lookup
      const offUrl = `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`;
      let offResult = null;
      
      try {
        const response = await fetch(offUrl);
        offResult = await response.json();
      } catch (error) {
        console.log('[EDGE][BARCODE][OFF_ERROR]', { barcode, error: error.message });
      }

      if (offResult?.status === 1 && offResult?.product) {
        const p = offResult.product;
        const healthScore = normalizeScore(
          p.nutriscore_score ?? p.nutriscore_score_100 ?? 0
        );

        // Cache successful OFF responses for 24h
        const cacheKey = `off_${barcode}`;
        const cacheData = {
          barcode,
          product: p,
          healthScore,
          timestamp: Date.now()
        };
        
        // Store in a simple cache (in memory for this instance)
        // In production, you'd use a proper cache like Redis or Supabase storage
        
        const payload = {
          ok: true,
          fallback: false,
          mode: 'barcode',
          barcode,

          // NEW SHAPE (manual/speak parity)
          itemName: p.product_name || p.generic_name || `Product ${barcode}`,
          quality: { score: healthScore },
          nutrition: {
            calories:    p.nutriments?.['energy-kcal_100g'] ?? p.nutriments?.['energy_100g'] ?? 0,
            protein_g:   p.nutriments?.['proteins_100g'] ?? 0,
            carbs_g:     p.nutriments?.['carbohydrates_100g'] ?? 0,
            fat_g:       p.nutriments?.['fat_100g'] ?? 0,
            fiber_g:     p.nutriments?.['fiber_100g'] ?? 0,
            sugar_g:     p.nutriments?.['sugars_100g'] ?? 0,
            sodium_mg:   p.nutriments?.['sodium_100g'] ?? (p.nutriments?.['salt_100g'] ? p.nutriments['salt_100g'] * 400 : 0),
            'saturated-fat_100g': p.nutriments?.['saturated-fat_100g'] ?? 0,
          },
          ingredientsText: p.ingredients_text || '',

          // LEGACY MIRROR (adapter compatibility)
          product: {
            productName: p.product_name || p.generic_name || `Product ${barcode}`,
            product_name: p.product_name,
            generic_name: p.generic_name,
            brands: p.brands || '',
            image_url: p.image_url || p.image_front_url,
            ingredients_text: p.ingredients_text || '',
            nutriments: p.nutriments || {},
            health: { score: healthScore },
            barcode,
            code: barcode,
          },
        };

        console.log('[EDGE][BARCODE][OFF_HIT]', {
          barcode,
          hasName: !!payload.product.productName,
          hasNutriments: !!payload.product.nutriments && Object.keys(payload.product.nutriments).length > 0,
        });
        console.log('[EDGE][BARCODE][RESP_KEYS]', {
          top: Object.keys(payload),
          product: Object.keys(payload.product || {}),
        });

        return new Response(JSON.stringify(payload), {
          status: 200,
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=300' // 5-minute cache for successful barcode lookups
          },
        });
      }

      // OFF miss
      console.log('[EDGE][BARCODE][OFF_HIT]', { barcode, found: false });
      return new Response(JSON.stringify({
        ok: false, fallback: true, error: 'Product not found', barcode
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Non-barcode modes or extract with barcode
    if (mode === 'extract') {
      // ✅ NEW: If extract mode has a barcode, treat exactly as barcode mode
      if (barcode) {
        console.log('[EDGE][EXTRACT_WITH_BARCODE] Redirecting to barcode lookup', { barcode });
        // Recursively call the barcode lookup (same as mode: 'barcode')
        const offUrl = `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`;
        try {
          const response = await fetch(offUrl);
          const offResult = await response.json();
          
          if (offResult?.status === 1 && offResult?.product) {
            const p = offResult.product;
            const healthScore = normalizeScore(
              p.nutriscore_score ?? p.nutriscore_score_100 ?? 0
            );

            const payload = {
              ok: true,
              fallback: false,
              mode: 'extract_with_barcode',
              barcode,
              itemName: p.product_name || p.generic_name || `Product ${barcode}`,
              quality: { score: healthScore },
              nutrition: {
                calories:    p.nutriments?.['energy-kcal_100g'] ?? p.nutriments?.['energy_100g'] ?? 0,
                protein_g:   p.nutriments?.['proteins_100g'] ?? 0,
                carbs_g:     p.nutriments?.['carbohydrates_100g'] ?? 0,
                fat_g:       p.nutriments?.['fat_100g'] ?? 0,
                fiber_g:     p.nutriments?.['fiber_100g'] ?? 0,
                sugar_g:     p.nutriments?.['sugars_100g'] ?? 0,
                sodium_mg:   p.nutriments?.['sodium_100g'] ?? (p.nutriments?.['salt_100g'] ? p.nutriments['salt_100g'] * 400 : 0),
              },
              ingredientsText: p.ingredients_text || '',
              product: {
                productName: p.product_name || p.generic_name || `Product ${barcode}`,
                product_name: p.product_name,
                generic_name: p.generic_name,
                brands: p.brands || '',
                image_url: p.image_url || p.image_front_url,
                ingredients_text: p.ingredients_text || '',
                nutriments: p.nutriments || {},
                health: { score: healthScore },
                barcode,
                code: barcode,
              },
            };

            console.log('[EDGE][EXTRACT_BARCODE_SUCCESS]', { barcode });
            return new Response(JSON.stringify(payload), {
              status: 200,
              headers: { 
                ...corsHeaders, 
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=300'
              },
            });
          }
        } catch (error) {
          console.error('[EDGE][EXTRACT_BARCODE_ERROR]', { barcode, error: error.message });
        }
      }

      // No barcode: we no longer fabricate data.
      // Return a minimal "nothing to enrich" payload.
      console.log('[EDGE][EXTRACT_NO_BARCODE] No enrichment available');
      return new Response(JSON.stringify({ 
        ok: true,
        product: null, 
        source: 'none',
        fallback: true,
        reason: 'No barcode provided for enrichment'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ❌ REMOVED: All placeholder/sample data generation
    // Any remaining non-barcode modes return minimal response
    console.log('[EDGE][UNKNOWN_MODE]', { mode });
    return new Response(JSON.stringify({
      ok: false,
      error: 'Unknown mode or insufficient data',
      fallback: true
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
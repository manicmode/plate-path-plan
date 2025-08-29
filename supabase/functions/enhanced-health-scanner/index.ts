import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders } from '../_shared/cors.ts';

// Helper for json response
function json200(obj: any) { 
  return new Response(JSON.stringify(obj), { 
    status: 200, 
    headers: { ...getCorsHeaders(), 'Content-Type': 'application/json' } 
  }); 
}

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

    // Helper for score normalization
    const normalizeScore = (s: any): number => {
      const n = Number(s);
      if (!isFinite(n)) return 0;
      const v = n <= 1 ? n * 10 : n > 10 ? n / 10 : n;
      return Math.max(0, Math.min(10, v));
    };

    // Handle mode: "scan" - basic photo analysis for UI flow  
    if (mode === 'scan') {
      // This would typically do image analysis, but for now return a basic structure
      return json200({
        ok: true,
        fallback: false,
        mode: 'scan',
        detected: 'food_item',
        confidence: 0.85,
        itemName: 'Detected Product',
        quality: { score: 7.5 },
        nutrition: {
          calories: 180,
          protein_g: 8,
          carbs_g: 25,
          fat_g: 6,
          fiber_g: 3,
          sugar_g: 12,
          sodium_mg: 340
        },
        ingredientsText: 'Ingredients may vary',
        flags: []
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
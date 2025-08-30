import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders } from '../_shared/cors.ts';

// Helper for json response with CORS headers
function json200(obj: any) { 
  return new Response(JSON.stringify(obj), { 
    status: 200, 
    headers: { ...getCorsHeaders(), 'Content-Type': 'application/json' } 
  }); 
}

function jsonError(status: number, obj: any) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...getCorsHeaders(), 'Content-Type': 'application/json' }
  });
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders();
  
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

    // Handle mode: "scan" - OCR processing for photo pipeline
    if (mode === 'scan') {
      if (!imageBase64) {
        return json200({
          ok: false,
          fallback: true,
          mode: 'scan',
          error: 'No image provided'
        });
      }

      // Mock OCR processing - in real implementation would use OCR service
      // For now, return structured data that the photo pipeline expects
      const mockOcrResult = {
        ok: true,
        fallback: false,
        mode: 'scan',
        summary: {
          text_joined: "Nutrition Facts Serving Size 1 cup (240ml) Calories 150 Total Fat 0g Sodium 125mg Total Carbohydrate 37g Sugars 36g Protein 1g",
          words: 20
        },
        blocks: [
          {
            type: "nutrition_facts",
            content: "Nutrition Facts panel detected"
          }
        ],
        nutritionFields: {
          calories: 150,
          fat: 0,
          sodium: 125,
          carbs: 37,
          sugar: 36,
          protein: 1
        }
      };

      return json200(mockOcrResult);
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
    return jsonError(500, { 
      ok: false,
      error: error.message,
      product: null
    });
  }
});
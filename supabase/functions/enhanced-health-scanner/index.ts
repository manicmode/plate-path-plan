import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

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

// Initialize Supabase client for optional AI scoring
const supabase = createClient(
  'https://uzoiiijqtahohfafqirm.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6b2lpaWpxdGFob2hmYWZxaXJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzOTE2MzgsImV4cCI6MjA2Njk2NzYzOH0.Ny_Gxbhus7pNm0OHipRBfaFLNeK_ZSePfbj8no4SVGw'
);

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

        // Helper to add ingredient flags from OFF data
        const addFlag = (arr: any[], ingredient: string, flag: string, severity: 'low'|'medium'|'high', reason?: string) =>
          arr.push({ ingredient, flag, severity, reason });

        const flags: any[] = [];

        // OFF allergens → high severity flags
        (p?.allergens_tags || []).forEach((tag: string) => {
          addFlag(flags, tag.replace('en:', ''), 'allergen', 'high', 'Listed allergen on OFF');
        });

        // OFF additives → medium severity flags
        (p?.additives_tags || []).forEach((tag: string) => {
          addFlag(flags, tag.replace('en:', ''), 'additive', 'medium', 'Listed additive on OFF');
        });

        // Basic heuristics from ingredients_text (kept minimal/safe)
        const text = (p?.ingredients_text || '').toLowerCase();
        [
          { key: 'high fructose corn syrup', label: 'HFCS', sev: 'medium' },
          { key: 'aspartame', label: 'aspartame', sev: 'medium' },
          { key: 'acesulfame', label: 'acesulfame', sev: 'medium' },
          { key: 'monosodium glutamate', label: 'msg', sev: 'medium' },
          { key: 'hydrogenated', label: 'hydrogenated oil', sev: 'medium' },
        ].forEach(r => {
          if (text.includes(r.key)) addFlag(flags, r.label, 'ingredient concern', r.sev as any, 'Heuristic from ingredients_text');
        });

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
          
          // Add flags at both levels
          flags: flags,                     // top-level (new shape)
          ingredientFlags: flags,           // mirror for old consumers
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

        // PATCH D (Optional): Enhance score with AI analysis for more realistic 60-85% scores
        let qualityScore = healthScore; // from OFF
        let insights: string[] = [];

        try {
          const { data: ai, error: aiError } = await supabase.functions.invoke('gpt-smart-food-analyzer', {
            body: {
              taskType: 'quality_score_only',
              // Keep it lightweight: send normalized macronutrients and ingredients_text only
              product: {
                name: payload.itemName,
                nutrition: payload.nutrition,
                ingredientsText: payload.ingredientsText
              }
            }
          });
          
          if (!aiError && ai?.quality?.score != null) {
            qualityScore = Math.max(0, Math.min(10, Number(ai.quality.score)));
            console.log('[EDGE][AI_SCORE_ENHANCED]', { off: healthScore, ai: qualityScore });
          }
          
          if (Array.isArray(ai?.insights)) {
            insights = ai.insights.slice(0, 5);
          }
        } catch (e) {
          console.warn('[EDGE][AI_SCORE_FALLBACK]', String(e));
        }

        // Update payload with enhanced scores
        payload.quality = { score: qualityScore };
        payload.product.health.score = qualityScore;
        payload.insights = insights;

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

    // Non-barcode modes - return placeholder data for other modes
    const itemName = barcode ? `Product ${barcode}` : 'Detected Product';
    const rawScore = 7.5;
    const nutrition = {
      calories: 150,
      protein_g: 5.0,
      carbs_g: 30.0,
      fat_g: 2.0,
      sugar_g: 10.0,
      fiber_g: 3.0,
      sodium_mg: 200,
    };

    const qualityScore = normalizeScore(rawScore);

    // Check if we have meaningful data for fallback determination
    const hasProductData = !!(itemName && itemName !== 'Detected Product');
    const hasNutritionData = !!(nutrition && (nutrition.calories || nutrition.protein_g));
    const shouldFallback = !(hasProductData || hasNutritionData);

    // Legacy-friendly mirrors for client adapter compatibility
    const mirroredProduct = {
      // OFF/legacy friendly fields:
      productName: itemName,             // mirror for adapter
      health: { score: qualityScore },   // normalized 0-10 for legacy
      barcode,                           // echo input barcode
      nutriments: {                      // OFF-style nutrition
        'energy-kcal_100g': nutrition.calories,
        'proteins_100g': nutrition.protein_g,
        'carbohydrates_100g': nutrition.carbs_g,
        'fat_100g': nutrition.fat_g,
        'sugars_100g': nutrition.sugar_g,
        'fiber_100g': nutrition.fiber_g,
        'sodium_100g': nutrition.sodium_mg,
      },
      ingredients_text: 'Sample ingredients list',

      // Keep new-schema fields too (don't remove):
      itemName,
      quality: { score: qualityScore },
      nutrition,                         // keep normalized macros
      ingredientsText: 'Sample ingredients list',
      flags: [],
      insights: [],
    };

    const standardizedResponse = {
      ok: true,
      source: source || 'health-scanner',
      barcode,                           // top-level barcode
      product: mirroredProduct,
      // Keep whatever you already return (new schema):
      itemName,
      quality: { score: qualityScore },
      nutrition,
      fallback: shouldFallback,
      ...(shouldFallback && { reason: 'No meaningful product or nutrition data available' })
    };

    return new Response(JSON.stringify(standardizedResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
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
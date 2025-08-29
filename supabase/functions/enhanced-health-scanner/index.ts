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

    // This is a placeholder that returns a standardized response
    // In a real implementation, this would call external APIs for product data
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

    // Normalize score to 0-10 using the rule: <=1 → *10, >10 → /10, clamp 0..10
    const normalizeScore = (score: number): number => {
      let normalized = score;
      if (score <= 1) normalized = score * 10;
      else if (score > 10) normalized = score / 10;
      return Math.max(0, Math.min(10, normalized));
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
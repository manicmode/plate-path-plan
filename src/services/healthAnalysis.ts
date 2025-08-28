import { supabase } from '@/integrations/supabase/client';
import type { ScanSource, NormalizedProduct, HealthAnalysis } from '@/types/health';

// Only send what the Edge function actually needs
function stripForAnalyze(p: NormalizedProduct) {
  return {
    id: p.id ?? null,
    barcode: p.barcode ?? null,
    name: p.name,
    brand: p.brand ?? null,
    imageUrl: p.imageUrl ?? null,
    nutriments: p.nutriments ?? null,
    ingredients: p.ingredients ?? null,
    novaGroup: p.novaGroup ?? null,
    serving: p.serving ?? null,
  };
}

// Convert product to text description that Edge Function expects
function productToText(product: NormalizedProduct): string {
  const parts = [];
  
  if (product.brand) parts.push(`${product.brand}`);
  parts.push(product.name);
  
  const nutriments = product.nutriments;
  if (nutriments?.energy_kcal) parts.push(`${nutriments.energy_kcal} calories`);
  if (nutriments?.proteins) parts.push(`${nutriments.proteins}g protein`);
  if (nutriments?.carbohydrates) parts.push(`${nutriments.carbohydrates}g carbs`);
  if (nutriments?.fat) parts.push(`${nutriments.fat}g fat`);
  
  if (product.serving) parts.push(`serving size: ${product.serving}`);
  
  return parts.join(', ');
}

export async function analyzeFromProduct(
  product: NormalizedProduct,
  opts?: { source?: ScanSource }
): Promise<HealthAnalysis> {
  const source = opts?.source ?? 'manual';
  
  // 1) Guarantee Authorization header (401s often happen only on one path)
  const { data: sessionData } = await supabase.auth.getSession();
  const access_token = sessionData?.session?.access_token ?? null;

  // 2) Convert product to text format that Edge Function expects
  const productText = productToText(product);
  const body = {
    text: productText,
    complexity: 'auto'
  };

  if (import.meta.env.DEV) {
    console.log(`[ANALYZE] payload source=${source}`, JSON.stringify(body, null, 2));
    console.log(`[ANALYZE] normalized product:`, JSON.stringify(stripForAnalyze(product), null, 2));
  }

  // 3) Invoke with strong error surface + one 401 refresh retry
  const invoke = async (token?: string | null) => {
    return supabase.functions.invoke('gpt-smart-food-analyzer', {
      body,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
  };

  let { data, error } = await invoke(access_token);

  if (error?.context?.status === 401) {
    // refresh once and retry
    console.log('[ANALYZE] 401 detected, refreshing session and retrying...');
    await supabase.auth.refreshSession();
    const { data: s2 } = await supabase.auth.getSession();
    ({ data, error } = await invoke(s2?.session?.access_token ?? null));
  }

  if (error) {
    // Make the toast useful and dev logs detailed
    const status = error.context?.status ?? 'unknown';
    const msg = error.message ?? 'Edge Function returned a non-2xx status code';
    if (import.meta.env.DEV) {
      console.error('[ANALYZE] invoke error', { status, msg, body, error });
    }
    // surface readable error to UI
    throw new Error(`Analyze failed (${status}): ${msg}`);
  }

  if (import.meta.env.DEV) {
    console.log('[ANALYZE] success:', data);
  }

  // Transform Edge Function response to HealthAnalysis format
  const transformResponse = (edgeResponse: any, originalProduct: NormalizedProduct): HealthAnalysis => {
    const food = edgeResponse.foods?.[0] || {};
    
    return {
      itemName: food.name || originalProduct.name,
      productName: originalProduct.name,
      healthScore: Math.round((edgeResponse.total_confidence || 0.8) * 100),
      ingredientsText: originalProduct.ingredients ? JSON.stringify(originalProduct.ingredients) : undefined,
      ingredientFlags: [], // Edge function doesn't return ingredient flags yet
      nutritionData: {
        calories: food.calories || originalProduct.nutriments?.energy_kcal,
        protein: food.protein || originalProduct.nutriments?.proteins,
        carbs: food.carbs || originalProduct.nutriments?.carbohydrates,
        fat: food.fat || originalProduct.nutriments?.fat,
        fiber: food.fiber || originalProduct.nutriments?.fiber,
        sugar: food.sugar || originalProduct.nutriments?.sugars,
        sodium: food.sodium || originalProduct.nutriments?.sodium,
        saturated_fat: originalProduct.nutriments?.saturated_fat,
      },
      analysis: {
        summary: edgeResponse.processing_notes || 'AI analysis completed',
        positives: food.confidence > 0.8 ? ['High confidence analysis'] : [],
        concerns: food.confidence < 0.6 ? ['Low confidence in nutritional data'] : [],
        recommendations: ['Verify nutritional information for accuracy'],
      },
      source,
      confidence: edgeResponse.total_confidence || 0.8,
    };
  };

  // Expect the function to return a HealthAnalysis shape
  return transformResponse(data, product);
}
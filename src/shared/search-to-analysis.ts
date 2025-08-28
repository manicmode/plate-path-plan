/**
 * Unified search result to health analysis handler
 * Ensures voice and manual search selections use identical analysis pipeline
 */

import { supabase } from '@/integrations/supabase/client';
import { isFeatureEnabled } from '@/lib/featureFlags';

export type SearchSource = 'manual' | 'voice';

export interface NormalizedProduct {
  id?: string | null;
  barcode?: string | null;
  name: string;
  brand?: string | null;
  imageUrl?: string | null;
  nutriments?: {
    energy_kcal?: number | null;
    proteins?: number | null;
    carbohydrates?: number | null;
    fat?: number | null;
    fiber?: number | null;
    sugars?: number | null;
    sodium?: number | null;
    saturated_fat?: number | null;
  };
  ingredients?: any;
  novaGroup?: number | null;
  serving?: string | null;
}

/**
 * Normalize any search result item to canonical product format
 * Maps every possible shape to the format expected by the analyzer
 */
export function normalizeSearchItem(item: any): NormalizedProduct {
  return {
    id: item.id ?? item.productId ?? null,
    barcode: item.barcode ?? item.code ?? null,
    name: item.name ?? item.product_name ?? item.title ?? item.displayName ?? item.productName ?? 'Unknown Product',
    brand: item.brand ?? item.brands ?? item.manufacturer ?? null,
    imageUrl: item.image_url ?? item.imageUrl ?? item.front_image_url ?? null,
    nutriments: {
      // Prefer serving values, fallback to per 100g to match manual flow
      energy_kcal: item.calories ?? item.nutriments?.energy_kcal ?? item.nutriments?.energy_kcal_100g ?? item.nutrition?.calories,
      proteins: item.protein ?? item.nutriments?.proteins ?? item.nutriments?.proteins_100g,
      carbohydrates: item.carbs ?? item.nutriments?.carbohydrates ?? item.nutriments?.carbohydrates_100g,
      fat: item.fat ?? item.nutriments?.fat ?? item.nutriments?.fat_100g,
      fiber: item.fiber ?? item.nutriments?.fiber ?? item.nutriments?.fiber_100g,
      sugars: item.sugar ?? item.nutriments?.sugars ?? item.nutriments?.sugars_100g,
      sodium: item.sodium ?? item.nutriments?.sodium ?? 
        (item.nutriments?.salt_100g ? item.nutriments.salt_100g * 400 : null),
      saturated_fat: item.saturated_fat ?? item.nutriments?.saturated_fat ?? item.nutriments?.saturated_fat_100g,
    },
    ingredients: item.ingredients ?? item.ingredient_analysis ?? null,
    novaGroup: item.nova_group ?? item.novaGroup ?? null,
    serving: item.serving_size ?? item.serving ?? item.servingHint ?? null,
  };
}

/**
 * DEV-only diagnostics logger
 */
const logDev = (tag: string, obj: any) => { 
  if (import.meta.env.DEV) console.log(tag, obj); 
};

/**
 * Strip product to essential fields for analysis
 */
const stripForAnalyze = (p: any) => ({
  id: p.id ?? null,
  barcode: p.barcode ?? null,
  name: p.name ?? '',
  brand: p.brand ?? null,
  imageUrl: p.imageUrl ?? null,
  nutriments: p.nutriments ?? null,
  ingredients: p.ingredients ?? null,
  novaGroup: p.novaGroup ?? null,
  serving: p.serving ?? null,
});

/**
 * Convert product object to text description for voice analysis
 */
const productToText = (p: any) => {
  const n = p.nutriments ?? {};
  return [
    `Analyze this product: ${p.name}${p.brand ? ` by ${p.brand}` : ''}.`,
    p.serving ? `Serving: ${p.serving}.` : '',
    'Nutrition:',
    n.energy_kcal != null ? `${n.energy_kcal} kcal` : '',
    n.proteins != null ? `, ${n.proteins} g protein` : '',
    n.carbohydrates != null ? `, ${n.carbohydrates} g carbs` : '',
    n.fat != null ? `, ${n.fat} g fat` : '',
    n.fiber != null ? `, ${n.fiber} g fiber` : '',
    n.sugars != null ? `, ${n.sugars} g sugars` : '',
    n.sodium != null ? `, ${n.sodium} mg sodium` : '',
    n.saturated_fat != null ? `, ${n.saturated_fat} g saturated fat` : '',
    p.ingredients ? `. Ingredients: ${String(p.ingredients).slice(0,400)}.` : ''
  ].join('').replace('Nutrition:,', 'Nutrition:').trim();
};

/**
 * Call gpt-smart-food-analyzer with text format for both manual and voice selections
 */
export async function analyzeFromProduct(product: NormalizedProduct, options: { source?: SearchSource } = {}) {
  const source = options.source || 'manual';
  const stripped = stripForAnalyze(product);
  
  // Guard: require product name and nutrition data
  if (!stripped.name || !stripped.nutriments) {
    throw new Error('Missing product details for analysis');
  }
  
  // Convert product to text format for analysis
  const text = productToText(stripped);
  const body = { text, taskType: 'food_analysis', complexity: 'auto', meta: { source } };

  // DEV diagnostics: log request
  if (import.meta.env.DEV) console.log('[ANALYZE][REQ]', { source, body });
  
  const { data, error } = await supabase.functions.invoke('gpt-smart-food-analyzer', { body });
  
  if (error) {
    if (import.meta.env.DEV) console.error('[ANALYZE][RES]', { source, status: error.context?.status, error });
    
    // Fallback: retry once with minimal text (name only) if 400
    if (error.context?.status === 400) {
      const minimal = { text: `Analyze this product: ${stripped.name}.`, taskType: 'food_analysis', complexity: 'auto', meta: { source } };
      if (import.meta.env.DEV) console.log('[ANALYZE][RETRY]', minimal);
      const retryResult = await supabase.functions.invoke('gpt-smart-food-analyzer', { body: minimal });
      if (retryResult.error) throw new Error(`Analyze failed (${retryResult.error.context?.status ?? '400'})`);
      return retryResult.data;
    }
    throw new Error(`Analyze failed (${error.context?.status ?? '???'})`);
  }
  
  if (import.meta.env.DEV) console.log('[ANALYZE][RES]', { source, status: 200 });
  return data;
}

/**
 * Unified handler for search result selection
 * Both manual and voice search should call this with identical parameters
 */
export async function handleSearchPick({
  item,
  source,
  setAnalysisData,
  setStep,
  onError,
}: {
  item: any;
  source: SearchSource;
  setAnalysisData: (data: any) => void;
  setStep: (step: string) => void;
  onError?: (error: any) => void;
}) {
  try {
    const product = normalizeSearchItem(item);
    console.log(`[SEARCH→ANALYSIS] ${source} selection:`, product.name);

    // IMPORTANT: Call the SAME analyzer used by manual entry
    const analysis = await analyzeFromProduct(product, { source });

    // Transform analysis to Health Analysis result format
    const analysisResult = {
      product: {
        productName: product.name,
        barcode: product.barcode,
        brand: product.brand,
        imageUrl: product.imageUrl,
        nutrition: {
          calories: product.nutriments?.energy_kcal || 0,
          protein: product.nutriments?.proteins || 0,
          carbs: product.nutriments?.carbohydrates || 0,
          fat: product.nutriments?.fat || 0,
          fiber: product.nutriments?.fiber || 0,
          sugar: product.nutriments?.sugars || 0,
          sodium: product.nutriments?.sodium || 0,
          saturated_fat: product.nutriments?.saturated_fat || 0,
        }
      },
      analysis: analysis,
      source: source,
      confidence: item.confidence || 0.8
    };

    console.log(`[SEARCH→ANALYSIS] ${source} analysis complete:`, analysisResult);
    setAnalysisData(analysisResult);
    setStep('report');
  } catch (error) {
    console.error(`[SEARCH→ANALYSIS] ${source} error:`, error);
    onError?.(error);
  }
}
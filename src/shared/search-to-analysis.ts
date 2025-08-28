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
  const text = [
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
  
  console.log('[ANALYZER][TEXT_BUILT]', { text });
  return text;
};

/**
 * Call the same health analysis pipeline that manual entry uses
 */
export async function analyzeFromProduct(product: NormalizedProduct, options: { source?: SearchSource } = {}) {
  const source = options.source || 'manual';
  const stripped = stripForAnalyze(product);
  
  // Guard: require product name and nutrition data
  if (!stripped.name || !stripped.nutriments) {
    throw new Error('Could not analyze selection: missing product details');
  }
  
  // Convert product to text format for analysis (unified approach)
  const text = productToText(stripped);
  console.log('[ANALYZER][TEXT]', text);
  console.log('[SELECTION][PRODUCT_KEYS]', Object.keys(product||{}));
  const body = { text, taskType: 'food_analysis', complexity: 'auto' };

  // PARITY logging: before invoke
  console.log('[PARITY][REQ]', { source, hasText: !!body.text });
  console.log('[EDGE][gpt-smart-food-analyzer][BODY]', { taskType: body?.taskType, textLen: body?.text?.length });
  
  const { data, error } = await supabase.functions.invoke('gpt-smart-food-analyzer', {
    body
  });
  
  // PROBE: Log raw analyzer response
  console.log('[ANALYZER][RAW]', { keys: Object.keys(data||{}), sample: { itemName: data?.itemName, productName: data?.productName, quality: data?.quality, nutrition: data?.nutrition, report: data?.report ? Object.keys(data.report) : null }});
  
  // PARITY logging: after invoke
  console.log('[PARITY][RES]', { source, status: error?.context?.status ?? 200 });
  
  if (error) {
    throw new Error(error.message || 'Failed to analyze product');
  }
  
  return data;
}

/**
 * Coerce score to 0-10 range (divide by 10 if >10, clamp 0-10)
 */
function coerceScoreTo10(rawScore: any): number {
  const n = Number(rawScore);
  if (!Number.isFinite(n)) return 0;
  const s = n > 10 ? n / 10 : n;     // handle 0–100 inputs
  return Math.max(0, Math.min(10, s)); // clamp
}

/**
 * Map raw analyzer data to core fields with robust extraction
 */
function mapAnalyzerToCore(data: any, fallbackName?: string) {
  const itemName = 
    data?.itemName ||
    data?.productName ||
    data?.title ||
    data?.name ||
    data?.report?.itemName ||
    data?.report?.product?.name ||
    fallbackName ||
    'Unknown Product';

  const rawScore = 
    data?.healthScore ||
    data?.quality?.score ||
    data?.score ||
    data?.report?.quality?.score;

  const healthScore = coerceScoreTo10(rawScore);

  return {
    ...data,
    itemName,
    healthScore
  };
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
  console.log('[SEARCH→ANALYSIS]', { source });
  
  try {
    // Set loading state
    setStep('loading');
    
    const product = normalizeSearchItem(item);

    // Use unified analysis - always text-based, no mode: 'product'
    const analysis = await analyzeFromProduct(product, { source });

    // Apply robust mapping to normalize analyzer response
    const mappedAnalysis = mapAnalyzerToCore(analysis, product.name);
    
    // PROOF: Log mapped result
    console.log('[MAPPED][REPORT]', { 
      itemName: mappedAnalysis.itemName, 
      healthScore10: mappedAnalysis.healthScore 
    });
    console.log('[REPORT][FEED]', { itemName: mappedAnalysis?.itemName, healthScore: mappedAnalysis?.healthScore, hasNutrition: !!product.nutriments, hasIngredients: !!product.ingredients });

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
      analysis: mappedAnalysis,
      source: source,
      confidence: item.confidence || 0.8
    };

    setAnalysisData(analysisResult);
    setStep('report');
  } catch (error) {
    console.error(`[SEARCH→ANALYSIS][${source.toUpperCase()}] Failed:`, error);
    onError?.(error);
    setStep('fallback');
  }
}
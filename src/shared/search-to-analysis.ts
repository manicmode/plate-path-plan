/**
 * Unified search result to health analysis handler
 * Ensures voice and manual search selections use identical analysis pipeline
 */

import { supabase } from '@/integrations/supabase/client';
import { isFeatureEnabled } from '@/lib/featureFlags';

const DEBUG = import.meta.env.DEV || import.meta.env.VITE_DEBUG_PERF === 'true';

const norm = (s?: string) =>
  (s || '').toLowerCase().trim().replace(/\s+/g, ' ');

export const pickBrand = (p: any) =>
  p.brand || p.brands || p.manufacturer || p.store || p.retailer || '';

export const pickName = (p: any) =>
  p.product_name || p.generic_name || p.name || p.title || p.label || '';

export const displayNameFor = (p: any) => {
  const brand = pickBrand(p);
  const name  = pickName(p);
  if (brand && name) return `${brand} ${name}`;
  return name || brand || 'Unknown Product';
};

const isGeneric = (analyzerName: string, brand: string) => {
  const a = norm(analyzerName);
  const b = norm(brand);
  return !a || a === b || a.length < 4;
};

/**
 * Robust numeric parser for analyzer responses
 * Handles strings with units, fractions, and percentages
 */
export const num = (v: any): number | null => {
  if (v == null) return null;
  if (typeof v === 'number' && isFinite(v)) return v;
  if (typeof v !== 'string') return null;
  const s = v.trim().toLowerCase();

  // common forms: "8", "8.5", "8/10", "80%", "134 kcal", "12 g", "500 mg"
  // normalize fraction "8/10"
  const frac = s.match(/^(\d+(\.\d+)?)\s*\/\s*(\d+(\.\d+)?)/);
  if (frac) {
    const a = parseFloat(frac[1]); const b = parseFloat(frac[3]);
    if (b > 0) return (a / b) * 10; // convert to 0–10 scale if someone writes "8/10"
  }

  // percentage "80%"
  const pct = s.match(/^(\d+(\.\d+)?)\s*%$/);
  if (pct) return parseFloat(pct[1]) / 10; // 80% -> 8

  // strip units like "kcal", "g", "mg", "grams", etc.
  const unit = s.replace(/[,]/g,'').replace(/(kcal|cal|grams|gram|g|mg|mcg|µg|ml|mL|l|kg|kJ)\b/g,'').trim();
  const f = parseFloat(unit);
  return isFinite(f) ? f : null;
};

/**
 * Convert any numeric/string input to 0–10 health score scale
 */
export const score10 = (v: any): number => {
  const n = num(v);
  if (n == null) return 0;
  // if someone supplied a 0–100 number (e.g., 80) treat as 0–100 -> 0–10
  const normalized = n > 10 ? n / 10 : n;
  return Math.max(0, Math.min(10, normalized));
};

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
  if (DEBUG) {
    console.log('[ANALYZER][TEXT]', text);
    console.log('[SELECTION][PRODUCT_KEYS]', Object.keys(product||{}));
  }
  const body = { text, taskType: 'food_analysis', complexity: 'auto' };

    // PARITY logging: before invoke
    if (DEBUG) {
      console.log('[PARITY][REQ]', { source, hasText: !!body.text });
      console.log('[EDGE][gpt-smart-food-analyzer][BODY]', { taskType: body?.taskType, textLen: body?.text?.length });
    }
  
  const { data, error } = await supabase.functions.invoke('gpt-smart-food-analyzer', {
    body
  });
  
  // PROBE: Log raw analyzer response (debug only)
  if (DEBUG) {
    console.log('[ANALYZER][RAW]', { keys: Object.keys(data||{}), sample: { itemName: data?.itemName, productName: data?.productName } });
    console.log('[PARITY][RES]', { source, status: error?.context?.status ?? 200 });
  }
  
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

type MacroPack = {
  calories?: number; protein_g?: number; carbs_g?: number; fat_g?: number;
  sugar_g?: number; sodium_mg?: number; fiber_g?: number; satfat_g?: number;
  ingredientsText?: string;
};

const extractMacrosAndIngredients = (product: any): MacroPack => {
  const p = product || {};
  const n = p.nutriments || p.nutrition || p.nutrients || {};

  // OFF style keys + common fallbacks
  const kcal = n['energy-kcal_100g'] ?? n.kcal ?? n.calories ?? n.energy_kcal;
  const protein = n['proteins_100g'] ?? n.protein_g ?? n.protein;
  const carbs   = n['carbohydrates_100g'] ?? n.carbs_g ?? n.carbs;
  const fat     = n['fat_100g'] ?? n.fat_g ?? n.fat;
  const sugar   = n['sugars_100g'] ?? n.sugar_g ?? n.sugars ?? n.sugar;
  const sodium  = n['sodium_100g'] ?? n.sodium_mg ?? n.sodium; // mg preferred
  const fiber   = n['fiber_100g'] ?? n.fiber_g ?? n.fiber;
  const satfat  = n['saturated-fat_100g'] ?? n.satfat_g ?? n.saturated_fat;

  const ing =
    p.ingredients_text ??
    (Array.isArray(p.ingredients) ? p.ingredients.map((i:any)=>i.text||i).join(', ') : undefined) ??
    p.ingredientsList ??
    p.ingredients;

  return {
    calories: kcal, protein_g: protein, carbs_g: carbs, fat_g: fat,
    sugar_g: sugar, sodium_mg: sodium, fiber_g: fiber, satfat_g: satfat,
    ingredientsText: ing
  };
};

/**
 * Enrich product data by calling OFF if barcode exists
 * NEVER inject placeholder data - only real OFF data or skip enrichment
 */
export const enrichViaExtractIfNeeded = async (product: any) => {
  // Helper checks
  const hasBarcode =
    !!product?.barcode ||
    !!product?.code ||
    !!product?.ean ||
    !!product?.ean13;

  const hasMacros =
    !!product?.nutriments &&
    (product?.nutriments?.energy_kcal != null ||
      product?.nutriments?.['energy-kcal_100g'] != null ||
      product?.nutriments?.protein_100g != null ||
      product?.nutriments?.fat_100g != null ||
      product?.nutriments?.carbohydrates_100g != null);

  // If we already have reasonable macros, skip enrichment
  if (hasMacros) return product;

  // If barcode present, call enhanced-health-scanner with barcode mode
  if (hasBarcode) {
    try {
      const barcode =
        product?.barcode ?? product?.code ?? product?.ean ?? product?.ean13;

      const { data, error }: any = await supabase.functions.invoke(
        'enhanced-health-scanner',
        { body: { mode: 'barcode', barcode } }
      );

      if (error || !data) {
        if (DEBUG) console.warn('[ENRICH][OFF_LOOKUP_FAILED]', barcode, error?.message);
        return { ...product, _dataSource: 'manual/failed_barcode' };
      }

      // Minimal sanity: require nutriments or ingredients before merging
      const enriched = data?.product;
      const valid =
        enriched &&
        enriched.nutriments &&
        (enriched.nutriments.energy_kcal != null ||
          enriched.nutriments['energy-kcal_100g'] != null ||
          enriched.nutriments.protein_100g != null);

      if (valid) {
        if (DEBUG) console.log('[ENRICH][OFF_HIT]', { barcode, hasNutriments: !!enriched.nutriments });
        
        // Debug performance logging under flag
        if (import.meta.env.VITE_DEBUG_PERF === 'true') {
          const fingerprint = `${enriched.productName || 'NA'}|kcal:${enriched.nutriments?.['energy-kcal_100g'] || 'NA'}|p:${enriched.nutriments?.proteins_100g || 'NA'}|c:${enriched.nutriments?.carbohydrates_100g || 'NA'}|f:${enriched.nutriments?.fat_100g || 'NA'}`;
          console.log('[ENRICH][FINGERPRINT]', fingerprint);
        }
        
        return {
          ...product,
          ...enriched,
          // Preserve local name if ours is better
          productName: product?.productName || enriched?.productName,
          _dataSource: 'openfoodfacts/barcode',
        };
      }

      // If OFF returned nothing useful, just return original
      if (DEBUG) console.warn('[ENRICH][OFF_INVALID]', { barcode, hasEnriched: !!enriched });
      return { ...product, _dataSource: 'manual/invalid_off' };
    } catch (e) {
      const barcodeStr = product?.barcode ?? product?.code ?? product?.ean ?? product?.ean13;
      if (DEBUG) console.error('[ENRICH][EXCEPTION]', barcodeStr, e);
      return { ...product, _dataSource: 'manual/exception' };
    }
  }

  // No barcode: return original product with no enrichment call
  return {
    ...product,
    _dataSource: 'manual/no_barcode',
  };
};

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

    // Build enriched analyzer text with brand + name + ingredients + macros
    const brand = pickBrand(product);
    const pickedName = displayNameFor(product); // what the user tapped
    const selectionId = `${norm(brand)}|${norm(pickName(product))}|${product?.barcode||''}`;

    // Fingerprint for debugging identical results (DEBUG only)
    function fp(obj: any) {
      try {
        const name = obj?.productName || obj?.name || obj?.title || 'NA';
        const n = obj?.nutriments || {};
        const kcal =
          n.energy_kcal ??
          n['energy-kcal_100g'] ??
          n['energy-kcal_serving'] ??
          'NA';
        const prot = n.protein_100g ?? 'NA';
        const flagsCount = Array.isArray(obj?.flags) ? obj.flags.length : 0;
        return `${name}|kcal:${kcal}|p:${prot}|flags:${flagsCount}`;
      } catch {
        return 'fp-error';
      }
    }

    // Enrich with detailed nutrition/ingredients if needed
    const enriched = await enrichViaExtractIfNeeded(product);
    
    if (DEBUG) {
      console.info('[HEALTH_ANALYZE][INPUT_FP]', fp(enriched));
      console.info('[HEALTH_ANALYZE][DATA_SOURCE]', enriched._dataSource);
    }

    // Extract macros from enriched product (OFF style or direct)
    const macros = extractMacrosAndIngredients(enriched);
    
    const parts: string[] = [];
    parts.push(`Analyze this product: ${pickedName}.`);

    if (macros.ingredientsText) {
      parts.push(`Ingredients: ${macros.ingredientsText}.`);
    }

    const macrosList: string[] = [];
    if (macros.calories != null) macrosList.push(`${macros.calories} kcal`);
    if (macros.protein_g != null) macrosList.push(`${macros.protein_g} g protein`);
    if (macros.carbs_g  != null) macrosList.push(`${macros.carbs_g} g carbs`);
    if (macros.fat_g    != null) macrosList.push(`${macros.fat_g} g fat`);
    if (macros.sugar_g  != null) macrosList.push(`${macros.sugar_g} g sugar`);
    if (macros.sodium_mg!= null) macrosList.push(`${macros.sodium_mg} mg sodium`);
    if (macros.fiber_g  != null) macrosList.push(`${macros.fiber_g} g fiber`);
    if (macros.satfat_g != null) macrosList.push(`${macros.satfat_g} g saturated fat`);

    if (macrosList.length) parts.push(`Nutrition (per serving or 100g): ${macrosList.join(', ')}.`);

    const text = parts.join(' ');
    if (DEBUG) console.log('[ANALYZER][TEXT]', { len: text?.length, preview: text?.slice(0,160), selectionId });

    // Call analyzer with enriched text and canonical identity
    const body = {
      taskType: 'full_report',
      text,                       // existing rich text you already build
      hintName: pickedName,       // NEW
      hintBrand: brand,           // NEW
      selectionId,                // NEW
    };
    
    // PARITY logging: before invoke
    console.log('[PARITY][REQ]', { source, hasText: !!body.text });
    console.log('[EDGE][gpt-smart-food-analyzer][BODY]', { taskType: body?.taskType, textLen: body?.text?.length });
    
    const { data, error } = await supabase.functions.invoke('gpt-smart-food-analyzer', {
      body
    });
    
    if (DEBUG) console.log('[ANALYZER][RAW_JSON]', JSON.stringify(data)?.slice(0, 2000));

    let analyzerData = data || {};
    if (analyzerData?.foods) {
      if (Array.isArray(analyzerData.foods) && analyzerData.foods.length > 0) {
        console.log('[ANALYZER][FOODS] using foods[0] keys=', Object.keys(analyzerData.foods[0]||{}));
        analyzerData = analyzerData.foods[0];
      } else {
        console.warn('[ANALYZER][FOODS] empty/invalid foods array');
      }
    }

    // PARITY logging: after invoke
    console.log('[PARITY][RES]', { source, status: error?.context?.status ?? 200 });
    
    if (error) {
      throw new Error(error.message || 'Failed to analyze product');
    }

    // Score candidates (log value + typeof so we can see strings)
    if (DEBUG) {
      const scoreCandidates = {
        healthScore: analyzerData?.healthScore,
        quality_score: analyzerData?.quality?.score,
        score: analyzerData?.score,
        rating: analyzerData?.rating,
        overall_score: analyzerData?.overall?.score,
        grade_score: analyzerData?.grades?.health,
      };
      console.log('[ANALYZER][SCORE_CANDIDATES]',
        Object.fromEntries(Object.entries(scoreCandidates).map(([k,v]) => [k, {v, t: typeof v}])));
    }

    if (!analyzerData || Object.keys(analyzerData).length === 0) {
      console.warn('[ANALYZER][EMPTY] No data from analyzer, using fallback');
      analyzerData = {
        itemName: product?.name || 'Unknown Product',
        healthScore: 0,
        nutrition: {},
        ingredientsText: enriched?.ingredientsText || '',
        flags: [],
        insights: ['Unable to fully analyze this product']
      };
    }

    const flattened = {
      itemName: analyzerData.itemName ?? analyzerData.productName ?? analyzerData.title ?? analyzerData.name ?? product?.name ?? 'Unknown Product',
      healthScore: score10(
        analyzerData.healthScore ?? analyzerData.quality?.score ?? analyzerData.score ?? analyzerData.rating ?? analyzerData.overall?.score ?? analyzerData.grades?.health
      ),
      nutrition: analyzerData.nutrition ?? analyzerData.nutritionData ?? analyzerData.macros ?? {},
      ingredientsText: analyzerData.ingredientsText ?? analyzerData.ingredients ?? enriched?.ingredientsText ?? '',
      flags: analyzerData.flags ?? analyzerData.ingredientFlags ?? [],
      insights: analyzerData.insights ?? analyzerData.suggestions ?? [],
      ...analyzerData
    };

    // **Canonical title enforcement** - prefer OFF product_name if analyzer's itemName is brand-only or too short
    const analyzerName = flattened.itemName;
    const offProductName = product?.name;
    const finalName = isGeneric(analyzerName, brand) ? 
      (offProductName || pickedName) : analyzerName;
    if (finalName !== analyzerName) {
      console.log('[REPORT][TITLE_FIX]', { from: analyzerName, to: finalName, pickedName, brand, offProductName });
    }
    flattened.itemName = finalName;

    // **Attach selection metadata for cross-checking later**
    flattened.__selection = { selectionId, hintName: pickedName, hintBrand: brand };
    
    // Debug fingerprint after analyzer (DEBUG only)
    if (DEBUG) {
      console.info('[HEALTH_ANALYZE][OUTPUT_FP]', fp(flattened));
    }

    // Add fallback mapping for top-level macros when nutrition object is missing
    if (!flattened.nutrition || Object.keys(flattened.nutrition).length === 0) {
      flattened.nutrition = {
        calories: analyzerData?.calories || 0,
        protein_g: analyzerData?.protein || 0,
        carbs_g: analyzerData?.carbs || 0,
        fat_g: analyzerData?.fat || 0,
        fiber_g: analyzerData?.fiber || 0,
        sugar_g: analyzerData?.sugar || 0,
        sodium_mg: analyzerData?.sodium || 0,
      };
      console.log('[ANALYZER][FALLBACK] Mapped top-level macros to nutrition object');
    }

    if (DEBUG) {
      console.log('[ANALYZER][NORMALIZED]', {
        name: flattened.itemName,
        healthScore: flattened.healthScore,
        nutrKeys: Object.keys(flattened.nutrition||{}),
        hasIngredients: !!flattened.ingredientsText
      });
    }

    setAnalysisData({ ...flattened, product, source, confidence: item?.confidence ?? 0.8 });
    setStep('report');
  } catch (error) {
    console.error(`[SEARCH→ANALYSIS][${source.toUpperCase()}] Failed:`, error);
    onError?.(error);
    setStep('fallback');
  }
}
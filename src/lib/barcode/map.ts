export type BarcodeLookupResponse = any; // we'll normalize defensively

const OZ_TO_G = 28.349523125;

function coerceNumber(n: any): number | null {
  const v = typeof n === 'string' ? parseFloat(n) : (typeof n === 'number' ? n : NaN);
  return Number.isFinite(v) ? v : null;
}

// helpers (near top)
function num(v: any) { const n = Number(v); return Number.isFinite(n) ? n : null; }
export function parseServingGrams(raw: any): number | null {
  const direct = num(raw?.serving_weight_grams) ?? num(raw?.serving_size_g) ?? num(raw?.serving_grams);
  if (direct) return direct;
  const s = String(raw?.serving_size || raw?.serving || '').toLowerCase();
  const m = s.match(/(\d+(\.\d+)?)\s*g\b/);
  if (m) return Number(m[1]);
  const kcal100 = num(raw?.nutriments?.['energy-kcal_100g']);
  const kcalSrv = num(raw?.nutriments?.['energy-kcal_serving']) ?? num(raw?.nutrition?.calories_serving);
  if (kcal100 && kcalSrv) { const est = Math.round((100 * kcalSrv) / kcal100); if (est > 0 && est < 1000) return est; }
  return null;
}

// Try to extract grams from common strings like "2/3 cup (55 g)", "1 oz (28g)", "240 ml", "55g"
export function parseServingFromText(txt?: string | null): { grams: number | null; text?: string } {
  if (!txt) return { grams: null, text: undefined };
  const s = String(txt);

  // (55 g) or 55 g
  let m = s.match(/(\d+(?:\.\d+)?)\s*(?:g|grams)\b/i);
  if (m) return { grams: parseFloat(m[1]), text: s.trim() };

  // 1 oz / 1oz / (1 oz)
  m = s.match(/(\d+(?:\.\d+)?)\s*(?:oz|ounce|ounces)\b/i);
  if (m) return { grams: parseFloat(m[1]) * OZ_TO_G, text: s.trim() };

  // 240 ml — assume density ≈ 1 g/ml as a safe default for liquids
  m = s.match(/(\d+(?:\.\d+)?)\s*(?:ml|milliliter|milliliters)\b/i);
  if (m) return { grams: parseFloat(m[1]) /* ~1 g/ml */, text: s.trim() };

  return { grams: null, text: s.trim() };
}

// Prefer *_serving macros; else scale *_100g by grams/100.
// If grams missing but both *_serving and *_100g exist, back-compute grams from kcal ratio.
function derivePerPortion(
  nutr: any,
  grams: number | null
) {
  const kcal100 = coerceNumber(nutr?.['nutriments']?.['energy-kcal_100g']) ?? coerceNumber(nutr?.energy_kcal_100g);
  const kcalServ = coerceNumber(nutr?.['nutriments']?.['energy-kcal_serving']) ?? coerceNumber(nutr?.energy_kcal_serving);

  const prot100 = coerceNumber(nutr?.['nutriments']?.['proteins_100g']) ?? coerceNumber(nutr?.proteins_100g);
  const protServ = coerceNumber(nutr?.['nutriments']?.['proteins_serving']) ?? coerceNumber(nutr?.protein_serving);

  const carb100 = coerceNumber(nutr?.['nutriments']?.['carbohydrates_100g']) ?? coerceNumber(nutr?.carbohydrates_100g);
  const carbServ = coerceNumber(nutr?.['nutriments']?.['carbohydrates_serving']) ?? coerceNumber(nutr?.carbohydrates_serving);

  const fat100  = coerceNumber(nutr?.['nutriments']?.['fat_100g']) ?? coerceNumber(nutr?.fat_100g);
  const fatServ = coerceNumber(nutr?.['nutriments']?.['fat_serving']) ?? coerceNumber(nutr?.fat_serving);

  // If serving macros exist, use them as truth.
  let calories = kcalServ ?? null;
  let protein_g = protServ ?? null;
  let carbs_g   = carbServ ?? null;
  let fat_g     = fatServ ?? null;

  // If grams missing but we have kcal_serving and kcal_100g, back-calc grams
  let gramsResolved = grams;
  if (!gramsResolved && kcalServ && kcal100) {
    gramsResolved = (kcalServ / kcal100) * 100;
  }

  // If no *_serving macros, scale *_100g by gramsResolved
  if (!calories && kcal100 && gramsResolved) calories = (kcal100 * gramsResolved) / 100;
  if (!protein_g && prot100 && gramsResolved) protein_g = (prot100 * gramsResolved) / 100;
  if (!carbs_g && carb100 && gramsResolved)  carbs_g   = (carb100  * gramsResolved) / 100;
  if (!fat_g && fat100 && gramsResolved)     fat_g     = (fat100   * gramsResolved) / 100;

  return {
    grams: gramsResolved ?? null,
    calories: calories ?? null,
    protein_g: protein_g ?? null,
    carbs_g: carbs_g ?? null,
    fat_g: fat_g ?? null
  };
}

function pick<T = number>(
  obj: any,
  keys: string[],
  coerceNumber = false
): T | null {
  for (const k of keys) {
    const parts = k.split('.');
    let v = obj;
    for (const p of parts) {
      if (v == null) break;
      v = v[p];
    }
    if (v != null) {
      if (coerceNumber) {
        const n = typeof v === 'string' ? parseFloat(v) : Number(v);
        if (!Number.isNaN(n)) return n as any;
      }
      return v as T;
    }
  }
  return null;
}

export type RecognizedFood = {
  id: string;
  source: 'barcode';
  barcode: string;
  name: string;
  brand?: string | null;
  imageUrl?: string | null;
  servingGrams: number | null;
  servingText?: string; // Optional display text for serving size
  portionSource?: 'DB'|'UPC'|'FALLBACK'|'NUMERIC'|'TEXT'|'KCAL_RATIO';
  // Per-100g nutritional values for reference
  calories_per_100g?: number;
  protein_g_per_100g?: number;
  carbs_g_per_100g?: number;
  fat_g_per_100g?: number;
  fiber_g_per_100g?: number;
  sugar_g_per_100g?: number;
  sodium_mg_per_100g?: number;
  // Per-serving nutritional values (preferred)
  calories_serving?: number;
  protein_g_serving?: number;
  carbs_g_serving?: number;
  fat_g_serving?: number;
  fiber_g_serving?: number;
  sugar_g_serving?: number;
  sodium_mg_serving?: number;
  macro_mode?: 'SERVING_PROVIDER'|'SCALED_FROM_100G'|'PER100G_FALLBACK';
  // Legacy nutrition fields (for backward compatibility)
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  sugar_g: number;
  __hydrated?: boolean;
};

export function mapBarcodeToRecognizedFood(raw: any): RecognizedFood {
  const upc =
    pick<string>(raw, ['upc','barcode','ean','code']) || 'unknown';
  
  const brand = pick<string>(raw, ['brand','brands','brand_name','manufacturer']) ?? null;
  const name = pick<string>(raw, ['product_name','product_name_en','name','title','generic_name','description'])
             || (brand ? brand : `Barcode ${upc}`);

  const imageUrl =
    pick<string>(raw, ['image_url','images.front','image','photo']) ?? null;

  // Enhanced serving parsing with multiple approaches
  let servingGrams = parseServingGrams(raw);
  let servingText: string | undefined;
  let portionSource: 'NUMERIC' | 'TEXT' | 'KCAL_RATIO' | 'FALLBACK' = 'FALLBACK';

  // If no numeric grams found, try text parsing
  if (!servingGrams) {
    const servingStr = pick<string>(raw, ['serving_size', 'serving', 'portion_size']);
    if (servingStr) {
      const parsed = parseServingFromText(servingStr);
      servingGrams = parsed.grams;
      servingText = parsed.text;
      if (servingGrams) portionSource = 'TEXT';
    }
  } else {
    portionSource = 'NUMERIC';
  }

  // KCAL ratio rescue if still no grams
  if (!servingGrams) {
    const { grams: rescued, calories, protein_g, carbs_g, fat_g } = derivePerPortion(raw, null);
    if (rescued && rescued > 0 && rescued < 1000) {
      servingGrams = Math.round(rescued);
      portionSource = 'KCAL_RATIO';
    }
  }

  // Final fallback
  if (!servingGrams) {
    servingGrams = 100;
    portionSource = 'FALLBACK';
  }

  // Extract per-100g nutrients (convert kJ to kcal if needed)
  const kcal_100g = 
    pick<number>(raw, ['nutriments.energy-kcal_100g','energy-kcal_100g','nutrition.calories_100g'], true) ??
    (pick<number>(raw, ['nutriments.energy-kj_100g','energy-kj_100g'], true) ? Math.round(pick<number>(raw, ['nutriments.energy-kj_100g','energy-kj_100g'], true)! / 4.184) : null) ??
    pick<number>(raw, ['nutriments.energy-kcal_serving','nutrition.calories','kcal','calories'], true) ?? 150;

  const protein_100g = pick<number>(raw, ['nutriments.proteins_100g','proteins_100g','nutrition.protein_g'], true) ??
    pick<number>(raw, ['protein_g','protein'], true) ?? 8;

  const carbs_100g = pick<number>(raw, ['nutriments.carbohydrates_100g','carbohydrates_100g','nutrition.carbs_g'], true) ??
    pick<number>(raw, ['carbs_g','carbohydrate','carbohydrates'], true) ?? 20;

  const fat_100g = pick<number>(raw, ['nutriments.fat_100g','fat_100g','nutrition.fat_g'], true) ??
    pick<number>(raw, ['fat_g','fat','total_fat'], true) ?? 4;

  const fiber_100g = pick<number>(raw, ['nutriments.fiber_100g','fiber_100g','nutrition.fiber_g'], true) ??
    pick<number>(raw, ['fiber_g','fiber'], true) ?? 2;

  const sugar_100g = pick<number>(raw, ['nutriments.sugars_100g','sugars_100g','nutrition.sugar_g'], true) ??
    pick<number>(raw, ['sugar_g','sugar'], true) ?? 5;

  const sodium_100g = pick<number>(raw, ['nutriments.sodium_100g','sodium_100g','nutrition.sodium_mg'], true) ??
    pick<number>(raw, ['sodium_mg','sodium'], true) ?? 0;

  // Extract per-serving nutrients if available
  const kcal_serving = pick<number>(raw, ['nutriments.energy-kcal_serving','energy-kcal_serving','nutrition.calories_serving'], true);
  const protein_serving = pick<number>(raw, ['nutriments.proteins_serving','proteins_serving','nutrition.protein_serving'], true);
  const carbs_serving = pick<number>(raw, ['nutriments.carbohydrates_serving','carbohydrates_serving','nutrition.carbs_serving'], true);
  const fat_serving = pick<number>(raw, ['nutriments.fat_serving','fat_serving','nutrition.fat_serving'], true);
  const fiber_serving = pick<number>(raw, ['nutriments.fiber_serving','fiber_serving','nutrition.fiber_serving'], true);
  const sugar_serving = pick<number>(raw, ['nutriments.sugars_serving','sugars_serving','nutrition.sugar_serving'], true);
  const sodium_serving = pick<number>(raw, ['nutriments.sodium_serving','sodium_serving','nutrition.sodium_serving'], true);

  // Compute per-serving macros using precedence
  let macro_mode: 'SERVING_PROVIDER'|'SCALED_FROM_100G'|'PER100G_FALLBACK';
  let calories_serving_final: number;
  let protein_g_serving_final: number;
  let carbs_g_serving_final: number;
  let fat_g_serving_final: number;
  let fiber_g_serving_final: number;
  let sugar_g_serving_final: number;
  let sodium_mg_serving_final: number;

  // Check if provider gives per-serving values
  const hasServingMacros = kcal_serving || protein_serving || carbs_serving || fat_serving;

  if (hasServingMacros) {
    macro_mode = 'SERVING_PROVIDER';
    calories_serving_final = kcal_serving ?? kcal_100g;
    protein_g_serving_final = protein_serving ?? protein_100g;
    carbs_g_serving_final = carbs_serving ?? carbs_100g;
    fat_g_serving_final = fat_serving ?? fat_100g;
    fiber_g_serving_final = fiber_serving ?? fiber_100g;
    sugar_g_serving_final = sugar_serving ?? sugar_100g;
    sodium_mg_serving_final = sodium_serving ?? sodium_100g;
  } else if (servingGrams && servingGrams !== 100) {
    macro_mode = 'SCALED_FROM_100G';
    const scale = servingGrams / 100;
    calories_serving_final = Math.round(kcal_100g * scale);
    protein_g_serving_final = Math.round((protein_100g * scale) * 10) / 10;
    carbs_g_serving_final = Math.round((carbs_100g * scale) * 10) / 10;
    fat_g_serving_final = Math.round((fat_100g * scale) * 10) / 10;
    fiber_g_serving_final = Math.round((fiber_100g * scale) * 10) / 10;
    sugar_g_serving_final = Math.round((sugar_100g * scale) * 10) / 10;
    sodium_mg_serving_final = Math.round(sodium_100g * scale);
  } else {
    macro_mode = 'PER100G_FALLBACK';
    calories_serving_final = kcal_100g;
    protein_g_serving_final = protein_100g;
    carbs_g_serving_final = carbs_100g;
    fat_g_serving_final = fat_100g;
    fiber_g_serving_final = fiber_100g;
    sugar_g_serving_final = sugar_100g;
    sodium_mg_serving_final = sodium_100g;
  }

  // Add telemetry
  console.log('[BARCODE][SERVING_PARSE]', {
    raw: { 
      serving_size: raw?.serving_size, 
      serving_weight_grams: raw?.serving_weight_grams, 
      kcal_serving: raw?.nutriments?.['energy-kcal_serving'], 
      kcal_100g: raw?.nutriments?.['energy-kcal_100g'] 
    },
    parsed: { grams: servingGrams, text: servingText, source: portionSource }
  });

  console.log('[BARCODE][MACROS]', {
    grams: servingGrams,
    mode: macro_mode,
    per100g: { kcal: kcal_100g, protein: protein_100g, carbs: carbs_100g, fat: fat_100g, fiber: fiber_100g, sugar: sugar_100g, sodium_mg: sodium_100g },
    serving: { kcal: calories_serving_final, protein: protein_g_serving_final, carbs: carbs_g_serving_final, fat: fat_g_serving_final, fiber: fiber_g_serving_final, sugar: sugar_g_serving_final, sodium_mg: sodium_mg_serving_final }
  });

  // Build RecognizedFood — UI copies these into legacy fields for display
  const mapped: RecognizedFood = {
    id: `bc:${upc}`,
    source: 'barcode',
    barcode: upc,
    name,
    brand,
    imageUrl,
    servingGrams,
    servingText,
    portionSource,
    // Per-100g values for reference
    calories_per_100g: kcal_100g,
    protein_g_per_100g: protein_100g,
    carbs_g_per_100g: carbs_100g,
    fat_g_per_100g: fat_100g,
    fiber_g_per_100g: fiber_100g,
    sugar_g_per_100g: sugar_100g,
    sodium_mg_per_100g: sodium_100g,
    // Per-serving values (preferred)
    calories_serving: calories_serving_final,
    protein_g_serving: protein_g_serving_final,
    carbs_g_serving: carbs_g_serving_final,
    fat_g_serving: fat_g_serving_final,
    fiber_g_serving: fiber_g_serving_final,
    sugar_g_serving: sugar_g_serving_final,
    sodium_mg_serving: sodium_mg_serving_final,
    macro_mode,
    // Legacy fields (keep for backward compatibility)
    calories: calories_serving_final,
    protein_g: protein_g_serving_final,
    carbs_g: carbs_g_serving_final,
    fat_g: fat_g_serving_final,
    fiber_g: fiber_g_serving_final,
    sugar_g: sugar_g_serving_final,
    __hydrated: true
  };

  console.log('[BARCODE][MAP:ITEM]', { name, brand, servingGrams, portionSource, macro_mode });
  return mapped;
}
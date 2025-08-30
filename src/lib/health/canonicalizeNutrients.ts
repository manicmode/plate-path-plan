/**
 * Nutrient Canonicalization for V2 Scoring
 * Maps diverse API/DB keys to canonical format with proper units
 */

const toNumberSafe = (value: any, defaultValue = 0): number => {
  const num = Number(value);
  return Number.isFinite(num) ? num : defaultValue;
};

const pick = (obj: any, keys: string[], scale = 1): number | null => {
  for (const key of keys) {
    const value = toNumberSafe(obj?.[key]);
    if (Number.isFinite(value) && value > 0) {
      return value * scale;
    }
  }
  return null;
};

export interface CanonicalNutrition {
  energy_kcal: number;
  sugars_g: number;
  saturated_fat_g: number;
  sodium_mg: number;
  fiber_g: number;
  protein_g: number;
}

/**
 * Canonicalize per-100g nutrients from diverse sources
 */
export function canonicalizePer100g(raw: any): CanonicalNutrition {
  // Energy: prefer kcal, convert kJ if needed
  let energy_kcal = pick(raw, [
    'energy-kcal_100g', 'energy_kcal_100g', 'energy_kcal', 
    'kcal_100g', 'calories_100g', 'calories'
  ]);
  
  if (energy_kcal === null) {
    // Try kJ conversion
    const energy_kj = pick(raw, [
      'energy-kj_100g', 'energy_kj_100g', 'energy_kj', 
      'kj_100g', 'kilojoules_100g', 'kilojoules'
    ]);
    if (energy_kj !== null) {
      energy_kcal = energy_kj * 0.239006; // kJ to kcal
    }
  }

  // Sugars
  const sugars_g = pick(raw, [
    'sugars_100g', 'sugars', 'sugar_100g', 
    'total_sugars_100g', 'added_sugars_100g',
    'sugars-total_100g', 'total-sugars_100g'
  ]) ?? 0;

  // Saturated fat
  const saturated_fat_g = pick(raw, [
    'saturated-fat_100g', 'saturated_fat_100g', 
    'satfat_100g', 'saturated-fat', 'saturated_fat'
  ]) ?? 0;

  // Fiber
  const fiber_g = pick(raw, [
    'fiber_100g', 'dietary-fiber_100g', 'fibre_100g', 
    'fiber', 'dietary_fiber_100g', 'fibre'
  ]) ?? 0;

  // Protein
  const protein_g = pick(raw, [
    'proteins_100g', 'protein_100g', 'protein'
  ]) ?? 0;

  // Sodium: complex handling for mg vs g and salt conversion
  let sodium_mg = pick(raw, [
    'sodium_100g_mg', 'sodium_mg_100g', 'sodium_mg'
  ]);

  if (sodium_mg === null) {
    // Try sodium in grams, convert to mg
    const sodium_g = pick(raw, [
      'sodium_100g', 'sodium'
    ]);
    if (sodium_g !== null) {
      sodium_mg = sodium_g * 1000;
    } else {
      // Try salt conversion: salt(g) * 0.393 = sodium(g)
      const salt_g = pick(raw, [
        'salt_100g', 'salt'
      ]);
      if (salt_g !== null) {
        sodium_mg = salt_g * 0.393 * 1000; // salt -> sodium -> mg
      }
    }
  }

  return {
    energy_kcal: energy_kcal ?? 0,
    sugars_g,
    saturated_fat_g,
    sodium_mg: sodium_mg ?? 0,
    fiber_g,
    protein_g
  };
}

/**
 * Compute per-serving from canonical per-100g + portion grams
 */
export function perServingFromPer100g(
  per100g: CanonicalNutrition, 
  grams: number
): CanonicalNutrition {
  const factor = grams / 100;
  
  return {
    energy_kcal: per100g.energy_kcal * factor,
    sugars_g: per100g.sugars_g * factor,
    saturated_fat_g: per100g.saturated_fat_g * factor,
    sodium_mg: per100g.sodium_mg * factor,
    fiber_g: per100g.fiber_g * factor,
    protein_g: per100g.protein_g * factor
  };
}

/**
 * Log canonicalization telemetry for debugging
 */
export function logCanonicalizationTelemetry(
  raw: any, 
  canonical: CanonicalNutrition, 
  grams: number
) {
  console.info('[REPORT][V2][SCORE][INPUTS]', {
    per100g: canonical,
    perServing: perServingFromPer100g(canonical, grams),
    grams,
    rawKeys: Object.keys(raw || {}).filter(k => k.includes('100g') || k.includes('kcal') || k.includes('sugar') || k.includes('fat') || k.includes('sodium'))
  });
}
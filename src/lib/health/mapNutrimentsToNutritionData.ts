/**
 * Maps OFF nutriments to standardized nutrition data with proper unit conversions
 * Converts all values to per-100g basis with consistent units
 */

export interface StandardNutrition {
  energyKcal: number;    // kcal per 100g
  protein_g: number;     // grams per 100g  
  carbs_g: number;       // grams per 100g
  fat_g: number;         // grams per 100g
  sugar_g: number;       // grams per 100g
  fiber_g: number;       // grams per 100g
  sodium_mg: number;     // milligrams per 100g
  satfat_g: number;      // grams per 100g
}

/**
 * Convert energy from kJ to kcal
 */
const kJToKcal = (kJ: number): number => kJ * 0.239005736;

/**
 * Convert salt (g) to sodium (mg): salt_g * 400 = sodium_mg
 */
const saltToSodiumMg = (saltG: number): number => saltG * 400;

/**
 * Safe number conversion with fallback to 0
 */
const num = (v: any): number => {
  const n = Number(v);
  return isFinite(n) ? Math.max(0, n) : 0;
};

/**
 * Map OFF nutriments object to standardized nutrition data
 * Prefers per-100g values, handles unit conversions automatically
 */
export function mapNutriments(nutriments: any = {}): StandardNutrition {
  // Energy: prefer kcal, fallback to kJ conversion
  const energyKcal = (() => {
    const kcal100g = num(nutriments['energy-kcal_100g']);
    if (kcal100g > 0) return kcal100g;
    
    const kJ100g = num(nutriments['energy_100g']);
    if (kJ100g > 0) return kJToKcal(kJ100g);
    
    // Legacy fallbacks
    const kcal = num(nutriments.energy_kcal || nutriments.kcal);
    if (kcal > 0) return kcal;
    
    const kJ = num(nutriments.energy || nutriments.energy_kj);
    return kJ > 0 ? kJToKcal(kJ) : 0;
  })();

  // Macronutrients (prefer _100g keys)
  const protein_g = num(
    nutriments['proteins_100g'] ?? 
    nutriments.proteins ?? 
    nutriments.protein_g ?? 
    nutriments.protein
  );

  const carbs_g = num(
    nutriments['carbohydrates_100g'] ?? 
    nutriments.carbohydrates ?? 
    nutriments.carbs_g ?? 
    nutriments.carbs
  );

  const fat_g = num(
    nutriments['fat_100g'] ?? 
    nutriments.fat ?? 
    nutriments.fat_g
  );

  const sugar_g = num(
    nutriments['sugars_100g'] ?? 
    nutriments.sugars ?? 
    nutriments.sugar_g ?? 
    nutriments.sugar
  );

  const fiber_g = num(
    nutriments['fiber_100g'] ?? 
    nutriments.fiber ?? 
    nutriments.fiber_g ?? 
    nutriments['dietary-fiber_100g']
  );

  const satfat_g = num(
    nutriments['saturated-fat_100g'] ?? 
    nutriments.saturated_fat ?? 
    nutriments.satfat_g ?? 
    nutriments['saturated-fat']
  );

  // Sodium: handle salt conversion
  const sodium_mg = (() => {
    // Direct sodium values (convert g to mg)
    const sodiumG = num(nutriments['sodium_100g'] ?? nutriments.sodium ?? nutriments.sodium_g);
    if (sodiumG > 0) return sodiumG * 1000; // g to mg

    // Salt conversion: salt(g) * 400 = sodium(mg) 
    const saltG = num(nutriments['salt_100g'] ?? nutriments.salt ?? nutriments.salt_g);
    if (saltG > 0) return saltToSodiumMg(saltG);

    return 0;
  })();

  return {
    energyKcal,
    protein_g,
    carbs_g, 
    fat_g,
    sugar_g,
    fiber_g,
    sodium_mg,
    satfat_g
  };
}
/**
 * Health Report -> Log Food prefill system
 * Shared types and utilities for passing report data to confirmation modal
 */

export type ScaledNutrients = {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  sugar_g: number;
  sodium_mg: number;
  factor: number; // portionGrams/100 (for 100% slider)
};

export type LogPrefill = {
  source: 'health-report' | string;
  item: {
    itemName: string;
    brand?: string;
    imageUrl?: string;
    ingredientsText?: string;
    allergens: string[];
    additives: string[];
    categories: string[];
    portionGrams: number | null;          // serving grams if known
    requiresConfirmation?: boolean;
    nutrientsPer100?: Omit<ScaledNutrients, 'factor'>; // baseline per-100g
    nutrientsScaled: ScaledNutrients;                    // per-portion @ 100%
  };
  ts?: number; // optional timestamp for the log
};

export function buildLogPrefill(
  itemName: string,
  brand: string | undefined,
  imageUrl: string | undefined,
  ingredientsText: string | undefined,
  allergens: string[] | undefined,
  additives: string[] | undefined,
  categories: string[] | undefined,
  nutrientsPer100: { // baseline
    calories: number; 
    protein_g: number; 
    carbs_g: number; 
    fat_g: number;
    fiber_g: number; 
    sugar_g: number; 
    sodium_mg: number;
  },
  portionGrams: number | null,
  requiresConfirmation?: boolean
): LogPrefill {
  const factor = portionGrams && portionGrams > 0 ? portionGrams / 100 : 1;

  const scaled = {
    calories: Math.round(nutrientsPer100.calories * factor),
    protein_g: Math.round(nutrientsPer100.protein_g * factor * 10) / 10,
    carbs_g: Math.round(nutrientsPer100.carbs_g * factor * 10) / 10,
    fat_g: Math.round(nutrientsPer100.fat_g * factor * 10) / 10,
    fiber_g: Math.round(nutrientsPer100.fiber_g * factor * 10) / 10,
    sugar_g: Math.round(nutrientsPer100.sugar_g * factor * 10) / 10,
    sodium_mg: Math.round(nutrientsPer100.sodium_mg * factor),
    factor
  };

  return {
    source: 'health-report',
    item: {
      itemName,
      brand,
      imageUrl,
      ingredientsText,
      allergens: allergens || [],
      additives: additives || [],
      categories: categories || [],
      portionGrams,
      requiresConfirmation: !!requiresConfirmation,
      nutrientsPer100: {
        calories: Math.round(nutrientsPer100.calories),
        protein_g: Math.round(nutrientsPer100.protein_g * 10) / 10,
        carbs_g: Math.round(nutrientsPer100.carbs_g * 10) / 10,
        fat_g: Math.round(nutrientsPer100.fat_g * 10) / 10,
        fiber_g: Math.round(nutrientsPer100.fiber_g * 10) / 10,
        sugar_g: Math.round(nutrientsPer100.sugar_g * 10) / 10,
        sodium_mg: Math.round(nutrientsPer100.sodium_mg),
      },
      nutrientsScaled: scaled
    },
    ts: Date.now(),
  };
}
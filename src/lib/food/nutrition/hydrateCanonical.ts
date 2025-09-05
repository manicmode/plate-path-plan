/**
 * Canonical nutrition hydration for generic food items
 * Resolves standardized nutrition profiles by canonical key
 */

import { supabase } from '@/integrations/supabase/client';
import type { CanonicalKey } from '../text/canonicalMap';

export type PerGramMacros = { 
  kcal: number; 
  protein: number; 
  carbs: number; 
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
};

/**
 * Fetch nutrition data by canonical key
 * Returns per-gram macros or null if not found
 */
export async function fetchMacrosByCanonicalKey(key: CanonicalKey): Promise<{ perGram: PerGramMacros } | null> {
  // Skip table lookup for now since table doesn't exist yet
  // This will be enabled when the nutrition_canonical_pergram table is created
  
  // Fallback to hardcoded nutrition data (per 100g)
  const HARDCODED_NUTRITION: Record<CanonicalKey, PerGramMacros> = {
    'generic_hot_dog': { 
      kcal: 2.90, protein: 0.10, carbs: 0.02, fat: 0.26, 
      fiber: 0.001, sugar: 0.02, sodium: 11.0 
    },
    'generic_pizza_slice': { 
      kcal: 2.66, protein: 0.11, carbs: 0.33, fat: 0.10, 
      fiber: 0.02, sugar: 0.04, sodium: 5.98 
    },
    'generic_teriyaki_chicken_bowl': { 
      kcal: 1.63, protein: 0.12, carbs: 0.21, fat: 0.04, 
      fiber: 0.02, sugar: 0.08, sodium: 4.5 
    },
    'generic_california_roll': { 
      kcal: 1.29, protein: 0.04, carbs: 0.18, fat: 0.06, 
      fiber: 0.02, sugar: 0.03, sodium: 2.4 
    },
    'generic_white_rice_cooked': { 
      kcal: 1.30, protein: 0.027, carbs: 0.28, fat: 0.003, 
      fiber: 0.004, sugar: 0.001, sodium: 0.01 
    },
    'generic_egg_large': { 
      kcal: 1.55, protein: 0.13, carbs: 0.011, fat: 0.11, 
      fiber: 0, sugar: 0.006, sodium: 1.24 
    },
    'generic_oatmeal_dry': { 
      kcal: 3.89, protein: 0.17, carbs: 0.66, fat: 0.07, 
      fiber: 0.11, sugar: 0.01, sodium: 0.02 
    },
    'generic_chicken_grilled': { 
      kcal: 1.65, protein: 0.31, carbs: 0, fat: 0.036, 
      fiber: 0, sugar: 0, sodium: 0.74 
    },
    'generic_salmon_grilled': { 
      kcal: 2.06, protein: 0.22, carbs: 0, fat: 0.12, 
      fiber: 0, sugar: 0, sodium: 0.59 
    },
    'generic_pasta_cooked': { 
      kcal: 1.31, protein: 0.05, carbs: 0.25, fat: 0.011, 
      fiber: 0.018, sugar: 0.006, sodium: 0.01 
    },
    'generic_bread_slice': { 
      kcal: 2.65, protein: 0.09, carbs: 0.49, fat: 0.032, 
      fiber: 0.024, sugar: 0.05, sodium: 4.77 
    },
    'generic_banana': { 
      kcal: 0.89, protein: 0.011, carbs: 0.23, fat: 0.003, 
      fiber: 0.026, sugar: 0.12, sodium: 0.01 
    },
    'generic_apple': { 
      kcal: 0.52, protein: 0.003, carbs: 0.14, fat: 0.002, 
      fiber: 0.024, sugar: 0.10, sodium: 0.01 
    },
    'generic_milk_whole': { 
      kcal: 0.61, protein: 0.032, carbs: 0.047, fat: 0.033, 
      fiber: 0, sugar: 0.047, sodium: 0.40 
    },
    'generic_yogurt_plain': { 
      kcal: 0.59, protein: 0.10, carbs: 0.047, fat: 0.032, 
      fiber: 0, sugar: 0.047, sodium: 0.46 
    }
  };

  const nutrition = HARDCODED_NUTRITION[key];
  if (!nutrition) return null;

  return { perGram: nutrition };
}

/**
 * Legacy hydration by name for fallback
 */
export async function legacyHydrateByName(name: string): Promise<{ perGram: PerGramMacros } | null> {
  try {
    const { data, error } = await supabase.functions.invoke('gpt-nutrition-estimator', {
      body: {
        foodName: name,
        amountPercentage: 100
      }
    });

    if (error || !data?.nutrition) return null;

    const { nutrition } = data;
    return {
      perGram: {
        kcal: nutrition.calories / 100,
        protein: nutrition.protein / 100,
        carbs: nutrition.carbs / 100,
        fat: nutrition.fat / 100,
        fiber: (nutrition.fiber || 0) / 100,
        sugar: (nutrition.sugar || 0) / 100,
        sodium: (nutrition.sodium || 0) / 100
      }
    };
  } catch (error) {
    console.warn('[NUTRITION][LEGACY_HYDRATE] Error:', error);
    return null;
  }
}
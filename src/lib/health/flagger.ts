/**
 * Deterministic flag detection for ingredients and nutrition
 * Provides consistent flagging across all analysis flows
 */

import { INGREDIENT_RULES, NUTRITION_RULES, type HealthFlag, type NutritionThresholds } from './flagRules';

/**
 * Detect flags from ingredient text using deterministic rules
 */
export function detectIngredientFlags(ingredientsText: string): HealthFlag[] {
  if (!ingredientsText || typeof ingredientsText !== 'string') {
    return [];
  }

  const flags: HealthFlag[] = [];
  const text = ingredientsText.toLowerCase().trim();

  for (const rule of INGREDIENT_RULES) {
    if (rule.test(text)) {
      flags.push(rule.flag);
    }
  }

  return flags;
}

/**
 * Detect flags from nutrition data using threshold rules
 */
export function detectNutritionFlags(nutrition: NutritionThresholds): HealthFlag[] {
  const flags: HealthFlag[] = [];

  for (const rule of NUTRITION_RULES) {
    if (rule.test(nutrition)) {
      flags.push(rule.flag);
    }
  }

  return flags;
}

/**
 * Combine ingredient and nutrition flags with deduplication
 */
export function detectFlags(
  ingredientsText: string, 
  nutrition: NutritionThresholds
): HealthFlag[] {
  const ingredientFlags = detectIngredientFlags(ingredientsText);
  const nutritionFlags = detectNutritionFlags(nutrition);
  
  // Combine and deduplicate by key
  const allFlags = [...ingredientFlags, ...nutritionFlags];
  const uniqueFlags = new Map<string, HealthFlag>();
  
  for (const flag of allFlags) {
    uniqueFlags.set(flag.key, flag);
  }
  
  return Array.from(uniqueFlags.values());
}
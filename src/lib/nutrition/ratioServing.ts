/**
 * Ratio-based serving calculation from nutrition data
 */

export interface RatioResult {
  grams: number;
  confidence: number;
  method: 'calories' | 'energy_macro' | 'protein_macro' | 'carb_macro';
  details: string;
}

/**
 * Calculate serving size from per-serving vs per-100g nutrition ratios
 */
export function calculateServingFromRatio(nutritionData: any): RatioResult | null {
  if (!nutritionData) return null;

  // Method 1: Direct calorie comparison
  const calories100g = nutritionData.calories_per_100g || nutritionData.energy_per_100g;
  const caloriesServing = nutritionData.calories || nutritionData.energy;
  
  if (calories100g && caloriesServing && calories100g > 0) {
    const ratio = caloriesServing / calories100g;
    const grams = Math.round(ratio * 100);
    
    if (grams >= 5 && grams <= 300) {
      return {
        grams,
        confidence: 0.7,
        method: 'calories',
        details: `${caloriesServing}kcal serving ÷ ${calories100g}kcal/100g`
      };
    }
  }

  // Method 2: Macro energy calculation (fallback)
  const protein100g = nutritionData.protein_per_100g;
  const carbs100g = nutritionData.carbs_per_100g || nutritionData.carbohydrates_per_100g;
  const fat100g = nutritionData.fat_per_100g;
  
  const proteinServing = nutritionData.protein;
  const carbsServing = nutritionData.carbs || nutritionData.carbohydrates;
  const fatServing = nutritionData.fat;

  if (protein100g && proteinServing && protein100g > 0) {
    const ratio = proteinServing / protein100g;
    const grams = Math.round(ratio * 100);
    
    if (grams >= 5 && grams <= 300) {
      return {
        grams,
        confidence: 0.6,
        method: 'protein_macro',
        details: `${proteinServing}g protein serving ÷ ${protein100g}g protein/100g`
      };
    }
  }

  if (carbs100g && carbsServing && carbs100g > 0) {
    const ratio = carbsServing / carbs100g;
    const grams = Math.round(ratio * 100);
    
    if (grams >= 5 && grams <= 300) {
      return {
        grams,
        confidence: 0.6,
        method: 'carb_macro',
        details: `${carbsServing}g carbs serving ÷ ${carbs100g}g carbs/100g`
      };
    }
  }

  return null;
}
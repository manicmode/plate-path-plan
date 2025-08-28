/**
 * Shared utility for building analyzer text from various data sources
 */

interface AnalyzerData {
  productName?: string;
  brand?: string;
  ingredientsText?: string;
  nutrition?: {
    calories?: number;
    protein_g?: number;
    carbs_g?: number;
    fat_g?: number;
    sugar_g?: number;
    sodium_mg?: number;
    fiber_g?: number;
    satfat_g?: number;
  };
}

export function buildAnalyzerTextFrom(data: AnalyzerData): string {
  const name = [data.brand, data.productName].filter(Boolean).join(' ').trim() || 'Unknown product';
  const parts = [`Product: ${name}`];
  
  if (data.ingredientsText) {
    parts.push(`Ingredients: ${data.ingredientsText}`);
  }
  
  const n = data.nutrition || {};
  const nutritionFacts = [];
  
  if (n.calories != null) nutritionFacts.push(`${n.calories} kcal`);
  if (n.protein_g != null) nutritionFacts.push(`${n.protein_g}g protein`);
  if (n.carbs_g != null) nutritionFacts.push(`${n.carbs_g}g carbs`);
  if (n.fat_g != null) nutritionFacts.push(`${n.fat_g}g fat`);
  if (n.sugar_g != null) nutritionFacts.push(`${n.sugar_g}g sugar`);
  if (n.sodium_mg != null) nutritionFacts.push(`${n.sodium_mg}mg sodium`);
  if (n.fiber_g != null) nutritionFacts.push(`${n.fiber_g}g fiber`);
  if (n.satfat_g != null) nutritionFacts.push(`${n.satfat_g}g saturated fat`);
  
  if (nutritionFacts.length) {
    parts.push(`Nutrition (per serving): ${nutritionFacts.join(', ')}`);
  }
  
  return parts.join('\n');
}
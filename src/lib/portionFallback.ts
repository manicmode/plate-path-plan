import type { Category } from './category';

// Portion fallback table (used only when OCR fails to find grams)
export const CATEGORY_PORTION_GRAMS: Record<Category, number> = {
  cereal_granola: 60,
  cereal: 55,
  chips: 28,
  nuts: 28,
  candy: 40,
  yogurt: 170,
  unknown: 30, // last resort
};

export function fallbackServingGramsByCategory(cat?: Category): number {
  const category = cat ?? 'unknown';
  const grams = CATEGORY_PORTION_GRAMS[category] ?? 30;
  console.log('[PORTION][OCR] Using fallback:', { category, grams });
  return grams;
}

export default fallbackServingGramsByCategory;
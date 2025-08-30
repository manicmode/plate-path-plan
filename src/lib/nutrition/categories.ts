/**
 * Category-based portion size medians and caps
 */

export interface CategoryPortions {
  median: number;
  cap: number;
  density?: number; // g/ml for beverages
}

// Category medians per PR requirements
export const CATEGORY_PORTIONS: Record<string, CategoryPortions> = {
  // Cereals and grains
  cereal: { median: 55, cap: 90 },
  granola: { median: 55, cap: 90 },
  oatmeal: { median: 40, cap: 80 },
  muesli: { median: 55, cap: 90 },
  rice: { median: 80, cap: 120 },
  pasta: { median: 80, cap: 120 },
  
  // Nuts and seeds
  nuts: { median: 40, cap: 60 },
  almonds: { median: 28, cap: 60 },
  peanuts: { median: 40, cap: 60 },
  'peanut butter': { median: 32, cap: 50 },
  'mixed nuts': { median: 40, cap: 60 },
  seeds: { median: 30, cap: 50 },
  'trail mix': { median: 40, cap: 60 },
  
  // Snacks
  chips: { median: 28, cap: 70 },
  crackers: { median: 30, cap: 70 },
  cookies: { median: 25, cap: 70 },
  candy: { median: 25, cap: 70 },
  chocolate: { median: 35, cap: 70 },
  
  // Bars
  bar: { median: 45, cap: 80 },
  'energy bar': { median: 60, cap: 80 },
  'protein bar': { median: 50, cap: 80 },
  'granola bar': { median: 45, cap: 80 },
  
  // Beverages (ml -> g using density)
  milk: { median: 240, cap: 500, density: 1.03 },
  juice: { median: 240, cap: 500, density: 1.05 },
  soda: { median: 355, cap: 500, density: 1.04 },
  beer: { median: 355, cap: 500, density: 1.01 },
  wine: { median: 150, cap: 300, density: 0.99 },
  
  // Spreads and condiments
  jam: { median: 20, cap: 40 },
  honey: { median: 21, cap: 40 },
  sauce: { median: 15, cap: 30 },
  
  // Dairy
  yogurt: { median: 170, cap: 300 },
  cheese: { median: 30, cap: 60 },
  
  // Supplements
  supplement: { median: 1, cap: 10 },
  vitamin: { median: 1, cap: 5 },
  powder: { median: 30, cap: 60 }
};

/**
 * Get category portion estimate for a product name
 */
export function getCategoryPortion(productName: string): { grams: number; category: string } | null {
  const name = productName.toLowerCase();
  
  // Find matching category
  for (const [category, portions] of Object.entries(CATEGORY_PORTIONS)) {
    if (name.includes(category)) {
      let grams = portions.median;
      
      // Apply density conversion for beverages
      if (portions.density && portions.density !== 1) {
        grams = Math.round(grams * portions.density);
      }
      
      // Apply cap
      grams = Math.min(grams, portions.cap);
      
      return { grams, category };
    }
  }
  
  return null;
}

/**
 * Validate portion against category caps
 */
export function validateAgainstCaps(grams: number, productName: string): number {
  const categoryMatch = getCategoryPortion(productName);
  if (categoryMatch) {
    return Math.min(grams, CATEGORY_PORTIONS[categoryMatch.category].cap);
  }
  return grams;
}
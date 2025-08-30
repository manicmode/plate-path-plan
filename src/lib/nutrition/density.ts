/**
 * Food density mappings for unit conversions
 * Values in g/ml unless otherwise specified
 */

export interface DensityData {
  density: number; // g/ml
  category: string[];
  notes?: string;
}

export const FOOD_DENSITIES: Record<string, DensityData> = {
  // Liquids
  water: { density: 1.0, category: ['beverages', 'liquid'] },
  milk: { density: 1.03, category: ['dairy', 'beverages'] },
  oil: { density: 0.91, category: ['fats', 'cooking'] },
  honey: { density: 1.42, category: ['sweeteners', 'syrup'] },
  syrup: { density: 1.35, category: ['sweeteners', 'syrup'] },
  vinegar: { density: 1.01, category: ['condiments', 'liquid'] },
  
  // Dairy
  yogurt: { density: 1.03, category: ['dairy'] },
  cream: { density: 0.99, category: ['dairy'] },
  sour_cream: { density: 0.96, category: ['dairy'] },
  cottage_cheese: { density: 1.02, category: ['dairy'] },
  
  // Dry goods
  flour: { density: 0.53, category: ['baking', 'grains'] },
  sugar: { density: 0.85, category: ['sweeteners', 'baking'] },
  brown_sugar: { density: 0.95, category: ['sweeteners', 'baking'] },
  salt: { density: 1.22, category: ['seasonings'] },
  baking_powder: { density: 0.9, category: ['baking'] },
  cocoa_powder: { density: 0.41, category: ['baking', 'chocolate'] },
  
  // Grains & cereals
  rice_cooked: { density: 0.96, category: ['grains', 'cooked'] },
  rice_uncooked: { density: 0.77, category: ['grains', 'raw'] },
  oats: { density: 0.32, category: ['cereals', 'grains'] },
  quinoa_cooked: { density: 0.92, category: ['grains', 'cooked'] },
  pasta_cooked: { density: 0.85, category: ['grains', 'cooked'] },
  cereal: { density: 0.25, category: ['cereals'] },
  
  // Nuts & seeds
  nuts: { density: 0.6, category: ['nuts', 'snacks'] },
  almonds: { density: 0.6, category: ['nuts'] },
  peanut_butter: { density: 0.95, category: ['spreads', 'nuts'] },
  
  // Fruits (average)
  berries: { density: 0.8, category: ['fruits'] },
  fruit_juice: { density: 1.05, category: ['beverages', 'fruits'] },
  
  // Vegetables
  vegetables_raw: { density: 0.6, category: ['vegetables', 'raw'] },
  vegetables_cooked: { density: 0.8, category: ['vegetables', 'cooked'] },
  
  // Condiments & sauces
  ketchup: { density: 1.1, category: ['condiments'] },
  mayonnaise: { density: 0.91, category: ['condiments', 'spreads'] },
  mustard: { density: 1.05, category: ['condiments'] },
  
  // Default fallbacks
  liquid: { density: 1.0, category: ['default'] },
  solid: { density: 0.7, category: ['default'] },
  powder: { density: 0.5, category: ['default'] }
};

/**
 * Get density for a food item by matching keywords
 */
export function getDensityForFood(foodName: string): number {
  const name = foodName.toLowerCase();
  
  for (const [key, data] of Object.entries(FOOD_DENSITIES)) {
    // Direct key match
    if (name.includes(key.replace('_', ' '))) {
      return data.density;
    }
    
    // Category-based matching
    for (const category of data.category) {
      if (name.includes(category)) {
        return data.density;
      }
    }
  }
  
  // Heuristic fallbacks
  if (name.includes('juice') || name.includes('milk') || name.includes('drink')) {
    return 1.02; // liquid-ish
  }
  
  if (name.includes('powder') || name.includes('flour') || name.includes('cereal')) {
    return 0.45; // powder-ish
  }
  
  if (name.includes('oil') || name.includes('butter')) {
    return 0.92; // fat-ish
  }
  
  // Default to slightly less dense than water for most foods
  return 0.7;
}

/**
 * Convert ml to grams using density lookup
 */
export function mlToGrams(ml: number, foodName: string): number {
  const density = getDensityForFood(foodName);
  return Math.round(ml * density);
}

/**
 * Convert grams to ml using density lookup
 */
export function gramsToMl(grams: number, foodName: string): number {
  const density = getDensityForFood(foodName);
  return Math.round(grams / density);
}
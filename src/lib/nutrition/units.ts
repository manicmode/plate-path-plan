// Unit conversions and food density mappings
export interface DensityData {
  density: number; // g/ml
  category: string[];
  notes?: string;
}

// Food densities (g/ml) for volume to weight conversion
export const FOOD_DENSITIES: Record<string, DensityData> = {
  'water': { density: 1.0, category: ['liquid', 'beverage'] },
  'milk': { density: 1.03, category: ['dairy', 'liquid'] },
  'oil': { density: 0.92, category: ['fat', 'cooking'] },
  'honey': { density: 1.42, category: ['sweetener'] },
  'flour': { density: 0.53, category: ['grain', 'baking'] },
  'sugar': { density: 0.85, category: ['sweetener'] },
  'butter': { density: 0.91, category: ['fat', 'dairy'] },
  'yogurt': { density: 1.15, category: ['dairy'] },
  'peanut_butter': { density: 0.95, category: ['nut', 'spread'] },
  'jam': { density: 1.3, category: ['spread', 'fruit'] },
  'rice': { density: 0.75, category: ['grain'] },
  'oats': { density: 0.41, category: ['grain', 'cereal'] }
};

// Volume unit conversions to ml
export const VOLUME_TO_ML: Record<string, number> = {
  'cup': 240,
  'cups': 240,
  'c': 240,
  'tbsp': 15,
  'tablespoon': 15,
  'tablespoons': 15,
  'tsp': 5,
  'teaspoon': 5,
  'teaspoons': 5,
  'ml': 1,
  'milliliter': 1,
  'milliliters': 1,
  'fl oz': 30,
  'fluid ounce': 30,
  'fluid ounces': 30,
  'l': 1000,
  'liter': 1000,
  'liters': 1000
};

export function getDensityForFood(foodName: string): number {
  const name = foodName.toLowerCase();
  
  // Direct match
  for (const [key, data] of Object.entries(FOOD_DENSITIES)) {
    if (name.includes(key)) {
      return data.density;
    }
  }
  
  // Category-based matching
  for (const [key, data] of Object.entries(FOOD_DENSITIES)) {
    for (const category of data.category) {
      if (name.includes(category)) {
        return data.density;
      }
    }
  }
  
  // Default to water density
  return 1.0;
}

export function mlToGrams(ml: number, foodName: string): number {
  const density = getDensityForFood(foodName);
  return Math.round(ml * density);
}

export function gramsToMl(grams: number, foodName: string): number {
  const density = getDensityForFood(foodName);
  return Math.round(grams / density);
}
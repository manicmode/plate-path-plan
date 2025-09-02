/**
 * Base Portion Defaults for v3
 * Provides default portions with min/max ranges for clamping
 */

interface BasePortion {
  grams: number;
  min: number;
  max: number;
}

// Base portions with reasonable ranges
const BASE_PORTIONS: Record<string, BasePortion> = {
  // Proteins
  'salmon': { grams: 160, min: 120, max: 240 },
  'chicken': { grams: 120, min: 90, max: 200 },
  'beef': { grams: 150, min: 100, max: 250 },
  'pork': { grams: 130, min: 100, max: 220 },
  'fish': { grams: 140, min: 100, max: 220 },
  'tuna': { grams: 130, min: 100, max: 200 },
  'cod': { grams: 140, min: 100, max: 200 },
  'shrimp': { grams: 100, min: 60, max: 180 },
  'egg': { grams: 50, min: 40, max: 70 },
  'tofu': { grams: 100, min: 60, max: 160 },
  
  // Vegetables
  'asparagus': { grams: 85, min: 60, max: 150 },
  'broccoli': { grams: 90, min: 60, max: 160 },
  'tomato': { grams: 80, min: 50, max: 150 },
  'carrot': { grams: 70, min: 40, max: 120 },
  'spinach': { grams: 60, min: 30, max: 120 },
  'lettuce': { grams: 50, min: 30, max: 100 },
  'cucumber': { grams: 60, min: 40, max: 120 },
  'pepper': { grams: 70, min: 40, max: 130 },
  'onion': { grams: 60, min: 30, max: 120 },
  'mushroom': { grams: 80, min: 50, max: 140 },
  
  // Salads and leafy
  'salad': { grams: 120, min: 60, max: 250 },
  'greens': { grams: 100, min: 50, max: 200 },
  'kale': { grams: 70, min: 40, max: 140 },
  'arugula': { grams: 60, min: 30, max: 120 },
  
  // Fruits
  'lemon': { grams: 30, min: 10, max: 60 },
  'lime': { grams: 25, min: 10, max: 50 },
  'apple': { grams: 180, min: 120, max: 280 },
  'banana': { grams: 120, min: 80, max: 180 },
  'orange': { grams: 150, min: 100, max: 220 },
  'avocado': { grams: 150, min: 100, max: 250 },
  'berry': { grams: 80, min: 40, max: 140 },
  'strawberry': { grams: 100, min: 60, max: 160 },
  
  // Grains and starches
  'rice': { grams: 150, min: 100, max: 250 },
  'pasta': { grams: 140, min: 100, max: 220 },
  'bread': { grams: 30, min: 20, max: 60 },
  'potato': { grams: 150, min: 100, max: 250 },
  'quinoa': { grams: 140, min: 100, max: 200 },
  
  // Dairy
  'cheese': { grams: 30, min: 15, max: 60 },
  'yogurt': { grams: 120, min: 80, max: 200 },
  'milk': { grams: 250, min: 150, max: 400 },
  'butter': { grams: 10, min: 5, max: 20 },
  
  // Condiments and sauces
  'ketchup': { grams: 15, min: 5, max: 30 },
  'mayo': { grams: 15, min: 5, max: 30 },
  'mustard': { grams: 10, min: 5, max: 25 },
  'sauce': { grams: 20, min: 10, max: 40 },
  'dressing': { grams: 25, min: 10, max: 50 },
  'oil': { grams: 10, min: 5, max: 25 },
  
  // Nuts and seeds
  'nuts': { grams: 30, min: 15, max: 60 },
  'almonds': { grams: 25, min: 15, max: 50 },
  'seeds': { grams: 20, min: 10, max: 40 }
};

// Category fallbacks for items not in the specific list
const CATEGORY_DEFAULTS: Record<string, BasePortion> = {
  'protein': { grams: 120, min: 80, max: 200 },
  'vegetable': { grams: 80, min: 50, max: 150 },
  'fruit': { grams: 100, min: 60, max: 180 },
  'grain': { grams: 150, min: 100, max: 250 },
  'dairy': { grams: 100, min: 60, max: 180 },
  'fat_oil': { grams: 15, min: 8, max: 30 },
  'sauce_condiment': { grams: 15, min: 5, max: 30 }
};

export function basePortionFor(name: string, category?: string): BasePortion {
  const lowerName = name.toLowerCase();
  
  // Check specific food first
  if (BASE_PORTIONS[lowerName]) {
    return BASE_PORTIONS[lowerName];
  }
  
  // Check category fallback
  if (category && CATEGORY_DEFAULTS[category]) {
    return CATEGORY_DEFAULTS[category];
  }
  
  // Ultimate fallback
  return { grams: 100, min: 50, max: 200 };
}

// Clamp grams to base portion range
export function clampToRange(grams: number, base: BasePortion): number {
  return Math.max(base.min, Math.min(base.max, grams));
}
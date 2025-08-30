/**
 * Category-based unit mappings for common serving sizes
 * Maps food categories to typical unit conversions
 */

export interface UnitConversion {
  unit: string;
  grams: number;
  ml?: number;
  notes?: string;
}

export interface CategoryUnits {
  category: string;
  keywords: string[];
  units: UnitConversion[];
  defaultGrams: number;
}

export const CATEGORY_UNITS: CategoryUnits[] = [
  {
    category: 'cereals',
    keywords: ['cereal', 'flakes', 'granola', 'muesli', 'oats'],
    defaultGrams: 30,
    units: [
      { unit: 'cup', grams: 30, notes: 'typical bowl serving' },
      { unit: 'tbsp', grams: 8 },
      { unit: 'handful', grams: 25 }
    ]
  },
  {
    category: 'beverages',
    keywords: ['juice', 'milk', 'drink', 'soda', 'water', 'tea', 'coffee'],
    defaultGrams: 240,
    units: [
      { unit: 'cup', grams: 240, ml: 240 },
      { unit: 'glass', grams: 200, ml: 200 },
      { unit: 'bottle', grams: 500, ml: 500 },
      { unit: 'can', grams: 355, ml: 355 },
      { unit: 'tbsp', grams: 15, ml: 15 }
    ]
  },
  {
    category: 'yogurt',
    keywords: ['yogurt', 'yoghurt'],
    defaultGrams: 150,
    units: [
      { unit: 'cup', grams: 245 },
      { unit: 'container', grams: 150, notes: 'single serve' },
      { unit: 'tbsp', grams: 15 }
    ]
  },
  {
    category: 'rice',
    keywords: ['rice', 'quinoa', 'grain'],
    defaultGrams: 150,
    units: [
      { unit: 'cup', grams: 150, notes: 'cooked' },
      { unit: 'cup (uncooked)', grams: 185 },
      { unit: 'serving', grams: 150 }
    ]
  },
  {
    category: 'pasta',
    keywords: ['pasta', 'noodles', 'spaghetti', 'macaroni'],
    defaultGrams: 100,
    units: [
      { unit: 'cup', grams: 140, notes: 'cooked' },
      { unit: 'serving', grams: 100, notes: 'dry weight' }
    ]
  },
  {
    category: 'nuts',
    keywords: ['nuts', 'almonds', 'walnuts', 'peanuts', 'cashews'],
    defaultGrams: 30,
    units: [
      { unit: 'handful', grams: 30 },
      { unit: 'cup', grams: 120 },
      { unit: 'tbsp', grams: 10 }
    ]
  },
  {
    category: 'spreads',
    keywords: ['butter', 'peanut butter', 'jam', 'nutella', 'spread'],
    defaultGrams: 15,
    units: [
      { unit: 'tbsp', grams: 15 },
      { unit: 'tsp', grams: 5 },
      { unit: 'pat', grams: 5, notes: 'butter pat' }
    ]
  },
  {
    category: 'fruits',
    keywords: ['apple', 'banana', 'orange', 'fruit', 'berries'],
    defaultGrams: 150,
    units: [
      { unit: 'piece', grams: 150, notes: 'medium fruit' },
      { unit: 'cup', grams: 150, notes: 'chopped' },
      { unit: 'handful', grams: 80, notes: 'berries' }
    ]
  },
  {
    category: 'vegetables',
    keywords: ['vegetables', 'salad', 'greens', 'carrots', 'broccoli'],
    defaultGrams: 80,
    units: [
      { unit: 'cup', grams: 80, notes: 'chopped' },
      { unit: 'serving', grams: 80 },
      { unit: 'handful', grams: 30, notes: 'leafy greens' }
    ]
  },
  {
    category: 'snacks',
    keywords: ['chips', 'crackers', 'cookies', 'biscuits'],
    defaultGrams: 25,
    units: [
      { unit: 'pack', grams: 25, notes: 'single serve' },
      { unit: 'handful', grams: 20 },
      { unit: 'piece', grams: 10, notes: 'cookie/cracker' }
    ]
  },
  {
    category: 'condiments',
    keywords: ['sauce', 'dressing', 'ketchup', 'mustard', 'mayo'],
    defaultGrams: 15,
    units: [
      { unit: 'tbsp', grams: 15 },
      { unit: 'tsp', grams: 5 },
      { unit: 'packet', grams: 10, notes: 'single serve' }
    ]
  }
];

/**
 * Get appropriate units for a food item
 */
export function getUnitsForFood(foodName: string): CategoryUnits | null {
  const name = foodName.toLowerCase();
  
  for (const category of CATEGORY_UNITS) {
    for (const keyword of category.keywords) {
      if (name.includes(keyword)) {
        return category;
      }
    }
  }
  
  return null;
}

/**
 * Convert unit to grams for a specific food
 */
export function convertUnitToGrams(amount: number, unit: string, foodName: string): number | null {
  const categoryUnits = getUnitsForFood(foodName);
  
  if (!categoryUnits) return null;
  
  const unitLower = unit.toLowerCase();
  const unitConversion = categoryUnits.units.find(u => 
    u.unit.toLowerCase() === unitLower ||
    u.unit.toLowerCase().includes(unitLower) ||
    unitLower.includes(u.unit.toLowerCase())
  );
  
  if (unitConversion) {
    return Math.round(amount * unitConversion.grams);
  }
  
  return null;
}

/**
 * Get typical serving size for a food category
 */
export function getTypicalServingSize(foodName: string): number {
  const categoryUnits = getUnitsForFood(foodName);
  return categoryUnits?.defaultGrams || 30;
}
/**
 * Food classification system for health scoring
 * Distinguishes between whole foods and packaged foods for appropriate scoring curves
 */

export type FoodKind = 'whole_food' | 'packaged' | 'ambiguous';

export interface FoodClassificationInput {
  source?: 'barcode' | 'db' | 'photo_item' | 'manual' | 'voice';
  genericSlug?: string | null;
  brand?: string | null;
  upc?: string | null;
  ingredients?: string | null;
  categories?: string[] | null; // (e.g., from OpenFoodFacts)
  name?: string;
}

export function classifyFoodKind(input: FoodClassificationInput): FoodKind {
  // UPC or non-empty ingredients list → likely packaged
  if (input.upc || (input.ingredients && input.ingredients.trim().length > 0)) {
    return 'packaged';
  }

  // If we matched Generic Foods DB, prefer whole_food unless the slug is clearly processed
  const processedTerms = [
    'granola', 'bread', 'cheese', 'yogurt', 'bar', 'cereal', 'cookie', 
    'cracker', 'juice', 'soda', 'chips', 'sauce', 'dressing', 'pasta',
    'pizza', 'burger', 'sandwich', 'cake', 'pie', 'ice cream', 'candy'
  ];
  
  if (input.genericSlug) {
    const slug = input.genericSlug.toLowerCase();
    if (processedTerms.some(t => slug.includes(t))) {
      return 'packaged';
    }
    return 'whole_food';
  }

  // Heuristics on name/categories for whole foods
  const n = (input.name || '').toLowerCase();
  const wholeHints = [
    // Vegetables
    'asparagus', 'tomato', 'broccoli', 'spinach', 'kale', 'carrot', 'pepper',
    'onion', 'garlic', 'cucumber', 'lettuce', 'cabbage', 'zucchini',
    // Fruits
    'lemon', 'apple', 'banana', 'orange', 'berry', 'grape', 'peach', 'pear',
    'mango', 'pineapple', 'avocado', 'lime', 'cherry', 'plum',
    // Proteins
    'salmon', 'chicken breast', 'beef', 'pork', 'fish', 'egg', 'turkey',
    'lamb', 'tuna', 'cod', 'shrimp', 'crab',
    // Nuts & seeds
    'almond', 'walnut', 'cashew', 'peanut', 'pecan', 'pistachio',
    'sunflower seed', 'pumpkin seed', 'chia seed', 'flax seed',
    // Grains (whole)
    'quinoa', 'brown rice', 'wild rice', 'oat', 'barley', 'buckwheat',
    // Legumes
    'bean', 'lentil', 'chickpea', 'pea'
  ];
  
  if (wholeHints.some(h => n.includes(h))) {
    return 'whole_food';
  }

  // Check categories for packaged food indicators
  if (input.categories) {
    const packaged = input.categories.some(cat => 
      cat.toLowerCase().includes('packaged') ||
      cat.toLowerCase().includes('processed') ||
      cat.toLowerCase().includes('snack') ||
      cat.toLowerCase().includes('beverage')
    );
    if (packaged) return 'packaged';
  }

  return 'ambiguous';
}
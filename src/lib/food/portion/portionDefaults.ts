/**
 * Realistic portion defaults by food class
 * Replaces the generic 100g fallback with sensible defaults
 */

export const PORTION_DEFAULTS = {
  hot_dog_link:   { unit: 'link',  grams: 50 },
  pizza_slice:    { unit: 'slice', grams: 125 },
  teriyaki_bowl:  { unit: 'bowl',  grams: 350 },
  rice_cooked:    { unit: 'cup',   grams: 158 },
  mixed_veg:      { unit: 'cup',   grams: 90 },
  egg_large:      { unit: 'egg',   grams: 50 },
  oatmeal_cooked: { unit: 'cup',   grams: 234 },
  california_roll:{ unit: 'roll',  grams: 170 },
  chicken_breast: { unit: 'piece', grams: 113 },
  burger_patty:   { unit: 'patty', grams: 113 },
  sandwich_whole: { unit: 'sandwich', grams: 150 },
  salad_serving:  { unit: 'serving', grams: 200 },
  soup_bowl:      { unit: 'bowl',  grams: 240 },
  pasta_cooked:   { unit: 'cup',   grams: 140 },
  bread_slice:    { unit: 'slice', grams: 25 },
  taco_shell:     { unit: 'taco',  grams: 75 },
  burrito_whole:  { unit: 'burrito', grams: 200 },
  club_sandwich:  { unit: 'sandwich', grams: 150 }, // Add club sandwich
} as const;

export type PortionClass = keyof typeof PORTION_DEFAULTS;

/**
 * Maps food names/categories to portion classes
 */
export const FOOD_CLASS_MAP: Record<string, PortionClass> = {
  // Hot dogs
  'hot dog': 'hot_dog_link',
  'hotdog': 'hot_dog_link',
  'frankfurter': 'hot_dog_link',
  'wiener': 'hot_dog_link',
  
  // Pizza
  'pizza slice': 'pizza_slice',
  'pizza': 'pizza_slice',
  'margherita': 'pizza_slice',
  'pepperoni pizza': 'pizza_slice',
  'hawaii pizza': 'pizza_slice',
  'hawaiian pizza': 'pizza_slice',
  
  // Bowls
  'teriyaki bowl': 'teriyaki_bowl',
  'chicken teriyaki': 'teriyaki_bowl',
  'rice bowl': 'teriyaki_bowl',
  'poke bowl': 'teriyaki_bowl',
  
  // Rice
  'white rice': 'rice_cooked',
  'brown rice': 'rice_cooked',
  'steamed rice': 'rice_cooked',
  'jasmine rice': 'rice_cooked',
  'basmati rice': 'rice_cooked',
  
  // Vegetables
  'mixed vegetables': 'mixed_veg',
  'steamed vegetables': 'mixed_veg',
  'vegetable medley': 'mixed_veg',
  
  // Eggs
  'egg': 'egg_large',
  'large egg': 'egg_large',
  'chicken egg': 'egg_large',
  
  // Oatmeal
  'oatmeal': 'oatmeal_cooked',
  'rolled oats': 'oatmeal_cooked',
  'steel cut oats': 'oatmeal_cooked',
  'porridge': 'oatmeal_cooked',
  
  // Sushi
  'california roll': 'california_roll',
  'sushi roll': 'california_roll',
  'maki roll': 'california_roll',
  
  // Chicken
  'grilled chicken': 'chicken_breast',
  'chicken breast': 'chicken_breast',
  'chicken fillet': 'chicken_breast',
  'teriyaki chicken': 'chicken_breast',
  
  // Burgers
  'hamburger': 'burger_patty',
  'cheeseburger': 'burger_patty',
  'beef burger': 'burger_patty',
  
  // Sandwiches
  'sandwich': 'sandwich_whole',
  'club sandwich': 'club_sandwich', // Use specific club_sandwich
  'deli sandwich': 'sandwich_whole',
  
  // Salads
  'salad': 'salad_serving',
  'green salad': 'salad_serving',
  'caesar salad': 'salad_serving',
  'mixed greens': 'salad_serving',
  
  // Soups
  'soup': 'soup_bowl',
  'chicken soup': 'soup_bowl',
  'vegetable soup': 'soup_bowl',
  'tomato soup': 'soup_bowl',
  
  // Pasta
  'pasta': 'pasta_cooked',
  'spaghetti': 'pasta_cooked',
  'penne': 'pasta_cooked',
  'fusilli': 'pasta_cooked',
  
  // Bread
  'bread': 'bread_slice',
  'white bread': 'bread_slice',
  'wheat bread': 'bread_slice',
  
  // Tacos
  'taco': 'taco_shell',
  'beef taco': 'taco_shell',
  'chicken taco': 'taco_shell',
  
  // Burritos
  'burrito': 'burrito_whole',
  'chicken burrito': 'burrito_whole',
  'beef burrito': 'burrito_whole',
};

/**
 * Size multipliers for small/regular/large portions
 */
export const SIZE_MULTIPLIERS = {
  small: 0.75,
  regular: 1.0,
  large: 1.5,
  'extra large': 2.0,
  xl: 2.0,
  mini: 0.5,
  jumbo: 2.5,
} as const;

/**
 * Maps class ID to generic canonical nutrition key
 */
export const CLASS_TO_GENERIC_SLUG: Record<string, string> = {
  hot_dog_link: 'generic.hot_dog',
  pizza_slice: 'generic.pizza_slice',
  teriyaki_bowl: 'generic.teriyaki_bowl',
  california_roll: 'generic.california_roll', 
  rice_cooked: 'generic.white_rice_cooked',
  egg_large: 'generic.egg_large',
  oatmeal_cooked: 'generic.oatmeal_dry',
  club_sandwich: 'generic.club_sandwich' // Add club sandwich mapping
};

/**
 * Default portion definitions for specific foods
 */
export interface PortionDef {
  label: string;
  grams: number;
  source: 'inferred' | 'provider' | 'vault';
}

export const CLUB_SANDWICH_PORTIONS: PortionDef[] = [
  { label: '1 sandwich', grams: 150, source: 'inferred' },
  { label: '1/2 sandwich', grams: 75, source: 'inferred' },
  { label: '2 sandwiches', grams: 300, source: 'inferred' }
];

export function getDefaultPortions(item: any): PortionDef[] {
  // Only apply to club sandwich with this exact logic
  if (item.classId === 'club_sandwich' || /\bclub\s+sand(wich)?\b/i.test(item.name)) {
    // Only use defaults if no provider/vault portion exists
    if (!item.portionDefs || item.portionDefs.length === 0) {
      return CLUB_SANDWICH_PORTIONS;
    }
  }
  
  return [];
}
/**
 * Canonical nutrition mapping for common generic food items
 * Maps core nouns to standardized nutrition keys
 */

export type CanonicalKey =
  | 'generic_hot_dog'
  | 'generic_pizza_slice'
  | 'generic_teriyaki_chicken_bowl'
  | 'generic_california_roll'
  | 'generic_white_rice_cooked'
  | 'generic_egg_large'
  | 'generic_oatmeal_dry'
  | 'generic_chicken_grilled'
  | 'generic_salmon_grilled'
  | 'generic_pasta_cooked'
  | 'generic_bread_slice'
  | 'generic_banana'
  | 'generic_apple'
  | 'generic_milk_whole'
  | 'generic_yogurt_plain';

export const CANONICAL_BY_CORE_NOUN: Record<string, CanonicalKey> = {
  'hot_dog': 'generic_hot_dog',
  'hotdog': 'generic_hot_dog',
  'pizza': 'generic_pizza_slice',
  'hawaii_pizza': 'generic_pizza_slice',
  'hawaiian_pizza': 'generic_pizza_slice',
  'teriyaki_bowl': 'generic_teriyaki_chicken_bowl',
  'teriyaki_chicken': 'generic_teriyaki_chicken_bowl',
  'california_roll': 'generic_california_roll',
  'sushi_roll': 'generic_california_roll',
  'rice_cooked': 'generic_white_rice_cooked',
  'rice': 'generic_white_rice_cooked',
  'egg': 'generic_egg_large',
  'eggs': 'generic_egg_large',
  'oatmeal': 'generic_oatmeal_dry',
  'chicken_grilled': 'generic_chicken_grilled',
  'grilled_chicken': 'generic_chicken_grilled',
  'salmon_grilled': 'generic_salmon_grilled',
  'grilled_salmon': 'generic_salmon_grilled',
  'pasta': 'generic_pasta_cooked',
  'bread': 'generic_bread_slice',
  'banana': 'generic_banana',
  'apple': 'generic_apple',
  'milk': 'generic_milk_whole',
  'yogurt': 'generic_yogurt_plain'
};

/**
 * Get canonical nutrition key for a core noun with optional facet context
 */
export function canonicalFor(coreNoun: string, facets?: Record<string, any>): CanonicalKey | null {
  if (!coreNoun) return null;
  
  // Simple mapping first; can grow smarter with facets later
  const normalized = coreNoun.toLowerCase().replace(/[^a-z_]/g, '_');
  return CANONICAL_BY_CORE_NOUN[normalized] ?? null;
}

/**
 * Check if a canonical key exists in our mapping
 */
export function isCanonicalKey(key: string): key is CanonicalKey {
  return Object.values(CANONICAL_BY_CORE_NOUN).includes(key as CanonicalKey);
}
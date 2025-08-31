export type Category = 'cereal_granola'|'cereal'|'chips'|'nuts'|'candy'|'yogurt'|'unknown';

// Brand detection patterns - never treat these as categories
const BRAND_PATTERNS = /\b(trader joe'?s|kirkland|great value|whole foods|aldi|costco|target|publix|wegmans|kroger)\b/i;

export function isBrand(text?: string | null): boolean {
  if (!text) return false;
  return BRAND_PATTERNS.test(text);
}

export function inferCategory(input: { title?: string | null, ingredients?: string | null }): Category {
  const text = `${input.title || ''} ${input.ingredients || ''}`.toLowerCase();
  
  // Skip if it's a brand name
  if (isBrand(text)) {
    console.log('[PORTION][CATEGORY] Skipped brand as category:', text.match(BRAND_PATTERNS)?.[0]);
    return 'unknown';
  }
  
  // Category heuristics
  if (/(granola|rolled oats|oat clusters|cereal)/.test(text)) return 'cereal_granola';
  if (/(chips|crisps)/.test(text)) return 'chips';
  if (/(nuts|almonds|cashews|peanuts)/.test(text)) return 'nuts';
  if (/(yogurt|yoghurt)/.test(text)) return 'yogurt';
  if (/(candy|chocolate|sweet)/.test(text)) return 'candy';
  
  console.log('[PORTION][CATEGORY] No specific category matched, using unknown');
  return 'unknown';
}

export default inferCategory;
// Shared filtering logic for both LYF v1 and ensemble detection

export const GENERIC_NEG = [
  'recipe', 'cooking', 'cooked dish', 'dish', 'plate', 'tableware', 'utensil',
  'cutlery', 'spoon', 'fork', 'knife', 'napkin', 'garnish', 'logo', 'brand', 'package',
  'bottle', 'jar', 'glass', 'can', 'office', 'microsoft', 'text', 'watermark', 'brand mark',
  'bowl', 'cup', 'mug', 'container', 'packaging', 'wrapper', 'label'
];

// Vegetable/fruit keywords that should have lower thresholds
export const VEG_FRUIT_KEYWORDS = [
  'asparagus', 'tomato', 'cherry tomato', 'grape tomato', 'lemon', 'lemon slice', 
  'lemon wedge', 'lime', 'lime wedge', 'broccoli', 'cauliflower', 'carrot', 
  'cucumber', 'bell pepper', 'lettuce', 'spinach', 'kale'
];

// Hard junk filter - only obvious non-food items
const JUNK_REGEX = new RegExp(
  '\\b(' + GENERIC_NEG.join('|') + ')\\b', 
  'i'
);

// Positive allowlist - never filter these food terms
const FOOD_ALLOWLIST = /\b(salmon|trout|tuna|chicken|beef|pork|egg|omelet|asparagus|broccoli|cauliflower|carrot|cucumber|bell\s*pepper|tomato|cherry\s*tomato|grape\s*tomato|lettuce|spinach|kale|lemon|lemon\s*slice|lemon\s*wedge|lime|lime\s*wedge|rice|pasta|noodles|bread|bun|tortilla|pita|quinoa|couscous|beans|lentils|chickpeas|tofu|tempeh|cheese|yogurt)\b/i;

export function looksFoodish(s: string): boolean {
  const t = (s||'').toLowerCase().trim();
  
  // Too short
  if (t.length <= 2) return false;
  
  // Always allow items in food allowlist
  if (FOOD_ALLOWLIST.test(t)) return true;
  
  // Filter out obvious junk
  return !JUNK_REGEX.test(t);
}

export function isVegFruit(name: string): boolean {
  const normalized = name.toLowerCase().trim();
  return VEG_FRUIT_KEYWORDS.some(keyword => 
    normalized.includes(keyword) || keyword.includes(normalized)
  );
}

// Rank source priority for deduplication
export function rankSource(a: any, b: any): number {
  const w = (s: string) => s === 'object' ? 2 : 1;
  return (w(b.source || 'label') - w(a.source || 'label')) || ((b.confidence || 0) - (a.confidence || 0));
}
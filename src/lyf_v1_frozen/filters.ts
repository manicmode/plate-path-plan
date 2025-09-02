// Hard junk filter - drop always
const NEG = /\b(?:recipe|cuisine|cooking|garnish|dishware|plate|cutlery|fork|spoon|logo|brand|text|tableware|bowl|knife|utensil|napkin|package|pack|sleeve|box|label)\b/i;

// Veg/fruit allowlist - always allow these with lower threshold
export const ALWAYS_ALLOW = new Set([
  'salmon', 'fish', 'asparagus', 'tomato', 'cherry tomato', 'cherry tomatoes', 
  'grape tomato', 'lemon', 'lemon slice', 'lemon wedge', 'lime', 'lime wedge', 
  'dill', 'parsley', 'cilantro', 'herb'
]);

// Label minimum score
const LABEL_MIN_SCORE = 0.45;

export function looksFoodish(name: string, source?: string, confidence?: number): boolean {
  const n = name.toLowerCase();
  
  // Fast allowlist override for specific foods - always allow these
  if (ALWAYS_ALLOW.has(n) || Array.from(ALWAYS_ALLOW).some(food => n.includes(food))) {
    return true;
  }
  
  // Always drop junk
  if (NEG.test(n)) return false;
  
  // For labels, check minimum confidence scores (relaxed for veg/fruit)
  if (source === 'label' && typeof confidence === 'number') {
    const isVegFruit = /(asparagus|tomato|lemon|lime|broccoli|cauliflower|carrot|cucumber|pepper|lettuce|spinach|kale|herb|dill|parsley)/i.test(n);
    const minScore = isVegFruit ? 0.25 : LABEL_MIN_SCORE; // Very relaxed for vegetables
    if (confidence < minScore) return false;
  }
  
  // Default heuristic for other terms - broader coverage
  return /\b(?:salmon|fish|seafood|beef|chicken|poultry|egg|rice|pasta|bread|vegetable|fruit|tomato|lemon|asparagus|broccoli|potato|herb|spice|dill|parsley|cilantro|green)\b/i.test(n);
}

export function rankSource(a: any, b: any): number {
  const w = (s: string) => s === 'object' ? 2 : 1;
  return (w(b.source || 'label') - w(a.source || 'label')) || ((b.confidence || 0) - (a.confidence || 0));
}
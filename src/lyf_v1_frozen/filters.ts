// Hard junk filter - drop always
const NEG = /\b(?:recipe|cuisine|cooking|garnish|dishware|plate|cutlery|fork|spoon|logo|brand|text|tableware|bowl|knife|utensil|napkin|package|pack|sleeve|box|label)\b/i;

// Veg/fruit allowlist - always allow these with lower threshold  
export const ALWAYS_ALLOW = new Set([
  'salmon', 'fish', 'asparagus', 'tomato', 'cherry tomato', 'cherry tomatoes', 
  'grape tomato', 'lemon', 'lemon slice', 'lemon wedge', 'lime', 'lime wedge', 
  'dill', 'parsley', 'cilantro', 'herb', 'broccoli', 'carrot', 'spinach', 'lettuce', 'cucumber'
]);

// Keep vegetables with lower threshold
const KEEP_LABELS_IF_MATCH = /^(asparagus|tomato|cherry tomato|grape tomato|lemon|lemon wedge|lemon slice|dill|parsley|cilantro|herb|broccoli|carrot|spinach|lettuce|cucumber)$/i;

// Always keep these regardless of confidence
const ALWAYS_KEEP = new Set(['asparagus','tomato','cherry tomato','lemon','dill','parsley','cilantro','herb','broccoli','carrot','spinach','lettuce','cucumber']);

// Label minimum score
const LABEL_MIN_SCORE = 0.45;

// Lenient label filtering - allowlist veggies/fruits with 0.25 threshold
export function looksFoodishLabel(name: string, confidence?: number): boolean {
  const n = name.toLowerCase();
  
  // Always keep allowlisted items
  if (ALWAYS_KEEP.has(n)) return true;
  
  // Always drop junk - never keep these
  if (NEG.test(n)) return false;
  
  // Use lower threshold (0.25) for vegetables matching KEEP_LABELS_IF_MATCH
  if (KEEP_LABELS_IF_MATCH.test(n)) {
    return !confidence || confidence >= 0.25;
  }
  
  // Standard threshold for other labels
  const minScore = confidence ? (confidence >= LABEL_MIN_SCORE) : true;
  if (!minScore) return false;
  
  // Broad food pattern match
  return /\b(?:salmon|fish|seafood|beef|chicken|poultry|egg|rice|pasta|bread|vegetable|fruit|tomato|lemon|asparagus|broccoli|potato|herb|spice|dill|parsley|cilantro|green)\b/i.test(n);
}

// Standard object filtering
export function looksFoodishObj(name: string, confidence?: number): boolean {
  const n = name.toLowerCase();
  
  // Fast allowlist override for specific foods
  if (ALWAYS_ALLOW.has(n) || Array.from(ALWAYS_ALLOW).some(food => n.includes(food))) {
    return true;
  }
  
  // Always drop junk
  if (NEG.test(n)) return false;
  
  // Default heuristic for objects
  return /\b(?:salmon|fish|seafood|beef|chicken|poultry|egg|rice|pasta|bread|vegetable|fruit|tomato|lemon|asparagus|broccoli|potato|herb|spice|dill|parsley|cilantro|green)\b/i.test(n);
}

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

export const VEG_LABELS = /^(asparagus|tomato|cherry tomato|grape tomato|lemon|lemon slice|lemon wedge|dill)$/i;

export function rankSource(a: any, b: any): number {
  const w = (s: string) => s === 'object' ? 2 : 1;
  return (w(b.source || 'label') - w(a.source || 'label')) || ((b.confidence || 0) - (a.confidence || 0));
}
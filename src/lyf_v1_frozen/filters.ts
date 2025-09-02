// Hard junk filter - drop always
const NEG = /\b(?:recipe|cuisine|cooking|garnish|tableware|dishware|plate|bowl|spoon|fork|knife|utensil|napkin|logo|brand|package|pack|sleeve|box|label)\b/i;

// Strong food allowlist - survives even if low-score
const ALLOW = /\b(?:salmon|asparagus|tomato|tomatoes|cherry tomato|lemon|lemon slice|lemon wedge)\b/i;

export function looksFoodish(name: string): boolean {
  const n = name.toLowerCase();
  
  // Always allow strong food terms
  if (ALLOW.test(n)) return true;
  
  // Always drop junk
  if (NEG.test(n)) return false;
  
  // Default heuristic for other terms
  return /\b(?:salmon|fish|beef|chicken|egg|rice|pasta|bread|vegetable|fruit|tomato|lemon|asparagus)\b/i.test(n);
}

export function rankSource(a: any, b: any): number {
  const w = (s: string) => s === 'object' ? 2 : 1;
  return (w(b.source || 'label') - w(a.source || 'label')) || ((b.confidence || 0) - (a.confidence || 0));
}
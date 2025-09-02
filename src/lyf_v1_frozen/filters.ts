// Hard junk filter - drop always
const NEG = /\b(?:recipe|cuisine|cooking|garnish|dishware|plate|cutlery|fork|spoon|logo|brand|text|tableware|bowl|knife|utensil|napkin|package|pack|sleeve|box|label)\b/i;

// Label minimum score
const LABEL_MIN_SCORE = 0.45;

export function looksFoodish(name: string, source?: string, confidence?: number): boolean {
  const n = name.toLowerCase();
  
  // Fast allowlist override for specific foods
  if (/(salmon|asparagus|tomato|cherry tomato|lemon)/i.test(n)) return true;
  
  // Always drop junk
  if (NEG.test(n)) return false;
  
  // For labels, check minimum confidence scores
  if (source === 'label' && typeof confidence === 'number') {
    if (confidence < LABEL_MIN_SCORE) return false;
  }
  
  // Default heuristic for other terms
  return /\b(?:salmon|fish|beef|chicken|egg|rice|pasta|bread|vegetable|fruit|tomato|lemon|asparagus|broccoli|potato)\b/i.test(n);
}

export function rankSource(a: any, b: any): number {
  const w = (s: string) => s === 'object' ? 2 : 1;
  return (w(b.source || 'label') - w(a.source || 'label')) || ((b.confidence || 0) - (a.confidence || 0));
}
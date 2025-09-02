// Hard junk filter - only obvious non-food items
const JUNK = /\b(plate|dish|bowl|cutlery|fork|spoon|knife|napkin|logo|brand|pack|sleeve|kit|box|package|message|screen|monitor|tableware|watermark|brand\s*mark)\b/i;

// Positive allowlist - never filter these food terms
const FOOD_ALLOWLIST = /\b(salmon|trout|tuna|chicken|beef|pork|egg|omelet|asparagus|broccoli|cauliflower|carrot|cucumber|bell\s*pepper|tomato|cherry\s*tomato|grape\s*tomato|lettuce|spinach|kale|lemon|lemon\s*slice|lemon\s*wedge|lime|lime\s*wedge|rice|pasta|noodles|bread|bun|tortilla|pita|quinoa|couscous|beans|lentils|chickpeas|tofu|tempeh|cheese|yogurt)\b/i;

export function looksFoodish(s: string) {
  const t = (s||'').toLowerCase().trim();
  
  // Too short
  if (t.length <= 2) return false;
  
  // Always allow items in food allowlist
  if (FOOD_ALLOWLIST.test(t)) return true;
  
  // Filter out obvious junk
  return !JUNK.test(t);
}
export function rankSource(a: any, b: any) {
  const w = (s: string) => s==='object' ? 2 : 1;
  return (w(b.source||'label') - w(a.source||'label')) || ((b.confidence||0) - (a.confidence||0));
}
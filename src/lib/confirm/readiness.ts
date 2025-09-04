export function perGramSum(pg: Record<string, number> | undefined): number {
  if (!pg) return 0;
  return Object.values(pg).reduce((a, v) => a + (Number(v) || 0), 0);
}

// "Good enough" to show the card:
// - we have any macronutrient OR calories perGram
// - and we have a health score computed
export function isNutritionReady(
  pg: Record<string, number> | undefined,
  healthScore?: number
): boolean {
  if (!pg) return false;
  const keys = Object.keys(pg);
  const hasAnyMacro = ['protein', 'carbs', 'fat', 'calories'].some(k => keys.includes(k));
  const hasValues = perGramSum(pg) > 0;
  const hasHealth = typeof healthScore === 'number';
  return hasAnyMacro && hasValues && hasHealth;
}
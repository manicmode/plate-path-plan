export const MACROS = ['calories','protein','carbs','fat','sugar','fiber','sodium'] as const;

export function perGramSum(pg?: Record<string, any>) {
  if (!pg) return 0;
  return MACROS.reduce((a,k)=>a + (Number(pg[k]) || 0), 0);
}

// Treat "all zeros" or missing as NOT hydrated.
export function needsHydration(item: any) {
  const pg = item?.nutrition?.perGram;
  return !pg || perGramSum(pg) <= 0;
}

// Recompute nutrition from per-gram basis
export function recompute(item: any, grams: number) {
  const pg = item?.nutrition?.perGram || {};
  const out: any = {};
  MACROS.forEach(k => {
    const v = Number(pg[k] || 0);
    out[k] = +(v * grams).toFixed(k === 'calories' ? 0 : 1);
  });
  return out;
}
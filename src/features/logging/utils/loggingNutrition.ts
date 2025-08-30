// Null-safe numeric coercion
export function asNum(x: any): number | null {
  if (typeof x === 'number' && isFinite(x)) return x;
  if (typeof x === 'string') {
    const v = +x.trim();
    if (!Number.isNaN(v) && isFinite(v)) return v;
  }
  return null;
}

// Prefer kcal-style fields if calories missing
function extractCalories(n: any): number | null {
  return asNum(
    n?.calories ??
    n?.energy_kcal ??
    n?.energyKcal ??
    n?.['energy-kcal'] ??
    n?.['energy-kcal_100g'] ??
    n?.['energy-kcal_serving']
  );
}

export function normalizeNutrition(raw: any) {
  const n = raw?.nutrition ?? raw?.nutrients ?? raw?.nutriments ?? {};
  const sodiumFromSalt =
    n?.salt_100g != null ? asNum(n.salt_100g) !== null ? (asNum(n.salt_100g)! * 400) : null : null;

  return {
    calories:  extractCalories(n),
    protein_g: asNum(n?.protein ?? n?.protein_100g),
    carbs_g:   asNum(n?.carbohydrates ?? n?.carbohydrates_100g ?? n?.carbs),
    fat_g:     asNum(n?.fat ?? n?.fat_100g),
    sodium_mg: asNum(n?.sodium ?? n?.sodium_100g) ?? sodiumFromSalt,
  };
}

export function mapLookupToLoggedFood(res: any) {
  // support varied shapes from different providers
  const G = res?.product ?? res?.data ?? res ?? {};
  const nutrition = normalizeNutrition(G);

  return {
    barcode: G?.barcode ?? G?.code ?? null,
    name:    G?.name ?? G?.product_name ?? G?.title ?? 'Unknown Product',
    brand:   G?.brand ?? G?.brands ?? null,  
    nutrition,
    hasNutrition: Object.values(nutrition).some(v => v != null),
    raw: G, // keep for debugging/telemetry if needed
  };
}
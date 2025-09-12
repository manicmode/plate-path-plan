export type PerGram = { 
  calories?: number;
  proteinG?: number; 
  carbsG?: number; 
  fatG?: number; 
  fiberG?: number;
  sugarG?: number;
  sodiumMg?: number;
  [k: string]: number | undefined;
};

export type Per100 = PerGram;

/**
 * Unified nutrition scaling helper - grams-first approach
 * Handles per-gram, per-100g, and per-portion bases consistently
 */
export function computeEffectiveNutrition({
  basePerGram,
  basePer100,
  servingG,
}: { 
  basePerGram?: PerGram | null; 
  basePer100?: Per100 | null; 
  servingG: number;
}) {
  const g = Math.max(1, Math.round(servingG || 1));
  
  const fromPerGram = (base: PerGram) => 
    Object.fromEntries(
      Object.entries(base).map(([k, v]) => [k, Math.round((v || 0) * g)])
    );
    
  const fromPer100 = (base: Per100) => 
    Object.fromEntries(
      Object.entries(base).map(([k, v]) => [k, Math.round((v || 0) * (g / 100))])
    );
  
  // Prefer per-gram data when available
  if (basePerGram && Object.keys(basePerGram).length > 0) {
    return {
      ...fromPerGram(basePerGram),
      servingGrams: g,
      scalingBasis: 'per-gram' as const
    };
  }
  
  // Fall back to per-100g scaling
  if (basePer100 && Object.keys(basePer100).length > 0) {
    return {
      ...fromPer100(basePer100),
      servingGrams: g,
      scalingBasis: 'per-100g' as const
    };
  }
  
  // No scaling data available
  return {
    servingGrams: g,
    scalingBasis: 'none' as const
  };
}
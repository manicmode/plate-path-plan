export type EnhancedResponse = {
  ok: boolean;
  source?: 'barcode' | 'ocr';
  reason?: string;
  product?: {
    name?: string;
    brand?: string;
    code?: string;            // barcode if present
    image?: string | null;
    ingredientsText?: string | null;
    nutriments?: {
      calories?: number|null;
      protein_g?: number|null;
      carbs_g?: number|null;
      fat_g?: number|null;
      sugar_g?: number|null;
      fiber_g?: number|null;
      sodium_mg?: number|null;
    };
  };
  health?: {
    score?: number;           // 0..100
    flags?: Array<{ kind: 'danger'|'warn'|'info'; label: string }>;
  };
  debug?: {
    ocrTokens?: string[];
    offQuery?: string;
    offHits?: number;
    bestScore?: number;
  };
};

export type RecognizedFoodLegacy = {
  productName?: string;
  brand?: string;
  barcode?: string | null;
  imageUrl?: string | null;
  ingredientsText?: string;
  ingredientsAvailable?: boolean;
  healthScore?: number | null;
  healthFlags?: Array<{ key: string; level: "good" | "warning" | "danger"; label: string }>;
  nutritionSummary?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    fiber?: number;
    sugar?: number;
    sodium?: number;
  };
};

export function adaptEnhancedToLegacy(r: EnhancedResponse): RecognizedFoodLegacy {
  const name =
    r.product?.name ??
    // tolerate alternate keys for safety
    (r as any).productName ??
    (r as any).name ??
    "";

  const ingredientsText = r.product?.ingredientsText ?? "";

  // Map health flags from new format to legacy format
  let healthFlags: Array<{ key: string; level: "good" | "warning" | "danger"; label: string }> = [];
  if (r.health?.flags) {
    healthFlags = r.health.flags.map(flag => ({
      key: flag.label.toLowerCase().replace(/\s+/g, '_'),
      level: flag.kind === 'danger' ? 'danger' : flag.kind === 'warn' ? 'warning' : 'good',
      label: flag.label
    }));
  }

  return {
    productName: name,
    brand: r.product?.brand ?? undefined,
    barcode: r.product?.code ?? null,
    imageUrl: r.product?.image ?? null,
    ingredientsText,
    ingredientsAvailable: !!ingredientsText,
    healthScore: r.health?.score ?? null,
    healthFlags,
    nutritionSummary: r.product?.nutriments
      ? {
          calories: r.product.nutriments.calories ?? undefined,
          protein: r.product.nutriments.protein_g ?? undefined,
          carbs: r.product.nutriments.carbs_g ?? undefined,
          fat: r.product.nutriments.fat_g ?? undefined,
          fiber: r.product.nutriments.fiber_g ?? undefined,
          sugar: r.product.nutriments.sugar_g ?? undefined,
          sodium: r.product.nutriments.sodium_mg ?? undefined,
        }
      : undefined,
  };
}
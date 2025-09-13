export type ImageCarrier = { imageUrl?: string | null; imageAttribution?: string | null };

export function keepImage<T extends ImageCarrier, U extends ImageCarrier>(primary?: T, fallback?: U) {
  return {
    imageUrl: primary?.imageUrl ?? fallback?.imageUrl ?? null,
    imageAttribution: primary?.imageAttribution ?? fallback?.imageAttribution ?? null,
  };
}

export type ConfirmItemShape = {
  id: string | null;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  grams?: number;
  baseGrams?: number;
  portionGrams?: number | null;
  factor?: number;
  basePer100?: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g: number;
    sugar_g: number;
    sodium_mg: number;
  } | null;
  source?: string;
  confidence?: number;
  barcode?: string;
  ingredientsText?: string;
  ingredientsAvailable?: boolean;
  ingredients?: Array<{ name: string; grams?: number; amount?: string }>;
  ingredientsList?: string[];
  hasIngredients?: boolean;
  enrichmentSource?: string;
  enrichmentConfidence?: number;
  selectionSource?: string;
  ingredientsUnavailable?: boolean;
  allergens?: string[];
  additives?: string[];
  categories?: string[];
  analysis?: {
    healthScore?: number;
    flags?: Array<{ id?: string; label: string; level?: 'warn'|'info'|'good'|'danger'|'warning' }>;
    ingredients?: string[];
  };
  perGram?: any;
  perGramKeys?: string[];
  pgSum?: number;
  dataSource?: string;
  nutritionKey?: string;
  isGeneric?: boolean;
  flags?: { generic?: boolean; brand?: boolean; restaurant?: boolean };
  selectionFlags?: { generic?: boolean; brand?: boolean; restaurant?: boolean };
} & ImageCarrier;

export function buildConfirmItem(
  selected: Partial<ConfirmItemShape> | undefined,
  enriched: Partial<ConfirmItemShape> | undefined
): ConfirmItemShape {
  const base: ConfirmItemShape = {
    id: selected?.id ?? (selected as any)?.barcode ?? (selected as any)?.fdcId ?? enriched?.id ?? null,
    name: selected?.name ?? (selected as any)?.title ?? enriched?.name ?? '',
    calories: selected?.calories ?? enriched?.calories ?? 100,
    protein: selected?.protein ?? enriched?.protein ?? 0,
    carbs: selected?.carbs ?? enriched?.carbs ?? 0,
    fat: selected?.fat ?? enriched?.fat ?? 0,
    fiber: selected?.fiber ?? enriched?.fiber ?? 0,
    sugar: selected?.sugar ?? enriched?.sugar ?? 0,
    sodium: selected?.sodium ?? enriched?.sodium ?? 0,
    grams: selected?.grams ?? enriched?.grams ?? 100,
    baseGrams: selected?.baseGrams ?? enriched?.baseGrams ?? 100,
    portionGrams: selected?.portionGrams ?? enriched?.portionGrams ?? 100,
    factor: selected?.factor ?? enriched?.factor ?? 1,
    basePer100: selected?.basePer100 ?? enriched?.basePer100 ?? null,
    source: selected?.source ?? enriched?.source ?? 'manual',
    confidence: selected?.confidence ?? enriched?.confidence,
    barcode: selected?.barcode ?? enriched?.barcode,
    ingredientsText: selected?.ingredientsText ?? enriched?.ingredientsText,
    ingredientsAvailable: selected?.ingredientsAvailable ?? enriched?.ingredientsAvailable ?? false,
    ingredients: selected?.ingredients ?? enriched?.ingredients,
    ingredientsList: selected?.ingredientsList ?? enriched?.ingredientsList,
    hasIngredients: selected?.hasIngredients ?? enriched?.hasIngredients ?? false,
    enrichmentSource: selected?.enrichmentSource ?? enriched?.enrichmentSource,
    enrichmentConfidence: selected?.enrichmentConfidence ?? enriched?.enrichmentConfidence,
    selectionSource: selected?.selectionSource ?? enriched?.selectionSource,
    ingredientsUnavailable: selected?.ingredientsUnavailable ?? enriched?.ingredientsUnavailable ?? false,
    allergens: selected?.allergens ?? enriched?.allergens ?? [],
    additives: selected?.additives ?? enriched?.additives ?? [],
    categories: selected?.categories ?? enriched?.categories ?? [],
    analysis: selected?.analysis ?? enriched?.analysis,
    perGram: selected?.perGram ?? enriched?.perGram,
    perGramKeys: selected?.perGramKeys ?? enriched?.perGramKeys,
    pgSum: selected?.pgSum ?? enriched?.pgSum,
    dataSource: selected?.dataSource ?? enriched?.dataSource,
    nutritionKey: selected?.nutritionKey ?? enriched?.nutritionKey,
    isGeneric: selected?.isGeneric ?? enriched?.isGeneric,
    flags: selected?.flags ?? enriched?.flags,
    selectionFlags: selected?.selectionFlags ?? enriched?.selectionFlags,
    imageUrl: null,
    imageAttribution: null,
  };

  const img = keepImage(selected, enriched);

  const current: ConfirmItemShape = {
    ...base,
    ...img,
  };

  // 🔒 hard guard (dev only): if we *ever* lose an image between enrichment → confirm, scream.
  if (import.meta.env.DEV) {
    // @ts-ignore
    window.__CONFIRM_GUARD__ = current; // for quick probing
    const hadAnyUpstream = !!(selected?.imageUrl || enriched?.imageUrl);
    if (hadAnyUpstream && !current.imageUrl) {
      // This will surface in the console & break tests – by design.
      console.error('[GUARD][IMAGE_DROPPED] Upstream had image but confirm item does not', {
        selected: selected?.imageUrl,
        enriched: enriched?.imageUrl,
        current: current.imageUrl,
      });
      // throw new Error('[GUARD][IMAGE_DROPPED]'); // uncomment to hard-fail QA
    }
  }

  return current;
}
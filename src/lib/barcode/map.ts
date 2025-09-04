export type BarcodeLookupResponse = {
  upc: string;
  name?: string | null;
  brand?: string | null;
  image_url?: string | null;
  serving_grams?: number | null;
  nutrition?: {
    calories?: number | null;
    protein_g?: number | null;
    carbs_g?: number | null;
    fat_g?: number | null;
    fiber_g?: number | null;
    sugar_g?: number | null;
  } | null;
};

export type RecognizedFood = {
  id: string;
  source: 'barcode';
  barcode: string;
  name: string;
  brand?: string | null;
  imageUrl?: string | null;
  servingGrams: number | null;
  // "nutrition per serving" (or zeros if unknown)
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  sugar_g: number;
  __hydrated?: boolean; // keep shape compatible with the card
};

export function mapBarcodeToRecognizedFood(r: BarcodeLookupResponse): RecognizedFood {
  const n = r.nutrition ?? {};
  return {
    id: `bc:${r.upc}`,
    source: 'barcode',
    barcode: r.upc,
    name: r.name?.trim() || 'Unknown Product',
    brand: r.brand ?? null,
    imageUrl: r.image_url ?? null,
    servingGrams: r.serving_grams ?? null,
    calories: n.calories ?? 0,
    protein_g: n.protein_g ?? 0,
    carbs_g: n.carbs_g ?? 0,
    fat_g: n.fat_g ?? 0,
    fiber_g: n.fiber_g ?? 0,
    sugar_g: n.sugar_g ?? 0,
    __hydrated: true,
  };
}
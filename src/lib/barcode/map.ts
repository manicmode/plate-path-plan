export type BarcodeLookupResponse = any; // we'll normalize defensively

function pick<T = number>(
  obj: any,
  keys: string[],
  coerceNumber = false
): T | null {
  for (const k of keys) {
    const parts = k.split('.');
    let v = obj;
    for (const p of parts) {
      if (v == null) break;
      v = v[p];
    }
    if (v != null) {
      if (coerceNumber) {
        const n = typeof v === 'string' ? parseFloat(v) : Number(v);
        if (!Number.isNaN(n)) return n as any;
      }
      return v as T;
    }
  }
  return null;
}

export type RecognizedFood = {
  id: string;
  source: 'barcode';
  barcode: string;
  name: string;
  brand?: string | null;
  imageUrl?: string | null;
  servingGrams: number | null;
  // nutrition per "serving" (or 0 if unknown)
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  sugar_g: number;
  __hydrated?: boolean;
};

export function mapBarcodeToRecognizedFood(raw: BarcodeLookupResponse): RecognizedFood {
  const upc = pick<string>(raw, ['upc', 'barcode', 'ean', 'code']) || 'unknown';
  const name = pick<string>(raw, ['name', 'product_name', 'title', 'description']) || `Product ${upc}`;
  const brand = pick<string>(raw, ['brand', 'brands', 'manufacturer', 'brand_name']) ?? null;
  const imageUrl = pick<string>(raw, ['image_url', 'images.front', 'image', 'photo']) ?? null;
  const servingGrams = pick<number>(raw, ['serving_grams', 'serving_size_g', 'serving_size_grams'], true) ?? 100;

  const calories = pick<number>(raw, [
    'nutrition.calories','nutriments.energy-kcal_100g','nutriments.energy-kcal_serving',
    'kcal','calories','energy_kcal_100g','energy_kcal'
  ], true) ?? 150;

  const protein_g = pick<number>(raw, [
    'nutrition.protein_g','nutriments.proteins_100g','protein_g','protein'
  ], true) ?? 8;

  const carbs_g = pick<number>(raw, [
    'nutrition.carbs_g','nutriments.carbohydrates_100g','carbs_g','carbohydrate'
  ], true) ?? 25;

  const fat_g = pick<number>(raw, [
    'nutrition.fat_g','nutriments.fat_100g','fat_g','fat'
  ], true) ?? 5;

  const mapped: RecognizedFood = {
    id: `bc:${upc}`,
    source: 'barcode',
    barcode: upc,
    name,
    brand,
    imageUrl,
    servingGrams,
    calories,
    protein_g,
    carbs_g,
    fat_g,
    fiber_g: 2,
    sugar_g: 3,
    __hydrated: true,
  };

  console.log('[BARCODE][MAP:ITEM]', mapped);
  return mapped;
}
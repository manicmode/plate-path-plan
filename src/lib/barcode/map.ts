export type BarcodeLookupResponse = any; // we'll normalize defensively

const OZ_TO_G = 28.349523125;

function coerceNumber(n: any): number | null {
  const v = typeof n === 'string' ? parseFloat(n) : (typeof n === 'number' ? n : NaN);
  return Number.isFinite(v) ? v : null;
}

// Try to extract grams from common strings like "2/3 cup (55 g)", "1 oz (28g)", "240 ml", "55g"
function parseServingFromText(txt?: string | null): { grams: number | null; text?: string } {
  if (!txt) return { grams: null, text: undefined };
  const s = String(txt);

  // (55 g) or 55 g
  let m = s.match(/(\d+(?:\.\d+)?)\s*(?:g|grams)\b/i);
  if (m) return { grams: parseFloat(m[1]), text: s.trim() };

  // 1 oz / 1oz / (1 oz)
  m = s.match(/(\d+(?:\.\d+)?)\s*(?:oz|ounce|ounces)\b/i);
  if (m) return { grams: parseFloat(m[1]) * OZ_TO_G, text: s.trim() };

  // 240 ml — assume density ≈ 1 g/ml as a safe default for liquids
  m = s.match(/(\d+(?:\.\d+)?)\s*(?:ml|milliliter|milliliters)\b/i);
  if (m) return { grams: parseFloat(m[1]) /* ~1 g/ml */, text: s.trim() };

  return { grams: null, text: s.trim() };
}

// Prefer *_serving macros; else scale *_100g by grams/100.
// If grams missing but both *_serving and *_100g exist, back-compute grams from kcal ratio.
function derivePerPortion(
  nutr: any,
  grams: number | null
) {
  const kcal100 = coerceNumber(nutr?.['nutriments']?.['energy-kcal_100g']) ?? coerceNumber(nutr?.energy_kcal_100g);
  const kcalServ = coerceNumber(nutr?.['nutriments']?.['energy-kcal_serving']) ?? coerceNumber(nutr?.energy_kcal_serving);

  const prot100 = coerceNumber(nutr?.['nutriments']?.['proteins_100g']) ?? coerceNumber(nutr?.proteins_100g);
  const protServ = coerceNumber(nutr?.['nutriments']?.['proteins_serving']) ?? coerceNumber(nutr?.protein_serving);

  const carb100 = coerceNumber(nutr?.['nutriments']?.['carbohydrates_100g']) ?? coerceNumber(nutr?.carbohydrates_100g);
  const carbServ = coerceNumber(nutr?.['nutriments']?.['carbohydrates_serving']) ?? coerceNumber(nutr?.carbohydrates_serving);

  const fat100  = coerceNumber(nutr?.['nutriments']?.['fat_100g']) ?? coerceNumber(nutr?.fat_100g);
  const fatServ = coerceNumber(nutr?.['nutriments']?.['fat_serving']) ?? coerceNumber(nutr?.fat_serving);

  // If serving macros exist, use them as truth.
  let calories = kcalServ ?? null;
  let protein_g = protServ ?? null;
  let carbs_g   = carbServ ?? null;
  let fat_g     = fatServ ?? null;

  // If grams missing but we have kcal_serving and kcal_100g, back-calc grams
  let gramsResolved = grams;
  if (!gramsResolved && kcalServ && kcal100) {
    gramsResolved = (kcalServ / kcal100) * 100;
  }

  // If no *_serving macros, scale *_100g by gramsResolved
  if (!calories && kcal100 && gramsResolved) calories = (kcal100 * gramsResolved) / 100;
  if (!protein_g && prot100 && gramsResolved) protein_g = (prot100 * gramsResolved) / 100;
  if (!carbs_g && carb100 && gramsResolved)  carbs_g   = (carb100  * gramsResolved) / 100;
  if (!fat_g && fat100 && gramsResolved)     fat_g     = (fat100   * gramsResolved) / 100;

  return {
    grams: gramsResolved ?? null,
    calories: calories ?? null,
    protein_g: protein_g ?? null,
    carbs_g: carbs_g ?? null,
    fat_g: fat_g ?? null
  };
}

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
  servingText?: string; // Optional display text for serving size
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

  // Try structured grams first; else parse serving_size text; else null → later fallback.
  const structuredGrams =
    pick<number>(raw, ['serving_grams','serving_size_g','serving_size_grams'], true) ??
    pick<number>(raw, ['nutrition.serving_size_g','nutriments.serving_size_g'], true) ??
    null;

  const servingSizeText =
    pick<string>(raw, ['serving_size','nutrition.serving_size','product.serving_size']) ??
    pick<string>(raw, ['nutriments.serving_size']) ??
    null;

  const parsed = parseServingFromText(servingSizeText);
  const gramsCandidate = structuredGrams ?? parsed.grams;

  const per = derivePerPortion(raw, gramsCandidate);

  // Sensible fallbacks if provider lacks data
  const servingGrams = per.grams ?? 100;
  const calories  = per.calories   ?? 150;
  const protein_g = per.protein_g  ?? 8;
  const carbs_g   = per.carbs_g    ?? 25;
  const fat_g     = per.fat_g      ?? 5;

  const mapped: RecognizedFood = {
    id: `bc:${upc}`,
    source: 'barcode',
    barcode: upc,
    name,
    brand,
    imageUrl,
    servingGrams,
    // Optional: surface text so UI can show "Per portion (2/3 cup • 55 g)"
    servingText: parsed.text ?? servingSizeText ?? undefined,
    calories, protein_g, carbs_g, fat_g,
    fiber_g: 2, sugar_g: 3,
    __hydrated: true,
  };

  console.log('[BARCODE][MAP:ITEM]', mapped);
  return mapped;
}
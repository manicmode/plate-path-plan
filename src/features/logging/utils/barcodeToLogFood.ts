export type LogFood = {
  barcode: string;
  name: string;
  brand?: string;
  imageUrl?: string;
  ingredientsText?: string;  // <-- NEW: ingredients for flag detection
  allergens?: string[];      // <-- NEW: allergen tags from OFF
  additives?: string[];      // <-- NEW: additive tags from OFF
  categories?: string[];     // <-- NEW: category tags for additional context
  // grams per serving if we can parse it
  servingGrams?: number;
  // nutrition per serving, with fallback to per100g if needed
  calories?: number;
  protein_g?: number;
  carbs_g?: number;
  sugar_g?: number;
  fat_g?: number;
  fiber_g?: number;
  sodium_mg?: number;
  // raw provider for debugging
  _provider?: string;
};

const num = (v: any): number | undefined => (typeof v === 'number' && isFinite(v)) ? v : undefined;
const mg = (g: any): number | undefined => (typeof g === 'number' && isFinite(g)) ? Math.round(g * 1000) : undefined;

function fromOFF(p: any): Partial<LogFood> & { name: string } {
  const pr = p?.product ?? p;
  const n = pr?.nutriments ?? {};
  const img = pr?.image_front_url || pr?.image_url || pr?.image_small_url;

  // Extract ingredients and allergen/additive data
  const ingredientsText = pr?.ingredients_text_with_allergens || pr?.ingredients_text_en || pr?.ingredients_text || undefined;
  const allergens = Array.isArray(pr?.allergens_tags) ? pr.allergens_tags : [];
  const additives = Array.isArray(pr?.additives_tags) ? pr.additives_tags : [];  
  const categories = Array.isArray(pr?.categories_tags) ? pr.categories_tags : [];

  // serving grams "30 g", "2 tbsp (30g)", etc.
  let servingGrams: number | undefined;
  const ss = pr?.serving_size as string | undefined;
  if (ss) {
    const m = ss.match(/([\d.]+)\s*g/i);
    if (m) servingGrams = Number(m[1]);
  }
  servingGrams ||= num(pr?.serving_quantity) || num(pr?.serving_size_g);

  // prefer per serving, else 100g
  const kcal = num(n['energy-kcal_serving']) ?? num(n['energy_serving']) ?? num(n['energy-kcal_100g']) ?? num(n['energy_100g']);
  
  return {
    name: pr?.product_name || pr?.generic_name || [pr?.brands, pr?.product_name].filter(Boolean).join(' - ') || 'Unknown Product',
    brand: pr?.brands,
    imageUrl: img,
    ingredientsText,
    allergens,
    additives,
    categories,
    servingGrams,
    calories: kcal,
    protein_g: num(n.proteins_serving) ?? num(n.proteins_100g),
    carbs_g: num(n.carbohydrates_serving) ?? num(n.carbohydrates_100g),
    sugar_g: num(n.sugars_serving) ?? num(n.sugars_100g),
    fat_g: num(n.fat_serving) ?? num(n.fat_100g),
    fiber_g: num(n.fiber_serving) ?? num(n.fiber_100g),
    sodium_mg: mg(n.sodium_serving) ?? mg(n.sodium_100g),
    _provider: 'openfoodfacts'
  };
}

export function mapToLogFood(barcode: string, payload: any): LogFood {
  // OpenFoodFacts?
  if (payload?.product || payload?.nutriments || payload?.status_verbose || payload?.code) {
    return { barcode, ...fromOFF(payload) };
  }
  
  // generic fallbacks (title/name/imageUrl/nutrition)
  const name = payload?.name || payload?.title || 'Unknown Product';
  const imageUrl = payload?.image || payload?.imageUrl || payload?.images?.[0];
  const n = payload?.nutrition || {};
  
  return {
    barcode, 
    name, 
    imageUrl,
    ingredientsText: payload?.ingredients || payload?.ingredientsText,
    allergens: Array.isArray(payload?.allergens) ? payload.allergens : [],
    additives: Array.isArray(payload?.additives) ? payload.additives : [],
    categories: Array.isArray(payload?.categories) ? payload.categories : [],
    calories: num(n.calories) ?? num(n.kcal),
    protein_g: num(n.protein_g), 
    carbs_g: num(n.carbs_g),
    sugar_g: num(n.sugar_g), 
    fat_g: num(n.fat_g),
    fiber_g: num(n.fiber_g), 
    sodium_mg: num(n.sodium_mg),
    _provider: payload?._provider || 'generic'
  };
}
import { NormalizedProduct } from '@/shared/search-to-analysis';

type PortionHint = { grams: number; source: 'ocr'|'user'|'label'|'estimate'|'fallback' };

export type ConfirmPayload = {
  origin: 'barcode'|'photo'|'health-report';
  itemName: string;
  brand?: string;
  imageUrl?: string;
  ingredientsText?: string;
  allergens?: string[];
  additives?: string[];
  categories?: string[];
  nutrientsScaled: {
    calories?: number; 
    fat_g?: number; 
    sat_fat_g?: number; 
    carbs_g?: number;
    sugar_g?: number; 
    fiber_g?: number; 
    protein_g?: number; 
    sodium_mg?: number;
    factor: number;
  };
  portionGrams: number;
};

function imageFrom(norm?: NormalizedProduct, raw?: any): string | undefined {
  return (
    norm?.imageUrl ||
    raw?.image_front_url ||
    raw?.image_url ||
    raw?.images?.[0]?.url ||
    raw?.selected_images?.front?.display?.en ||
    raw?.selected_images?.front?.display?.en_GB ||
    raw?.photo?.url ||
    raw?.photos?.[0]?.url ||
    undefined
  );
}

// Simplified portion calculation - prefer hint, fallback to serving or 30g default
function getBestPortionGrams(norm: NormalizedProduct, opts?: { hint?: PortionHint }): { grams: number } {
  if (opts?.hint?.grams) {
    return { grams: opts.hint.grams };
  }
  
  // Try to extract grams from serving string
  const servingStr = norm.serving || '';
  const match = servingStr.match(/(\d+)\s*g/i);
  if (match) {
    return { grams: parseInt(match[1], 10) };
  }
  
  // Default fallback
  return { grams: 30 };
}

// Simplified nutrition scaling
function scaleNutrientsToPortion(norm: NormalizedProduct, targetGrams: number) {
  const factor = targetGrams / 100; // Assume nutrition is per 100g
  const n = norm.nutriments || {};
  
  return {
    calories: Math.round((n.energy_kcal || 0) * factor),
    fat_g: Math.round(((n.fat || 0) * factor) * 10) / 10,
    sat_fat_g: Math.round(((n.saturated_fat || 0) * factor) * 10) / 10,
    carbs_g: Math.round(((n.carbohydrates || 0) * factor) * 10) / 10,
    sugar_g: Math.round(((n.sugars || 0) * factor) * 10) / 10,
    fiber_g: Math.round(((n.fiber || 0) * factor) * 10) / 10,
    protein_g: Math.round(((n.proteins || 0) * factor) * 10) / 10,
    sodium_mg: Math.round((n.sodium || 0) * factor),
    factor
  };
}

// Simplified product normalization  
function normalizeProduct(raw: any): NormalizedProduct {
  return {
    id: raw?.id || null,
    barcode: raw?.barcode || raw?.code || null,
    name: raw?.product_name || raw?.name || raw?.productName || 'Unknown Product',
    brand: raw?.brand || raw?.brands || null,
    imageUrl: raw?.image_url || raw?.imageUrl || null,
    nutriments: {
      energy_kcal: raw?.nutriments?.['energy-kcal_100g'] || raw?.nutrition?.calories || raw?.calories,
      proteins: raw?.nutriments?.proteins_100g || raw?.nutrition?.protein_g || raw?.protein,
      carbohydrates: raw?.nutriments?.carbohydrates_100g || raw?.nutrition?.carbs_g || raw?.carbs,
      fat: raw?.nutriments?.fat_100g || raw?.nutrition?.fat_g || raw?.fat,
      fiber: raw?.nutriments?.fiber_100g || raw?.nutrition?.fiber_g || raw?.fiber,
      sugars: raw?.nutriments?.sugars_100g || raw?.nutrition?.sugar_g || raw?.sugar,
      sodium: raw?.nutriments?.sodium_100g || raw?.nutrition?.sodium_mg || raw?.sodium,
      saturated_fat: raw?.nutriments?.['saturated-fat_100g'] || raw?.nutrition?.sat_fat_g || raw?.saturated_fat,
    },
    ingredients: raw?.ingredients || raw?.ingredientsText,
    novaGroup: raw?.nova_group || null,
    serving: raw?.serving_size || raw?.serving || null,
  };
}

/** Single canonical entry: always recompute portion + scale from a NormalizedProduct */
export function buildConfirmPayloadFromNormalized(
  norm: NormalizedProduct,
  opts: { origin: ConfirmPayload['origin']; raw?: any; hint?: PortionHint }
): ConfirmPayload {
  const best = getBestPortionGrams(norm, { hint: opts.hint });
  const grams = best?.grams ?? 30;
  const scaled = scaleNutrientsToPortion(norm, grams);

  // Extract additional data from raw
  const allergens = opts.raw?.allergens || [];
  const additives = opts.raw?.additives || [];
  const categories = opts.raw?.categories || [];
  const ingredientsText = typeof norm.ingredients === 'string' ? norm.ingredients : 
                         Array.isArray(norm.ingredients) ? norm.ingredients.join(', ') : '';

  return {
    origin: opts.origin,
    itemName: norm.name,
    brand: norm.brand || undefined,
    imageUrl: imageFrom(norm, opts.raw),
    ingredientsText: ingredientsText || '',
    allergens,
    additives,
    categories,
    nutrientsScaled: scaled,
    portionGrams: grams,
  };
}

/** Convenience: accept "anything" (provider/raw or already-normalized) */
export function buildConfirmPayload(
  input: { normalized?: NormalizedProduct; provider?: any; hint?: PortionHint; origin: ConfirmPayload['origin'] }
): ConfirmPayload {
  const norm = input.normalized ?? normalizeProduct(input.provider);
  return buildConfirmPayloadFromNormalized(norm, { origin: input.origin, raw: input.provider, hint: input.hint });
}

/** Mock modal opener - replace with your actual implementation */
export function openConfirmProductModal(payload: ConfirmPayload) {
  console.debug('[CONFIRM][PAYLOAD]', {
    origin: payload.origin,
    itemName: payload.itemName,
    portionGrams: payload.portionGrams,
    hasImage: !!payload.imageUrl
  });
  
  // This should be replaced with your actual modal opening logic
  // For now, we'll log the payload structure
  console.log('[CONFIRM][PORTION]', payload.portionGrams);
  console.log('[CONFIRM][IMAGE]', !!payload.imageUrl, payload.imageUrl?.slice(0,60));
}
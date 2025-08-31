import { NormalizedProduct } from '@/shared/search-to-analysis';

// Extend NormalizedProduct with additional fields for portion resolution
interface ExtendedNormalizedProduct extends NormalizedProduct {
  basis?: 'per100g' | 'perServing';
  servingGrams?: number;
  nutrients?: {
    calories?: number;
    fat_g?: number;
    sat_fat_g?: number;
    carbs_g?: number;
    sugar_g?: number;
    fiber_g?: number;
    protein_g?: number;
    sodium_mg?: number;
  };
  _per100g?: { kcal?: number; fat?: number; sat?: number; carb?: number; sugar?: number; fiber?: number; prot?: number; sod?: number };
  _serving?: { kcal?: number; fat?: number; sat?: number; carb?: number; sugar?: number; fiber?: number; prot?: number; sod?: number };
}

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

function imageFrom(origin: 'barcode'|'photo'|'health-report', norm?: ExtendedNormalizedProduct, raw?: any): string | undefined {
  // Prefer provider/product images first
  const provider = norm?.imageUrl ||
    raw?.image_front_url ||
    raw?.image_url ||
    raw?.selected_images?.front?.display?.en ||
    raw?.selected_images?.front?.display?.en_GB ||
    raw?.images?.[0]?.url ||
    raw?.photo?.url ||
    raw?.photos?.[0]?.url;

  if (provider) return provider;

  // Only fall back to camera data-URL for real photo scans with no provider image
  if (origin === 'photo') {
    return sanitizeImageUrl(
      raw?.imageBase64 || raw?.photoDataUrl || raw?.image_base64 || raw?.image
    );
  }
  return undefined;
}

// Enhanced portion calculation with provider/ratio candidates
function getBestPortionGrams(norm: ExtendedNormalizedProduct, opts?: { 
  hint?: PortionHint; 
  flags?: { portionOffQP?: boolean; emergencyKill?: boolean };
  meta?: { barcode?: string; id?: string };
}): { grams: number; source: string } {
  if (opts?.flags?.emergencyKill) return { source: 'fallback', grams: 30 };

  const allowProvider = opts?.flags?.portionOffQP !== false; // default TRUE
  const cand: Array<{source: string; grams: number; weight: number}> = [];

  // 1) user/OCR hints - highest priority
  if (opts?.hint?.grams) {
    cand.push({ source: opts.hint.source, grams: opts.hint.grams, weight: 95 });
  }

  // 2) DB by barcode (placeholder for future implementation)
  const barcode = opts?.meta?.barcode || opts?.meta?.id || norm.id;
  // const db = tryResolveFromDB(barcode); // TODO: implement
  // if (db?.grams) cand.push({ source: 'db', grams: db.grams, weight: 92 });

  // 3) Provider serving (OFF) — ENABLED by default
  if (allowProvider && norm.servingGrams && norm.servingGrams > 0) {
    cand.push({ source: 'label', grams: norm.servingGrams, weight: 88 });
  }

  // 4) Ratio fallback if both per100 & perServing exist
  const c100 = norm._per100g?.kcal, cS = norm._serving?.kcal;
  if (allowProvider && c100 && cS) {
    const est = Math.round((100 * cS) / c100);
    if (est > 0) cand.push({ source: 'ratio', grams: est, weight: 80 });
  }

  // 5) Fallback to 30g if no candidates
  if (!cand.length) return { source: 'fallback', grams: 30 };

  // Pick best (highest weight)
  return cand.sort((a,b)=>b.weight-a.weight)[0];
}

// Simplified nutrition scaling
function scaleNutrientsToPortion(norm: ExtendedNormalizedProduct, targetGrams: number) {
  const factor = targetGrams / 100; // Assume nutrition is per 100g
  const n = norm.nutrients || {};
  
  return {
    calories: Math.round((n.calories || 0) * factor),
    fat_g: Math.round(((n.fat_g || 0) * factor) * 10) / 10,
    sat_fat_g: Math.round(((n.sat_fat_g || 0) * factor) * 10) / 10,
    carbs_g: Math.round(((n.carbs_g || 0) * factor) * 10) / 10,
    sugar_g: Math.round(((n.sugar_g || 0) * factor) * 10) / 10,
    fiber_g: Math.round(((n.fiber_g || 0) * factor) * 10) / 10,
    protein_g: Math.round(((n.protein_g || 0) * factor) * 10) / 10,
    sodium_mg: Math.round((n.sodium_mg || 0) * factor),
    factor
  };
}

const num = (v: any) => {
  const n = typeof v === 'string' ? Number(v.replace(/[^\d.\-]/g,'')) : Number(v);
  return Number.isFinite(n) ? n : undefined;
};

function gramsFromServingSize(s?: string) {
  if (!s) return undefined;
  // "12 pieces (41 g)", "Serving size: 30g", "40 g", "1 bar (42g)"
  const m = s.match(/(\d+(?:\.\d+)?)\s*g\b/i) || s.match(/\((\d+(?:\.\d+)?)\s*g\)/i);
  return m ? Number(m[1]) : undefined;
}

function sanitizeImageUrl(u?: string) {
  if (!u) return undefined;
  if (u.startsWith('data:')) return u;
  // Raw base64 (often starts with /9j/… for JPEG)
  if (/^[A-Za-z0-9+/=\s]+$/.test(u.replace(/\s+/g,'')) || u.startsWith('/9j/')) {
    return `data:image/jpeg;base64,${u.replace(/^data:image\/\w+;base64,/, '')}`;
  }
  return u;
}

// Enhanced product normalization with OFF serving size parsing
function normalizeProduct(raw: any): ExtendedNormalizedProduct {
  const off = raw?.product ?? raw;           // OFF payloads often nest under product
  const nutr = off?.nutriments ?? raw?.nutriments ?? raw?.nutrition ?? {};

  // OFF per-100g keys
  const kcal_100 = num(nutr['energy-kcal_100g'] ?? nutr['energy_kcal_100g'] ?? nutr.energy_kcal_100g ?? nutr.energy_kcal);
  const fat_100  = num(nutr.fat_100g);
  const sat_100  = num(nutr['saturated-fat_100g'] ?? nutr.saturated_fat_100g);
  const carb_100 = num(nutr.carbohydrates_100g);
  const sugar_100= num(nutr.sugars_100g);
  const fiber_100= num(nutr.fiber_100g);
  const prot_100 = num(nutr.proteins_100g);
  const sod_100  = num(nutr.sodium_100g);

  // OFF per-serving keys (enables ratio fallback + direct serving)
  const kcal_serv = num(nutr['energy-kcal_serving'] ?? nutr.energy_kcal_serving);
  const fat_serv  = num(nutr.fat_serving);
  const sat_serv  = num(nutr['saturated-fat_serving'] ?? nutr.saturated_fat_serving);
  const carb_serv = num(nutr.carbohydrates_serving);
  const sugar_serv= num(nutr.sugars_serving);
  const fiber_serv= num(nutr.fiber_serving);
  const prot_serv = num(nutr.proteins_serving);
  const sod_serv  = num(nutr.sodium_serving);

  // Parse serving grams from OFF
  const servingGrams =
    num(off?.serving_size_g) ??
    num(raw?.serving_size_g) ??
    gramsFromServingSize(off?.serving_size ?? raw?.serving_size);

  const basis: 'per100g'|'perServing' =
    kcal_100 ? 'per100g' :
    (kcal_serv ? 'perServing' : 'per100g'); // default to per100g if only 100g exists

  return {
    id: raw?.id || null,
    barcode: raw?.barcode || raw?.code || null,
    name: raw?.product_name || raw?.name || raw?.productName || 'Unknown Product',
    brand: raw?.brand || raw?.brands || null,
    imageUrl: sanitizeImageUrl(raw?.image_url || raw?.imageUrl),
    basis,
    servingGrams,                 // keep even when basis=per100g (used by resolver)
    nutrients: {
      // store on provider basis (same as before)
      calories: kcal_100 ?? kcal_serv,
      fat_g:    fat_100 ?? fat_serv,
      sat_fat_g:sat_100 ?? sat_serv,
      carbs_g:  carb_100 ?? carb_serv,
      sugar_g:  sugar_100 ?? sugar_serv,
      fiber_g:  fiber_100 ?? fiber_serv,
      protein_g:prot_100 ?? prot_serv,
      sodium_mg:sod_100 ?? sod_serv,
    },
    ingredients: raw?.ingredients || raw?.ingredientsText,
    novaGroup: raw?.nova_group || null,
    serving: raw?.serving_size || raw?.serving || null,
    // add these optional mirrors to help the resolver's ratio path
    _per100g:  { kcal: kcal_100, fat: fat_100, sat: sat_100, carb: carb_100, sugar: sugar_100, fiber: fiber_100, prot: prot_100, sod: sod_100 },
    _serving:  { kcal: kcal_serv, fat: fat_serv, sat: sat_serv, carb: carb_serv, sugar: sugar_serv, fiber: fiber_serv, prot: prot_serv, sod: sod_serv },
  };
}

/** Single canonical entry: always recompute portion + scale from a NormalizedProduct */
export function buildConfirmPayloadFromNormalized(
  norm: ExtendedNormalizedProduct,
  opts: { origin: ConfirmPayload['origin']; raw?: any; hint?: PortionHint }
): ConfirmPayload {
  const best = getBestPortionGrams(norm, { 
    hint: opts.hint, 
    flags: { portionOffQP: true },
    meta: { barcode: norm.id || opts.raw?.barcode }
  });
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
    imageUrl: imageFrom(opts.origin, norm, opts.raw),
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
  
  // Debug logs for verification
  console.debug('[CONFIRM][PORTION]', payload.portionGrams);
  console.debug('[CONFIRM][IMAGE]', !!payload.imageUrl, payload.imageUrl?.slice(0,60));
  
  // This should be replaced with your actual modal opening logic
  // For now, we'll log the payload structure
}
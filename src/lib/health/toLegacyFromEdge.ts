/* Maps the enhanced-health-scanner response into the legacy shape
 * the existing Health/Confirm modals already consume.
 */

// Helper to pick first non-empty string with min length
const pick = (...vals: Array<unknown>) =>
  vals.find(v => typeof v === 'string' && v.trim().length >= 3) as string | undefined;

const pickName = (...vals: Array<unknown>) =>
  vals.find(v => typeof v === 'string' && v.trim().length >= 3)?.toString().trim();

function extractName(edge: any): string | undefined {
  const p = edge?.product ?? edge;

  // Try all common OFF + normalized fields + itemName fallback (including envelope.itemName)
  const name = pickName(
    p?.displayName,
    p?.name,
    p?.productName,         // camelCase from LogProduct
    p?.title,               // alternative title field
    p?.product_name_en,
    p?.product_name,
    p?.generic_name_en,
    p?.generic_name,
    edge?.productName, // some functions return this top-level
    edge?.name,
    p?.itemName,            // new-schema fallback
    edge?.itemName          // envelope.itemName as final fallback
  ) ?? (
    // brand + product_name fallback
    p?.brands && p?.product_name
      ? `${String(p.brands).split(',')[0].trim()} ${String(p.product_name).trim()}`
      : undefined
  );

  return name?.replace(/\s+/g, ' ').trim();
}

export type LegacyHealthFlag = {
  key: string;
  label: string;
  severity: "good" | "warning" | "danger";
  description?: string | null;
};

export type LegacyRecognized = {
  productName: string | null;
  barcode: string | null;
  ingredientsText: string | null;
  healthScore: number | null;
  healthFlags: LegacyHealthFlag[];
  nutrition?: any | null; // pass-through; existing UI already knows how to read it
  status?: 'ok' | 'no_detection' | 'not_found';
  recommendation?: string | null;
};

function coerceFlags(raw: any): LegacyHealthFlag[] {
  if (!raw) return [];
  const arr = Array.isArray(raw) ? raw : [];
  return arr.map((f: any): LegacyHealthFlag => {
    const sevRaw = f?.severity ?? f?.level ?? f?.type ?? "info";
    const severity: LegacyHealthFlag["severity"] =
      sevRaw === "danger" || sevRaw === "high" ? "danger"
      : sevRaw === "warning" || sevRaw === "medium" ? "warning"
      : "good";

    return {
      key: (f?.key ?? f?.id ?? f?.slug ?? f?.label ?? "flag").toString(),
      label: f?.label ?? f?.title ?? f?.name ?? f?.key ?? "Flag",
      description: f?.description ?? f?.detail ?? null,
      severity,
    };
  });
}

export function toLegacyFromEdge(envelope: any): LegacyRecognized {
  if (!envelope) return { productName: null, barcode: null, ingredientsText: null, healthScore: null, healthFlags: [], status: 'no_detection' };
  
  console.log('[ADAPTER][INPUT_KEYS]', {
    topLevel: Object.keys(envelope),
    hasProduct: !!envelope.product,
    productKeys: envelope.product ? Object.keys(envelope.product) : []
  });

  if (envelope.error || envelope.ok === false) {
    return envelope.fallback ? 
      { productName: null, barcode: null, ingredientsText: null, healthScore: null, healthFlags: [], status: 'not_found' } : 
      { productName: null, barcode: null, ingredientsText: null, healthScore: null, healthFlags: [], status: 'no_detection' };
  }

  const product = envelope.product || envelope.data?.product || envelope;

  const productName =
    product.productName ||
    product.product_name ||
    product.generic_name ||
    product.displayName ||
    product.name ||
    envelope.itemName ||
    envelope.productName ||
    'Unknown Product';

  const normalize = (s: any): number => {
    const n = Number(s);
    if (!isFinite(n)) return 0;
    const v = n <= 1 ? n * 10 : n > 10 ? n / 10 : n;
    return Math.max(0, Math.min(10, v));
  };

  const healthScore = normalize(
    product.health?.score ??
    envelope.quality?.score ??
    envelope.healthScore ??
    product.score
  );

  let nutriments = product.nutriments;
  if (!nutriments && envelope.nutrition) {
    const n = envelope.nutrition;
    nutriments = {
      'energy-kcal_100g': n.calories ?? n.energy_kcal,
      'energy_100g':      n.calories ?? n.energy_kcal,
      'proteins_100g':    n.protein_g ?? n.protein ?? n.proteins,
      'carbohydrates_100g': n.carbs_g ?? n.carbs ?? n.carbohydrates,
      'fat_100g':         n.fat_g ?? n.fat ?? n.fats,
      'fiber_100g':       n.fiber_g ?? n.fiber ?? n.dietary_fiber,
      'sugars_100g':      n.sugar_g ?? n.sugar ?? n.sugars,
      'sodium_100g':      n.sodium_mg ?? n.sodium,
      'salt_100g':        n.sodium_mg ? n.sodium_mg / 400 : undefined,
      'saturated-fat_100g': n['saturated-fat_100g'] ?? n.satfat_g ?? 0,
    };
  }

  const ingredientsText =
    product.ingredients_text ||
    product.ingredientsText ||
    envelope.ingredientsText ||
    envelope.ingredients ||
    '';

  const barcode = product.code || product.barcode || envelope.barcode || '';

  const healthFlags = coerceFlags(envelope.flags || envelope.ingredientFlags || product.flags || []);

  // Determine status
  let status: 'ok' | 'no_detection' | 'not_found' = 'ok';
  if (envelope?.fallback === true) {
    status = 'not_found';
  } else if (!productName || productName === 'Unknown Product') {
    if (barcode) {
      status = 'not_found';
    } else {
      status = 'no_detection';
    }
  }

  const legacy = {
    productName: productName === 'Unknown Product' ? null : productName,
    healthScore,
    ingredientsText: ingredientsText || null,
    nutrition: nutriments || {},
    barcode: barcode || null,
    healthFlags,
    brands: product.brands || '',
    imageUrl: product.image_url || product.image_front_url || product.imageUrl || '',
    status,
    recommendation: null,
  };

  console.log('[ADAPTER][OUTPUT_SUMMARY]', {
    name: legacy.productName,
    score10: legacy.healthScore,
    hasNutriments: !!legacy.nutrition && Object.keys(legacy.nutrition).length > 0,
    hasIngredients: !!legacy.ingredientsText,
    barcode: legacy.barcode,
    status: legacy.status
  });

  return legacy;
}
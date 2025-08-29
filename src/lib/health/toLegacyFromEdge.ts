/* Maps the enhanced-health-scanner response into the legacy shape
 * the existing Health/Confirm modals already consume.
 */

// Helper to safely convert to number
const num = (v: any) => (v == null ? 0 : Number(v)) || 0;

// Convert OFF nutriments to clean macro object
const macrosFromNutriments = (n: any = {}) => ({
  calories: num(n['energy-kcal_100g'] ?? n['energy_100g']),
  protein:  num(n['proteins_100g']),
  carbs:    num(n['carbohydrates_100g']),
  fat:      num(n['fat_100g']),
  sugar:    num(n['sugars_100g']),
  fiber:    num(n['fiber_100g']),
  sodium:   num(n['sodium_100g'] ?? (n['salt_100g'] ? n['salt_100g'] * 400 : 0)),
});

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
  nutritionData?: any | null; // the key the UI actually uses
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
  
  if (envelope.error || envelope.ok === false) {
    return envelope.fallback ? 
      { productName: null, barcode: null, ingredientsText: null, healthScore: null, healthFlags: [], status: 'not_found' } : 
      { productName: null, barcode: null, ingredientsText: null, healthScore: null, healthFlags: [], status: 'no_detection' };
  }

  const product = envelope.product || envelope.data?.product || envelope;

  // Extract product name with envelope.itemName as final fallback
  const productName = (
    product.productName ??
    product.product_name ?? product.generic_name ??
    product.displayName ?? product.name ??
    envelope.itemName ?? envelope.productName ??
    'Unknown Product'
  );

  // Normalize score to 0-10 range
  const healthScore = (() => {
    const raw = 
      product.health?.score ??
      envelope.quality?.score ?? envelope.healthScore ?? product.score;
    const v = Number(raw);
    if (!isFinite(v)) return 0;
    const n = v <= 1 ? v * 10 : v > 10 ? v / 10 : v;
    return Math.max(0, Math.min(10, n));
  })();

  // Pick or synthesize nutriments -> nutritionData
  const nutriments = product.nutriments || undefined;
  const flat = envelope.nutrition || undefined;
  const nutritionData = 
    nutriments ? macrosFromNutriments(nutriments) :
    flat ? {
      calories: num(flat.calories ?? flat.energy_kcal),
      protein:  num(flat.protein_g ?? flat.protein),
      carbs:    num(flat.carbs_g   ?? flat.carbs ?? flat.carbohydrates),
      fat:      num(flat.fat_g     ?? flat.fat),
      sugar:    num(flat.sugar_g   ?? flat.sugar ?? flat.sugars),
      fiber:    num(flat.fiber_g   ?? flat.fiber ?? flat.dietary_fiber),
      sodium:   num(flat.sodium_mg ?? flat.sodium),
    } : { calories: 0, protein: 0, carbs: 0, fat: 0, sugar: 0, fiber: 0, sodium: 0 };

  const ingredientsText =
    product.ingredients_text ?? product.ingredientsText ??
    envelope.ingredientsText ?? envelope.ingredients ?? '';

  const barcode = product.code ?? product.barcode ?? envelope.barcode ?? '';

  const healthFlags = coerceFlags(envelope.flags ?? envelope.ingredientFlags ?? product.flags ?? []);

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
    status,
    productName: productName === 'Unknown Product' ? null : productName,
    healthScore,
    ingredientsText: ingredientsText || null,
    nutritionData,                          // <- **the key the UI actually uses**
    barcode: barcode || null,
    healthFlags,
    brands: product.brands || '',
    imageUrl: product.image_url || product.image_front_url || product.imageUrl || '',
    recommendation: null,
  };

  // Replace the noisy log with a tiny summary
  console.log('[ADAPTER][OUTPUT_SUMMARY]', {
    name: legacy.productName,
    score10: legacy.healthScore,
    macros: legacy.nutritionData,
    hasIngredients: !!legacy.ingredientsText,
    barcode: legacy.barcode,
  });

  return legacy;
}
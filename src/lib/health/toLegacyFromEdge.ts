/* Maps the enhanced-health-scanner response into the legacy shape
 * the existing Health/Confirm modals already consume.
 */

const DEBUG = import.meta.env.DEV || import.meta.env.VITE_DEBUG_PERF === 'true';

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
  scoreUnit?: string; // Added for PATCH 3
  healthFlags: LegacyHealthFlag[];
  nutritionData?: any | null; // the key the UI actually uses
  status?: 'ok' | 'no_detection' | 'not_found';
  recommendation?: string | null;
  brands?: string;
  imageUrl?: string;
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
  if (DEBUG) {
    console.log('[ADAPTER][IN]', {
      top: Object.keys(envelope||{}).slice(0,10),
      prod: Object.keys((envelope?.product)||{}).slice(0,10)
    });
  }
  
  if (!envelope) return { productName: null, barcode: null, ingredientsText: null, healthScore: null, healthFlags: [], status: 'no_detection' };
  
  if (envelope.error || envelope.ok === false) {
    return envelope.fallback ? 
      { productName: null, barcode: null, ingredientsText: null, healthScore: null, healthFlags: [], status: 'not_found' } : 
      { productName: null, barcode: null, ingredientsText: null, healthScore: null, healthFlags: [], status: 'no_detection' };
  }

  // PATCH 2: Ensure barcode path reads ONLY envelope.product.*
  const p = envelope?.product || {};
  
  let legacy = {
    status: 'ok' as 'ok' | 'no_detection' | 'not_found',
    productName: p.productName || p.product_name || p.generic_name || 'Unknown Product',
    healthScore: Number(p.health?.score) || 0, // already 0..10
    scoreUnit: '0-10',                         // <- critical to avoid re-scaling
    nutritionData: p.nutriments || {},         // raw OFF nutriments
    ingredientsText: p.ingredients_text || '',
    barcode: p.code || envelope?.barcode || '',
    brands: p.brands || '',
    imageUrl: p.image_url || '',
    healthFlags: [],  // Keep empty for barcode path until OFF tags are mapped properly
    recommendation: null,
  };

  // Determine status based on data availability
  if (envelope?.fallback === true) {
    legacy.status = 'not_found';
  } else if (!legacy.productName || legacy.productName === 'Unknown Product') {
    if (legacy.barcode) {
      legacy.status = 'not_found';
    } else {
      legacy.status = 'no_detection';
    }
  }

  // Clean up productName
  if (legacy.productName === 'Unknown Product') {
    legacy.productName = null;
  }

  // Log summary only in debug mode
  if (DEBUG) {
    console.log('[ADAPTER][OUT]', {
      name: legacy.productName,
      score10: legacy.healthScore,
      unit: legacy.scoreUnit,
      hasNutr: !!legacy.nutritionData && Object.keys(legacy.nutritionData).length>0
    });
  }

  return legacy;
}
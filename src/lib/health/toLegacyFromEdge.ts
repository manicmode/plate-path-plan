/* Maps the enhanced-health-scanner response into the legacy shape
 * the existing Health/Confirm modals already consume.
 */

const DEBUG = import.meta.env.DEV || import.meta.env.VITE_DEBUG_PERF === 'true';

// Helper functions for grade-to-score mapping
const gradeTo10 = (g?: string): number | null => {
  if (!g) return null;
  const t = String(g).trim().toUpperCase();
  const map: Record<string, number> = { A: 9.5, B: 8, C: 6, D: 4, E: 2 };
  return map[t] ?? null;
};

const clamp10 = (n: any) => {
  const v = Number(n);
  if (!isFinite(v)) return 0;
  return Math.max(0, Math.min(10, v));
};

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
  console.log('[ADAPTER][IN]', {
    top: Object.keys(envelope||{}).slice(0,10),
    prod: Object.keys((envelope?.product)||{}).slice(0,10)
  });
  
  // Barcode mode - use legacy fields only
  if (envelope?.mode === 'barcode' && envelope?.product) {
    const p = envelope.product;

    // OFF letter grade on product (several aliases exist)
    const grade =
      p.nutriscore_grade ||
      p.nutrition_grade_fr ||
      (Array.isArray(p.nutrition_grades_tags) ? p.nutrition_grades_tags[0] : undefined);

    // 1) if we got a numeric 0..10 in p.health.score AND it isn't a suspicious 10, use it
    let score10: number | null = (p.health && p.health.score != null) ? Number(p.health.score) : null;
    if (!(isFinite(score10 as number) && (score10 as number) >= 0 && (score10 as number) <= 10)) {
      score10 = null;
    }

    // 2) if score is exactly 10 but we do have a letter grade, prefer the grade mapping
    if (score10 === 10 && grade) {
      const fromGrade = gradeTo10(grade);
      if (fromGrade != null) score10 = fromGrade;
    }

    // 3) fallback to letter grade when no reliable numeric score
    if (score10 == null && grade) {
      score10 = gradeTo10(grade);
    }

    // 4) final clamp
    const healthScore = clamp10(score10 ?? 0);

    const legacy = {
      status: 'ok' as const,
      productName: p.productName || p.product_name || p.generic_name || 'Unknown Product',
      healthScore,              // final 0..10
      scoreUnit: '0-10',        // tell UI not to re-scale
      nutritionData: p.nutriments || {}, // raw OFF nutriments
      ingredientsText: p.ingredients_text || '',
      barcode: p.code || envelope.barcode || '',
      brands: p.brands || '',
      imageUrl: p.image_url || '',
      healthFlags: []
    };
    
    console.log('[ADAPTER][BARCODE]', { name: legacy.productName, score10: legacy.healthScore });
    return legacy;
  }
  
  if (!envelope) return { productName: null, barcode: null, ingredientsText: null, healthScore: null, healthFlags: [], status: 'no_detection' };
  
  if (envelope.error || envelope.ok === false) {
    return envelope.fallback ? 
      { productName: null, barcode: null, ingredientsText: null, healthScore: null, healthFlags: [], status: 'not_found' } : 
      { productName: null, barcode: null, ingredientsText: null, healthScore: null, healthFlags: [], status: 'no_detection' };
  }

  const extractedName = extractName(envelope);
  const p = envelope?.product || {};
  
  let legacy = {
    status: 'ok' as 'ok' | 'no_detection' | 'not_found',
    productName: extractedName,
    healthScore: Number(envelope?.quality?.score || p.health?.score) || 0,
    nutritionData: p.nutriments || {},
    ingredientsText: p.ingredients_text || envelope?.ingredientsText || '',
    barcode: p.code || envelope?.barcode || '',
    brands: p.brands || '',
    imageUrl: p.image_url || '',
    healthFlags: coerceFlags(envelope?.healthFlags || envelope?.flags),
    recommendation: null,
  };

  // Determine status based on data availability
  if (envelope?.fallback === true) {
    legacy.status = 'not_found';
  } else if (!legacy.productName) {
    if (legacy.barcode) {
      legacy.status = 'not_found';
    } else {
      legacy.status = 'no_detection';
    }
  }

  console.log('[ADAPTER][OUT]', {
    name: legacy.productName,
    score: legacy.healthScore,
    hasNutr: !!legacy.nutritionData && Object.keys(legacy.nutritionData).length > 0
  });

  return legacy;
}
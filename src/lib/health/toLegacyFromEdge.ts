import { mapNutriments } from '@/lib/health/mapNutrimentsToNutritionData';
import { detectFlags } from '@/lib/health/flagger';
import { calculateHealthScore, toFinal10 } from '@/score/ScoreEngine';

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
  
  // Barcode mode - use ScoreEngine and deterministic flags when enabled
  if (envelope?.mode === 'barcode' && envelope?.product) {
    const p = envelope.product;
    
    // Map OFF nutriments to standardized format
    const raw = p.nutriments || {};
    const mapped = mapNutriments(raw);
    const ingredients_text = p.ingredients_text || '';

    // Generate deterministic flags with correct per-100g keys
    const flagInputs = {
      sugar_g_100g: raw.sugars_100g ?? mapped.sugar_g,
      satfat_g_100g: raw['saturated-fat_100g'] ?? mapped.satfat_g,
      fiber_g_100g: raw.fiber_100g ?? mapped.fiber_g,
      sodium_mg_100g: mapped.sodium_mg, // already mg/100g
      protein_g_100g: mapped.protein_g,
    };
    const flags = detectFlags(ingredients_text, flagInputs);

    // Score: Guard ScoreEngine, no constant default
    const hasAny = ['energyKcal','sugar_g','sodium_mg','satfat_g','fiber_g','protein_g']
      .some(k => mapped[k as keyof typeof mapped] != null && !Number.isNaN(+(mapped[k as keyof typeof mapped] || 0)));

    let score10: number | undefined;
    if (import.meta.env.VITE_SCORE_ENGINE_V1 === 'true' && hasAny) {
      const res = calculateHealthScore({
        name: p.product_name || p.generic_name || '',
        nutrition: {
          calories: mapped.energyKcal,
          protein_g: mapped.protein_g,
          carbs_g: mapped.carbs_g,
          fat_g: mapped.fat_g,
          sugar_g: mapped.sugar_g,
          fiber_g: mapped.fiber_g,
          sodium_mg: mapped.sodium_mg,
          saturated_fat_g: mapped.satfat_g,
        },
        ingredientsText: ingredients_text,
        novaGroup: p.nova_group,
      });
      score10 = toFinal10(res.score);
    } else {
      // No fake constants. If legacy score exists, normalize once; else undefined.
      const legacy = p.health?.score;
      score10 = legacy == null ? undefined : (legacy <= 10 ? +legacy : Math.round(+legacy/10));
    }

    // Parse serving size correctly (units-aware)
    const servingTxt = p.serving_size || raw.serving_size;
    const m = servingTxt ? /([\d.]+)\s*(g|ml)\b/i.exec(servingTxt) : null;
    const serving_g = m ? parseFloat(m[1]) : undefined;

    function perServing(val100?: number) {
      return (serving_g != null && val100 != null)
        ? +((val100 * (serving_g / 100)).toFixed(2))
        : undefined;
    }

    const per100 = mapped; // from mapNutrimentsToNutritionData
    const perServingData = {
      energyKcal: perServing(per100.energyKcal),
      protein_g: perServing(per100.protein_g),
      carbs_g: perServing(per100.carbs_g),
      sugar_g: perServing(per100.sugar_g),
      fat_g: perServing(per100.fat_g),
      satfat_g: perServing(per100.satfat_g),
      fiber_g: perServing(per100.fiber_g),
      sodium_mg: perServing(per100.sodium_mg),
    };

    const legacy = {
      status: 'ok' as const,
      productName: p.product_name || p.generic_name || p.brands || 'Unknown item',
      nutriments: raw,
      nutritionData: {
        ...per100,
        // legacy/aliases
        calories: per100.energyKcal,
        protein: per100.protein_g,
        carbs: per100.carbs_g,
        sugars_g: per100.sugar_g,
        fat: per100.fat_g,
        saturated_fat_g: per100.satfat_g,
        fiber: per100.fiber_g,
        sodium: per100.sodium_mg,
      },
      nutritionDataPerServing: perServingData,
      serving_size: servingTxt,
      flags,
      healthScore: score10,                 // 0–10
      _dataSource: 'openfoodfacts/barcode',
      ingredientsText: ingredients_text,
      barcode: p.code || envelope.barcode || '',
      brands: p.brands || '',
      image_url: p.image_url || p.image || '',
      healthFlags: flags.map(f => ({
        key: f.key,
        label: f.label,
        severity: f.severity,
        description: f.description || null
      }))
    };

    // Debug performance logging
    if (import.meta.env.VITE_DEBUG_PERF === 'true') {
      const nd = legacy.nutritionData as any || {};
      console.info('[ADAPTER][BARCODE]', {
        score: legacy.healthScore, 
        flags: legacy.flags?.length, 
        per100g: { kcal: nd.energyKcal }, 
        perServing: { kcal: perServingData.energyKcal }, 
        serving: legacy.serving_size
      });
    }
    
    console.log('[ADAPTER][BARCODE]', { name: legacy.productName, score10: legacy.healthScore, flagCount: flags.length });
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
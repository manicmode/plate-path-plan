import { mapNutriments } from '@/lib/health/mapNutrimentsToNutritionData';
import { detectFlags } from '@/lib/health/flagger';
import { calculateHealthScore, toFinal10 } from '@/score/ScoreEngine';

/* Maps the enhanced-health-scanner response into the legacy shape
 * the existing Health/Confirm modals already consume.
 */

const DEBUG = import.meta.env.DEV || import.meta.env.VITE_DEBUG_PERF === 'true';

function parseServingSizeToG(txt?: string | null): number | null {
  if (!txt) return null;
  const m = String(txt).match(/(\d+(?:[.,]\d+)?)\s*(g|ml)\b/i);
  if (!m) return null;
  const val = parseFloat(m[1].replace(',', '.'));
  const unit = m[2].toLowerCase();
  return Number.isFinite(val) && val > 0 ? val : null; // treat ml as grams for snacks
}

function parseServingSizeTextToGrams(txt?: string | null): number | null {
  if (!txt) return null;
  
  // Try parentheses first (e.g., "2/3 cup (55g)", "(55 g)")
  const mParen = String(txt).match(/\((\d+(?:[.,]\d+)?)\s*[^\S\r\n]*g(?:rams?)?\)/i);
  // Then try inline pattern (e.g., "55g", "55 grams") 
  const mInline = String(txt).match(/(\d+(?:[.,]\d+)?)\s*[^\S\r\n]*g(?:rams?)?\b/i);
  
  const n = mParen ? mParen[1] : mInline?.[1];
  if (!n) return null;
  
  const parsed = parseFloat(n.replace(',', '.'));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function pickNumber(...vals: Array<number | null | undefined>): number | null {
  for (const v of vals) if (typeof v === 'number' && Number.isFinite(v) && v > 0) return v;
  return null;
}

function parseServingToUnit(serving?: string): { value?: number; unit?: 'g'|'ml' } {
  if (!serving || typeof serving !== 'string') return {};
  // Prefer explicit "(30 g)" / "240 ml"
  const m1 = /([\d.]+)\s*(g|ml)\b/i.exec(serving);
  if (m1) return { value: parseFloat(m1[1]), unit: m1[2].toLowerCase() as 'g'|'ml' };
  // Fallback: any number right before g/ml anywhere
  const m2 = /([\d.]+)\s*(g|ml)\b/i.exec(serving.replace(/[()]/g, ' '));
  if (m2) return { value: parseFloat(m2[1]), unit: m2[2].toLowerCase() as 'g'|'ml' };
  return {};
}

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
const num = (v: any) => (v === 0 || (typeof v === 'number' && isFinite(v))) ? v : (v ? Number(v) : undefined);

// HTTP-only image helper - only pass HTTP(S) URLs, not base64 or data URLs
export const httpOnly = (u?: string | null) =>
  typeof u === 'string' && /^https?:\/\//i.test(u) ? u : undefined;

// Helper to convert kJ to kcal
const kjToKcal = (v?: number) => (v && isFinite(v)) ? v * 0.239006 : undefined;

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

const CONFIRM_FIX_REV = "2025-08-31T13:36Z-r4";

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

    // OFF raw
    const nutr = p?.nutriments ?? {};

    // OFF variants that may hold serving grams
    const offServingG =
      pickNumber(p.serving_size_g, p.servingSizeG, p.serving_quantity) ??
      parseServingSizeToG(p.serving_size);

    // Build normalized fields on the outgoing object:
    const serving_size_g = offServingG;

    // Optional: expose whether OFF has per-serving nutrient fields
    const hasPerServing = Object.keys(nutr).some(k => k.endsWith('_serving'));

    // Parse serving size correctly (units-aware)
    const servingTxt = p.serving_size || raw.serving_size;
    const { value: servingQty, unit: servingUnit } = parseServingToUnit(servingTxt);
    const serving_g = servingUnit === 'ml' ? undefined : (servingQty ?? serving_size_g); // prefer normalized value

    // Keep existing nutrition payload, but make perServing if OFF provides it
    const per100 = mapped; // existing per-100g mapped object

    const perServing = hasPerServing ? {
      kcal: nutr['energy-kcal_serving'] ?? nutr['energy_serving'],
      fat: nutr['fat_serving'],
      sat_fat: nutr['saturated-fat_serving'],
      carbs: nutr['carbohydrates_serving'],
      sugar: nutr['sugars_serving'],
      fiber: nutr['fiber_serving'],
      protein: nutr['proteins_serving'],
      sodium: nutr['sodium_serving'],
    } : (serving_g ? {
          energyKcal: +( (per100.energyKcal ?? 0) * (serving_g/100) ).toFixed(2),
          protein_g:  +( (per100.protein_g  ?? 0) * (serving_g/100) ).toFixed(2),
          carbs_g:    +( (per100.carbs_g    ?? 0) * (serving_g/100) ).toFixed(2),
          sugar_g:    +( (per100.sugar_g    ?? 0) * (serving_g/100) ).toFixed(2),
          fat_g:      +( (per100.fat_g      ?? 0) * (serving_g/100) ).toFixed(2),
          satfat_g:   +( (per100.satfat_g   ?? 0) * (serving_g/100) ).toFixed(2),
          fiber_g:    +( (per100.fiber_g    ?? 0) * (serving_g/100) ).toFixed(2),
          sodium_mg:  +( (per100.sodium_mg  ?? 0) * (serving_g/100) ).toFixed(0),
        } : null);

    // Score: Guard ScoreEngine, no constant default
    const engineOn = import.meta.env.VITE_SCORE_ENGINE_V1 === 'true';
    const engineFixes = import.meta.env.VITE_ENGINE_V1_FIXES === 'true';

    const hasAny = ['energyKcal','sugar_g','sodium_mg','satfat_g','fiber_g','protein_g']
      .some(k => per100?.[k] != null && !Number.isNaN(+(per100?.[k] || 0)));
    
    if (import.meta.env.VITE_DEBUG_PERF === 'true') {
      console.info('[ADAPTER][BARCODE.ENGINE_INPUT]', {
        engine_flag: engineOn,
        hasAny,
        inputs: {
          energy_kcal_100g: mapped.energyKcal,
          sugar_g_100g:     mapped.sugar_g,
          sodium_mg_100g:   mapped.sodium_mg,
          satfat_g_100g:    mapped.satfat_g,
          fiber_g_100g:     mapped.fiber_g,
          protein_g_100g:   mapped.protein_g,
        }
      });
    }

    let score10: number | undefined = undefined;

    if (engineOn && hasAny) {
      const res = calculateHealthScore({
        name: p.product_name || p.generic_name || '',
        nutrition: {
          calories: per100.energyKcal,
          protein_g: per100.protein_g,
          carbs_g: per100.carbs_g,
          fat_g: per100.fat_g,
          sugar_g: per100.sugar_g,
          fiber_g: per100.fiber_g,
          sodium_mg: per100.sodium_mg,
          saturated_fat_g: per100.satfat_g,
        },
        ingredientsText: ingredients_text,
        novaGroup: p.nova_group,
        engineFixes       // pass through to engine
      });
      score10 = toFinal10(res.final ?? res.score);
    } else {
      // No invented constants. If a legit numeric legacy exists, normalize once; else leave undefined.
      const legacy = (p as any)?.health?.score;
      score10 = typeof legacy === 'number' ? (legacy <= 10 ? legacy : Math.round(legacy/10)) : undefined;
    }

    if (import.meta.env.VITE_DEBUG_PERF === 'true') {
      console.info('[ADAPTER][BARCODE.SCORE_OUT]', {
        score10, used_legacy_score: p?.health?.score != null
      });
    }


    // Map all OFF/legacy variants and parse textual serving_size to grams
    const rawServingSizeTxt =
      p?.serving_size ??
      nutr?.serving_size ??
      nutr?.['serving-size'] ?? null;

    const parsedServingG =
      p?.serving_size_g ??
      nutr?.serving_size_g ??
      parseServingSizeTextToGrams(rawServingSizeTxt) ??
      (p?.serving_quantity && /g/i.test(p?.serving_unit || '')
        ? Number(p.serving_quantity)
        : null);

    // Extract calories for ratio calculation
    const kcal100 =
      num(nutr['energy-kcal_100g']) ??
      kjToKcal(num(nutr['energy_100g'])) ??      // some OFF datasets use kJ under `energy_100g`
      kjToKcal(num(nutr['energy-kj_100g']));

    const kcalServing =
      num(nutr['energy-kcal_serving']) ??
      kjToKcal(num(nutr['energy_serving'])) ??   // kJ per serving
      kjToKcal(num(nutr['energy-kj_serving']));

    // Debug raw fields
    console.log('[ADAPTER][BARCODE.OUT][SERVING_KEYS]', {
      raw_serving_size: rawServingSizeTxt,
      serving_size_g: p?.serving_size_g,
      nutriments_serving_size_g: nutr?.serving_size_g,
      parsedServingG,
      nutriments_energy_kcal_100g: nutr['energy-kcal_100g'],
      nutriments_energy_kcal_serving: nutr['energy-kcal_serving']
    });

    // Map product name and HTTP image from OFF data
    const offImg =
      p.image_front_small_url ||
      p.image_small_url ||
      p.image_front_url ||
      p.image_url;

    // Map product name with OFF precedence
    const productName = 
      p.product_name || 
      p.generic_name || 
      (p.brands_tags && p.brands_tags[0]) || 
      p.brands || 
      p.product_name_en || 
      'Unknown item';

    const legacy = {
      status: 'ok' as const,
      productName,
      productImageUrl: httpOnly(offImg),
      nutriments: raw,
      nutritionData: {
        ...per100,
        // legacy aliases many panels read:
        calories: per100.energyKcal, protein: per100.protein_g, carbs: per100.carbs_g,
        sugars_g: per100.sugar_g, fat: per100.fat_g, saturated_fat_g: per100.satfat_g,
        fiber: per100.fiber_g, sodium: per100.sodium_mg,
        per100: { ...(per100 || {}), calories: kcal100 },
        perServing: kcalServing !== undefined 
          ? { ...(perServing || {}), calories: kcalServing }
          : perServing,
        nutritionPropType: perServing ? 'perServing' : 'per100',
        serving_size_g: parsedServingG ?? null,
      },
      // attach for resolver (top-level + nutrition mirror)
      serving_size_g: parsedServingG ?? null,
      serving_size: rawServingSizeTxt ?? null,
      nutrition: {
        ...mapped,
        serving_size_g: parsedServingG ?? null,
      },
      // guaranteed per-serving alias for UI
      nutritionDataPerServing: perServing,   // <-- canonical
      perServing,                           // <-- keep old name as alias, harmless
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


    // Debug performance logging with structured logs
    console.log("[ADAPTER][BARCODE.OUT]", {
      rev: CONFIRM_FIX_REV, 
      productName: legacy.productName, 
      productImageUrlLen: (legacy.productImageUrl||"").length
    });
    
    if (import.meta.env.VITE_DEBUG_CONFIRM === 'true' || import.meta.env.VITE_DEBUG_PERF === 'true') {
      console.info('[ADAPTER][BARCODE.OUT]', {
        productName: legacy.productName,
        productImageUrlLen: legacy.productImageUrl?.length || 0,
        healthScore: score10,
        flags_count: flags?.length || 0,
        per100g: { kcal: per100.energyKcal, sugar_g: per100.sugar_g, sodium_mg: per100.sodium_mg },
        perServing: {
          kcal: perServing?.energyKcal,
          sugar_g: perServing?.sugar_g,
          sodium_mg: perServing?.sodium_mg
        },
        serving_size: servingTxt,
        serving_size_g
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
  
  // Map image with HTTP guard for non-barcode path
  const imageUrl = 
    p.image_front_small_url ||
    p.image_small_url ||
    p.image_front_url ||
    p.image_url ||
    p.image ||
    envelope?.imageUrl || '';

  let legacy = {
    status: 'ok' as 'ok' | 'no_detection' | 'not_found',
    productName: extractedName,
    productImageUrl: httpOnly(imageUrl),
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

  console.log("[ADAPTER][OUT]", {
    rev: CONFIRM_FIX_REV, 
    productName: legacy.productName, 
    hasImg: !!legacy.productImageUrl
  });
  
  if (import.meta.env.VITE_DEBUG_CONFIRM === 'true' || import.meta.env.DEV) {
    console.log('[ADAPTER][OUT]', {
      productName: legacy.productName,
      productImageUrlLen: legacy.productImageUrl?.length || 0,
      score: legacy.healthScore,
      hasNutr: !!legacy.nutritionData && Object.keys(legacy.nutritionData).length > 0
    });
  }

  return legacy;
}
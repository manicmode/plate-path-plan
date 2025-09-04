// Legacy Food Item Adapter for FoodConfirmationCard
// Maps various data formats from detection/report pipelines to legacy card expectations

import { useNutritionStore, generateFoodId, type NutritionAnalysis } from '@/stores/nutritionStore';

export type LegacyNutrition = {
  calories?: number;
  protein?: number; 
  carbs?: number; 
  fat?: number;
  sugar?: number; 
  fiber?: number; 
  sodium?: number;
  // Per-gram basis for live recompute on portion changes
  perGram?: Partial<Record<'calories'|'protein'|'carbs'|'fat'|'sugar'|'fiber'|'sodium', number>>;
  basis?: 'per100g' | 'perServing' | 'perGram';
  servingGrams?: number; // if perServing basis
};

export type LegacyAnalysis = {
  healthScore?: number;
  flags?: Array<{ id?: string; label: string; level?: 'warn'|'info'|'good'|'danger'|'warning' }>;
  ingredients?: string[];            // flat list for Ingredients tab
  source?: string;                   // 'ocr' | 'base' | 'est' | 'db'
  confidence?: number;               // 0..1
  imageUrl?: string;
  dataSourceLabel?: string;          // appears under panel
};

export type LegacyFoodItem = {
  id: string;
  name: string;
  grams: number;                     // current portion grams
  baseGrams: number;                 // default portion grams (slider 100%)
  
  // FoodConfirmationCard expected format
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  
  // Scaling data for portion slider (FoodConfirmationCard format)
  basePer100?: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g: number;
    sugar_g: number;
    sodium_mg: number;
  } | null;
  portionGrams?: number | null;      // current portion in grams
  factor?: number;                   // scaling factor for portion
  
  // Additional FoodConfirmationCard properties
  image?: string;
  imageUrl?: string;
  barcode?: string;
  ingredientsText?: string;
  ingredientsAvailable?: boolean;
  source?: string;
  confidence?: number;
  allergens?: string[];
  additives?: string[];
  categories?: string[];
  
  // Legacy analysis data (for backwards compatibility)
  nutrition?: LegacyNutrition;
  analysis?: LegacyAnalysis;
};

type AnyItem = Record<string, any>;

const pick = <T = any>(...vals: any[]): T | undefined => vals.find(v => v !== undefined && v !== null);

export function toLegacyFoodItem(raw: AnyItem, id: string, enableSST = false): LegacyFoodItem {
  const name = pick<string>(
    raw.displayName, raw.name, raw.productName, raw.title, raw.canonicalName
  ) || `item-${id}`;
  
  // DO NOT recompute id inside this function - use the passed id
  const resolvedId = id;
  
  // Hard diagnostics for ID read path
  if (process.env.NODE_ENV === 'development') {
    const a = useNutritionStore.getState().get(resolvedId);
    const pgSum = a?.perGram ? Object.values(a.perGram).reduce((s:number,v:any)=>s+(+v||0),0) : 0;
    console.log('[SST][ADAPTER_READ]', { id: resolvedId, name, has: !!a, pgSum });
  }
  
  // Flag sanity check
  console.log('[SST][FLAGS]', { ENABLE_SST_CONFIRM_READ: enableSST });

  const baseGrams = Math.round(
    pick<number>(
      raw.portion?.grams, 
      raw.grams, 
      raw.estimatedGrams, 
      raw.portion_estimate, 
      raw.defaultGrams,
      raw.meta?.portion?.grams,
      100
    ) as number
  );

  // Nutrition candidates (prefer detailed analysis)
  const n = raw.analysis?.nutrition ?? raw.nutrition ?? raw.nutritionData ?? raw.meta?.nutrition ?? {};
  const per100 = n.per100g ?? n['per_100g'] ?? raw.meta?.per100g;
  const perServing = n.perServing ?? n['per_serving'] ?? raw.meta?.perPortion;

  // Phase 1: Read from store first if SST enabled using the unified ID
  let perGram: LegacyNutrition['perGram'] = {};
  let storeAnalysis: NutritionAnalysis | undefined;
  
  if (enableSST) {
    storeAnalysis = useNutritionStore.getState().get(resolvedId);
    if (storeAnalysis?.perGram && Object.values(storeAnalysis.perGram).some(v => (v ?? 0) > 0)) {
      perGram = { ...storeAnalysis.perGram };
      console.log('[SST][read]', { id: resolvedId, name, source: 'store', perGram });
    }
  }
  
  // choose a basis (per-100g or per-serving grams)
  let baseFrom:
    | { basis: 'per100g'; div: number; src: any }
    | { basis: 'perServing'; div: number; src: any }
    | undefined;

  if (!Object.keys(perGram).length) {
    if (per100) {
      baseFrom = { basis: 'per100g', div: 100, src: per100 };
    } else if (perServing) {
      const servingGrams =
        raw.analysis?.servingGrams ||
        raw.meta?.servingGrams ||
        raw.serving?.grams;
      if (servingGrams && servingGrams > 0) {
        baseFrom = { basis: 'perServing', div: servingGrams, src: perServing };
      }
    }

    if (baseFrom) {
      const keys = ['calories','protein','carbs','fat','sugar','fiber','sodium'] as const;
      for (const k of keys) {
        // Handle generic_foods shapes: protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg
        const srcKey =
          k === 'protein' ? 'protein_g' :
          k === 'carbs'   ? 'carbs_g'   :
          k === 'fat'     ? 'fat_g'     :
          k === 'fiber'   ? 'fiber_g'   :
          k === 'sugar'   ? 'sugar_g'   :
          k === 'sodium'  ? 'sodium_mg' :
          k;

        const v =
          baseFrom.src?.[k] ??
          baseFrom.src?.[srcKey] ??
          n?.[k] ??
          raw.nutrients?.[srcKey];

        if (typeof v === 'number' && v > 0) {
          perGram[k] = v / baseFrom.div;
          if (process.env.NODE_ENV === 'development') {
            console.log('[SST][PERGRAM][CALC]', {
              item: raw.name, key: k, value: v, divisor: baseFrom.div, perGram: perGram[k]
            });
          }
        }
      }
    }
  }

  // Use store data if available and SST enabled
  const healthScore = storeAnalysis?.healthScore ?? pick<number>(
    raw.analysis?.healthScore, 
    raw.healthScore, 
    raw.score,
    raw.meta?.healthScore
  );
  
  const flags = storeAnalysis?.flags ?? pick<any[]>(
    raw.analysis?.flags, 
    raw.flags, 
    raw.healthFlags,
    raw.meta?.flags
  ) ?? [];
  
  const ingredients = storeAnalysis?.ingredients ?? pick<string[]>(
    raw.analysis?.ingredients, 
    raw.ingredients, 
    raw.ingredientList,
    raw.meta?.ingredients
  ) ?? [];
  
  const confidence = storeAnalysis?.confidence ?? pick<number>(raw.confidence, raw.analysis?.confidence);
  const imageUrl = storeAnalysis?.imageUrl ?? pick<string>(
    raw.image, 
    raw.imageUrl, 
    raw.productImageUrl, 
    raw.photoUrl,
    raw.image_url
  );

  const dataSourceLabel = raw.analysis?.dataSourceLabel
    ?? raw.meta?.dataSourceLabel
    ?? (raw.source ? `${raw.source} lookup` : 'Database lookup');

  // Build basePer100 for FoodConfirmationCard portion scaling
  let basePer100 = null;
  if (baseFrom) {
    basePer100 = {
      calories: pick<number>(baseFrom.src?.calories, n?.calories) || 0,
      protein_g: pick<number>(baseFrom.src?.protein, baseFrom.src?.protein_g, n?.protein, n?.protein_g) || 0,
      carbs_g: pick<number>(baseFrom.src?.carbs, baseFrom.src?.carbs_g, n?.carbs, n?.carbs_g) || 0,
      fat_g: pick<number>(baseFrom.src?.fat, baseFrom.src?.fat_g, n?.fat, n?.fat_g) || 0,
      fiber_g: pick<number>(baseFrom.src?.fiber, baseFrom.src?.fiber_g, n?.fiber, n?.fiber_g) || 0,
      sugar_g: pick<number>(baseFrom.src?.sugar, baseFrom.src?.sugar_g, n?.sugar, n?.sugar_g) || 0,
      sodium_mg: pick<number>(baseFrom.src?.sodium, baseFrom.src?.sodium_mg, n?.sodium, n?.sodium_mg) || 0,
    };
  }

  return {
    id: resolvedId,
    name,
    grams: baseGrams,
    baseGrams,
    
    // Current nutrition values for display
    calories: pick<number>(n.calories, raw.calories) || 100,
    protein: pick<number>(n.protein, n.protein_g, raw.protein) || 0,
    carbs: pick<number>(n.carbs, n.carbs_g, raw.carbs) || 0,
    fat: pick<number>(n.fat, n.fat_g, raw.fat) || 0,
    fiber: pick<number>(n.fiber, n.fiber_g, raw.fiber) || 0,
    sugar: pick<number>(n.sugar, n.sugar_g, raw.sugar) || 0,
    sodium: pick<number>(n.sodium, n.sodium_mg, raw.sodium) || 0,
    
    // Scaling data for FoodConfirmationCard
    basePer100,
    portionGrams: baseGrams,
    factor: baseGrams / 100, // Convert grams to per-100g scaling factor
    
    // Additional properties
    image: imageUrl,
    imageUrl,
    barcode: raw.barcode,
    ingredientsText: ingredients.join(', '),
    ingredientsAvailable: ingredients.length > 0,
    source: raw.source ?? raw.analysis?.source ?? 'db',
    confidence,
    allergens: raw.allergens || [],
    additives: raw.additives || [],
    categories: raw.categories || [],
    
    // Legacy compatibility
    nutrition: {
      calories: pick<number>(n.calories, raw.calories),
      protein: pick<number>(n.protein, n.protein_g, raw.protein),
      carbs: pick<number>(n.carbs, n.carbs_g, raw.carbs),
      fat: pick<number>(n.fat, n.fat_g, raw.fat),
      sugar: pick<number>(n.sugar, n.sugar_g, raw.sugar),
      fiber: pick<number>(n.fiber, n.fiber_g, raw.fiber),
      sodium: pick<number>(n.sodium, n.sodium_mg, raw.sodium),
      perGram,
      basis: baseFrom?.basis ?? 'perGram',
      servingGrams: baseFrom?.basis === 'perServing' ? baseFrom.div : undefined,
    },
    analysis: {
      healthScore,
      flags: flags.map(f => ({
        id: f.id || f.type,
        label: f.label || f.name || f.message,
        level: f.level || f.severity || 'info'
      })),
      ingredients,
      source: raw.source ?? raw.analysis?.source ?? 'db',
      confidence,
      imageUrl,
      dataSourceLabel,
    }
  };
}

// Helper function to recompute nutrition based on portion grams
export function computePortionNutrition(item: LegacyFoodItem, grams: number) {
  const pg = item.nutrition?.perGram || {};
  const out: any = {};
  
  for (const k of ['calories', 'protein', 'carbs', 'fat', 'sugar', 'fiber', 'sodium'] as const) {
    const vpg = pg[k];
    if (typeof vpg === 'number') {
      out[k] = k === 'calories' 
        ? Math.round(vpg * grams)
        : +(vpg * grams).toFixed(1);
    }
  }
  
  return out;
}
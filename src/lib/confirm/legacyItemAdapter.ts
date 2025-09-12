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

const n0 = (v: any) => (Number.isFinite(+v) ? +v : 0);

function per100ToPerGram(per100?: {
  calories?: number; protein?: number; carbs?: number; fat?: number;
  fiber?: number; sugar?: number; sodium?: number; sodiumMg?: number;
}): Record<string, number> | null {
  if (!per100) return null;
  const sodiumG = per100.sodium ?? (per100.sodiumMg ? per100.sodiumMg/1000 : 0);
  return {
    calories: n0(per100.calories)/100,
    protein:   n0(per100.protein)/100,
    carbs:     n0(per100.carbs)/100,
    fat:       n0(per100.fat)/100,
    fiber:     n0(per100.fiber)/100,
    sugar:     n0(per100.sugar)/100,
    sodium:    n0(sodiumG)/100,
  };
}

export function toLegacyFoodItem(raw: AnyItem, index: number | string, enableSST = false): LegacyFoodItem {
  const name = pick<string>(
    raw.displayName, raw.name, raw.productName, raw.title, raw.canonicalName
  ) || `item-${typeof index === 'string' ? index : index + 1}`;
  
  // DO NOT recompute the id; use the one passed in
  const resolvedId = typeof index === 'string' ? index : (raw.foodId ?? raw.id ?? raw.storeId ?? generateFoodId(raw));
  
  const src: 'manual'|'photo'|'barcode'|undefined = (raw as any).source;
  
  // Early return for manual (preserve existing macros and serving data)
  if (src === 'manual') {
    const servingG = raw.label?.servingSizeG ?? raw.servingG ?? raw.grams ?? 100;
    const perServing = raw.label?.macrosPerServing || {};
    const safe = (v: any) => typeof v === 'number' && !isNaN(v) ? v : 0;
    
    return {
      id: resolvedId,
      name,
      grams: servingG,
      baseGrams: servingG,
      source: 'manual',
      servingG: servingG,
      servingLabel: raw.label?.servingLabel || `Per serving (${servingG} g)`,
      calories: safe(perServing.calories ?? raw.calories),
      protein: safe(perServing.protein_g ?? raw.protein),
      carbs: safe(perServing.carbs_g ?? raw.carbs),
      fat: safe(perServing.fat_g ?? raw.fat),
      fiber: safe(perServing.fiber_g ?? raw.fiber),
      sugar: safe(perServing.sugar_g ?? raw.sugar),
      sodium: safe(perServing.sodium_mg ?? raw.sodium),
      basePer100: null,
      portionGrams: servingG,
      factor: 1,
      imageUrl: raw.imageUrl,
      barcode: raw.barcode,
      ingredientsText: '',
      ingredientsAvailable: false,
      confidence: raw.confidence,
      allergens: [],
      additives: [],
      categories: [],
      nutrition: {
        calories: safe(perServing.calories ?? raw.calories),
        protein: safe(perServing.protein_g ?? raw.protein),
        carbs: safe(perServing.carbs_g ?? raw.carbs),
        fat: safe(perServing.fat_g ?? raw.fat),
        sugar: safe(perServing.sugar_g ?? raw.sugar),
        fiber: safe(perServing.fiber_g ?? raw.fiber),
        sodium: safe(perServing.sodium_mg ?? raw.sodium),
        basis: 'perServing',
        servingGrams: servingG,
      },
      analysis: {
        healthScore: raw.healthScore,
        flags: [],
        ingredients: [],
        source: 'manual',
        confidence: raw.confidence,
        imageUrl: raw.imageUrl,
        dataSourceLabel: null,
      }
    } as LegacyFoodItem;
  }
  
  // Flag sanity check
  console.log('[SST][FLAGS]', { ENABLE_SST_CONFIRM_READ: enableSST });

  // Initial grams used by confirm card
  const initialGrams = pick<number>(
    raw.grams,
    raw.portionGrams,
    raw.baseGrams,
    (raw.source === 'barcode' ? raw?.label?.servingSizeG : undefined),
    100
  );

  const baseGrams = Math.round(initialGrams as number);

  // Nutrition candidates (prefer detailed analysis)
  const n = raw.analysis?.nutrition ?? raw.nutrition ?? raw.nutritionData ?? raw.meta?.nutrition ?? {};
  const per100 = n.per100g ?? n['per_100g'] ?? raw.meta?.per100g;
  const perServing = n.perServing ?? n['per_serving'] ?? raw.meta?.perPortion;

  // Read store analysis
  const store = useNutritionStore.getState();
  const storeAnalysis = store.byId?.[resolvedId];
  const storePerGram = storeAnalysis?.perGram;
  
  // Build perGram with priority:
  // 1. storePerGram
  // 2. raw.nutrition?.perGram  
  // 3. From raw.nutrition?.per100 → divide by 100
  // 4. From raw.nutrition?.perServing + servingSizeG → divide by serving grams
  let finalPerGram: LegacyNutrition['perGram'] = storePerGram || raw.nutrition?.perGram;
  
  // If missing, derive from per100 or serving + servingSizeG
  if (!Object.keys(finalPerGram).length) {
    const p100 = raw.nutrition?.per100g || raw.basePer100 || per100;
    if (p100) {
      finalPerGram = {
        calories: n0(p100.calories) / 100,
        protein:  n0(p100.proteinG || p100.protein_g || p100.protein) / 100,
        carbs:    n0(p100.carbsG   || p100.carbs_g || p100.carbs)   / 100,
        fat:      n0(p100.fatG     || p100.fat_g || p100.fat)     / 100,
        fiber:    n0(p100.fiberG   || p100.fiber_g || p100.fiber)   / 100,
        sugar:    n0(p100.sugarG   || p100.sugar_g || p100.sugar)   / 100,
        sodium:   n0(p100.sodium   || p100.sodium_g) / 100,
      };
    } else if (raw.nutrition?.perServing?.calories && raw.label?.servingSizeG) {
      const s = n0(raw.label.servingSizeG);
      finalPerGram = {
        calories: n0(raw.nutrition.perServing.calories) / s,
        protein:  n0(raw.nutrition.perServing.protein_g || raw.nutrition.perServing.protein) / s,
        carbs:    n0(raw.nutrition.perServing.carbs_g || raw.nutrition.perServing.carbs)   / s,
        fat:      n0(raw.nutrition.perServing.fat_g || raw.nutrition.perServing.fat)     / s,
        fiber:    n0(raw.nutrition.perServing.fiber_g || raw.nutrition.perServing.fiber)   / s,
        sugar:    n0(raw.nutrition.perServing.sugar_g || raw.nutrition.perServing.sugar)   / s,
        sodium:   n0(raw.nutrition.perServing.sodium_g || raw.nutrition.perServing.sodium) / s,
      };
    }
  }
  
  if (finalPerGram && !finalPerGram.calories) {
    const kcal = (n0(finalPerGram.protein)*4) + (n0(finalPerGram.carbs)*4) + (n0(finalPerGram.fat)*9);
    if (kcal > 0) finalPerGram.calories = kcal;
  }

  // Robust alias map to handle generic_foods.json variants
  const nutrientAliases: Record<string, string[]> = {
    calories: ['calories', 'energy_kcal', 'energy.kcal', 'kcal', 'energy'],
    protein: ['protein', 'protein_g', 'proteins'],
    carbs:   ['carbohydrates_total_g','carbohydrates_g','carbohydrates','carbohydrate','carbohydrate_g','carbs','carbs_g','total_carbohydrate_g'],
    fat:     ['fat_total_g','total_fat_g','fat','fat_g','fats','lipids','total_fat'],
    sugar:   ['sugar_g','sugars','sugars_g','sugar','sugars_total_g','total_sugars_g'],
    fiber:   ['fiber_g','dietary_fiber_g','fibre_g','fiber','fibre','total_dietary_fiber_g'],
    sodium:  ['sodium_mg','sodium','salt_mg','salt','sodium_milligrams'],
  };

  // Determine basis & source
  let sourceData: any = null;
  let divisor = 1;
  let basis: 'per100g' | 'perServing' | 'rawNutrients' | 'unknown' = 'unknown';

  if (!Object.keys(finalPerGram).length) {
    if (per100 && typeof per100 === 'object') {
      sourceData = per100; divisor = 100; basis = 'per100g';
    } else if (perServing && typeof perServing === 'object') {
      const servingGrams =
        raw.analysis?.servingGrams || raw.meta?.servingGrams || raw.serving?.grams || raw.nutrients?.serving?.grams;
      if (servingGrams && servingGrams > 0) {
        sourceData = perServing; divisor = servingGrams; basis = 'perServing';
      }
    } else if (raw.nutrients && typeof raw.nutrients === 'object') {
      sourceData = raw.nutrients; divisor = 100; basis = 'rawNutrients';
    }

    if (sourceData && divisor > 0) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[SST][BASIS]', { item: name, basis, divisor, sourceKeys: Object.keys(sourceData).slice(0, 8) });
      }

      for (const [nutrientKey, aliases] of Object.entries(nutrientAliases)) {
        let value: number | undefined;
        let foundKey: string | undefined;

        for (const alias of aliases) {
          const v1 = sourceData[alias];
          if (typeof v1 === 'number' && v1 > 0) { value = v1; foundKey = alias; break; }

          const v2 = sourceData?.nutrients?.[alias];
          if (typeof v2 === 'number' && v2 > 0) { value = v2; foundKey = `nutrients.${alias}`; break; }
        }

        if (value !== undefined && foundKey) {
          finalPerGram[nutrientKey as keyof typeof finalPerGram] = value / divisor;
          if (process.env.NODE_ENV === 'development') {
            console.log('[SST][PERGRAM][CALC]', {
              item: name, nutrient: nutrientKey, foundKey, rawValue: value, divisor, perGram: value / divisor, basis
            });
          }
        } else {
          if (process.env.NODE_ENV === 'development') {
            console.warn('[SST][PERGRAM][MISS]', {
              item: name, nutrient: nutrientKey, basis,
              availableKeys: Object.keys(sourceData).filter(k => typeof (sourceData as any)[k] === 'number').slice(0, 8)
            });
          }
        }
      }
    } else if (process.env.NODE_ENV === 'development') {
      console.warn('[SST][NO_BASIS]', {
        item: name, hasPer100: !!per100, hasPerServing: !!perServing, hasRawNutrients: !!raw.nutrients,
        rawKeys: raw.nutrients ? Object.keys(raw.nutrients).slice(0, 8) : []
      });
    }
  }

  // Final adapter diagnostics
  if (process.env.NODE_ENV === 'development') {
    const pgSum = Object.values(finalPerGram || {}).reduce((sum, v: any) => sum + (+v || 0), 0);
    console.log('[SST][ADAPTER_READ]', {
      passedId: resolvedId,
      generatedId: generateFoodId(raw),
      idsMatch: resolvedId === generateFoodId(raw),
      name,
      hasStoreData: !!storeAnalysis?.perGram,
      storePerGram: storeAnalysis?.perGram,
      computedPerGram: finalPerGram,
      pgSum,
    });
  }

  // Adapter summary (always once per item)
  try {
    console.log('[ADAPTER]', {
      id: resolvedId,
      hasPG: !!finalPerGram && Object.keys(finalPerGram).length > 0,
      basis: finalPerGram && Object.keys(finalPerGram).length > 0 ? 'perGram' : 'legacy'
    });
  } catch {}

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
  
  // Enhanced image URL selection
  const imageUrl = pick<string>(
    raw.imageUrl,
    raw.photoUrl,
    raw.selectedImage,
    raw.directImg,
    raw.imageThumbUrl,
    storeAnalysis?.imageUrl,
    raw.image,
    raw.productImageUrl,
    raw.image_url
  );

  const dataSourceLabel = raw.analysis?.dataSourceLabel
    ?? raw.meta?.dataSourceLabel
    ?? null;

  // Build basePer100 for FoodConfirmationCard portion scaling
  let basePer100 = null;
  if (sourceData && divisor > 0) {
    basePer100 = {
      calories: pick<number>(sourceData?.calories, n?.calories) || 0,
      protein_g: pick<number>(sourceData?.protein, sourceData?.protein_g, n?.protein, n?.protein_g) || 0,
      carbs_g: pick<number>(sourceData?.carbs, sourceData?.carbs_g, n?.carbs, n?.carbs_g) || 0,
      fat_g: pick<number>(sourceData?.fat, sourceData?.fat_g, n?.fat, n?.fat_g) || 0,
      fiber_g: pick<number>(sourceData?.fiber, sourceData?.fiber_g, n?.fiber, n?.fiber_g) || 0,
      sugar_g: pick<number>(sourceData?.sugar, sourceData?.sugar_g, n?.sugar, n?.sugar_g) || 0,
      sodium_mg: pick<number>(sourceData?.sodium, sourceData?.sodium_mg, n?.sodium, n?.sodium_mg) || 0,
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
      perGram: finalPerGram,
      basis: basis === 'unknown' || basis === 'rawNutrients' ? 'perGram' : basis,
      servingGrams: basis === 'perServing' ? divisor : undefined,
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
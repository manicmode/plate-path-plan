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

export function toLegacyFoodItem(raw: AnyItem, index: number | string, enableSST = false): LegacyFoodItem {
  // Early return for manual items - do NOT override with store or perGram
  if (raw?.source === 'manual') {
    const servingG = raw?.label?.servingSizeG ?? raw?.servingG ?? 100;
    const perServing = raw?.label?.macrosPerServing || {};
    
    return {
      id: typeof index === 'string' ? index : (raw.foodId ?? raw.id ?? generateFoodId(raw)),
      name: raw?.name || `item-${typeof index === 'string' ? index : index + 1}`,
      grams: servingG,
      baseGrams: servingG,
      calories: perServing.calories ?? raw?.calories ?? 100,
      protein: perServing.protein_g ?? raw?.protein ?? 0,
      carbs: perServing.carbs_g ?? raw?.carbs ?? 0,
      fat: perServing.fat_g ?? raw?.fat ?? 0,
      fiber: perServing.fiber_g ?? raw?.fiber ?? 0,
      sugar: perServing.sugar_g ?? raw?.sugar ?? 0,
      sodium: perServing.sodium_mg ?? raw?.sodium ?? 0,
      basePer100: null,
      portionGrams: servingG,
      factor: servingG / 100,
      source: 'manual',
      confidence: raw?.confidence,
      nutrition: {
        perServing: perServing,
        basis: 'perServing',
        servingGrams: servingG,
      },
      analysis: {
        source: 'manual',
        confidence: raw?.confidence,
      }
    } as LegacyFoodItem;
  }

  const name = pick<string>(
    raw.displayName, raw.name, raw.productName, raw.title, raw.canonicalName
  ) || `item-${typeof index === 'string' ? index : index + 1}`;
  
  // DO NOT recompute the id; use the one passed in
  const resolvedId = typeof index === 'string' ? index : (raw.foodId ?? raw.id ?? raw.storeId ?? generateFoodId(raw));
  
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

  // Pull any existing analysis from the store (for final diagnostics)
  const storeAnalysis = useNutritionStore.getState().get(resolvedId);
  
  // Phase 1: Read from store first if SST enabled using the unified ID
  let perGram: LegacyNutrition['perGram'] = {};
  
  if (enableSST) {
    if (storeAnalysis?.perGram && Object.values(storeAnalysis.perGram).some(v => (v ?? 0) > 0)) {
      perGram = { ...storeAnalysis.perGram };
      console.log('[SST][read]', { id: resolvedId, name, source: 'store', perGram });
    }
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

  if (!Object.keys(perGram).length) {
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
          perGram[nutrientKey as keyof typeof perGram] = value / divisor;
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
    const pgSum = Object.values(perGram || {}).reduce((sum, v: any) => sum + (+v || 0), 0);
    console.log('[SST][ADAPTER_READ]', {
      passedId: resolvedId,
      generatedId: generateFoodId(raw),
      idsMatch: resolvedId === generateFoodId(raw),
      name,
      hasStoreData: !!storeAnalysis?.perGram,
      storePerGram: storeAnalysis?.perGram,
      computedPerGram: perGram,
      pgSum,
    });
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
  const imageUrl = pick<string>(
    raw.image, 
    raw.imageUrl, 
    raw.productImageUrl, 
    raw.photoUrl,
    raw.image_url
  ) ?? storeAnalysis?.imageUrl; // ✅ Prefer raw imageUrl over storeAnalysis

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
      perGram,
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
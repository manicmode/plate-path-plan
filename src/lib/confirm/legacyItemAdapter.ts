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

  // Guarantee per-gram nutrition + carry image for PHOTO + BARCODE flows
  const isPhotoSource = raw.source === 'photo';
  const isBarcodeSource = raw.source === 'barcode';

  if (!Object.keys(perGram).length && (isPhotoSource || isBarcodeSource)) {
    if (isPhotoSource) {
      // PHOTO items: use existing perGram or derive from basePer100/per100
      if (raw.nutrition?.perGram) {
        perGram = { ...raw.nutrition.perGram };
      } else {
        const per100Like = raw.basePer100 || raw.per100 || per100;
        const computed = per100ToPerGram(per100Like);
        if (computed) {
          perGram = computed;
          // If calories missing, compute from macros
          if (!perGram.calories && (perGram.protein || perGram.carbs || perGram.fat)) {
            perGram.calories = (perGram.protein || 0) * 4 + (perGram.carbs || 0) * 4 + (perGram.fat || 0) * 9;
          }
        }
      }
    } else if (isBarcodeSource) {
      // BARCODE items: derive from perServing or per100g
      const servingSizeG = raw.label?.servingSizeG || raw.nutrition?.servingGrams || raw.servingGrams;
      if (servingSizeG && raw.nutrition?.perServing) {
        // Build perGram from perServing
        const serving = raw.nutrition.perServing;
        perGram = {
          calories: n0(serving.calories) / servingSizeG,
          protein: n0(serving.protein) / servingSizeG,
          carbs: n0(serving.carbs) / servingSizeG,
          fat: n0(serving.fat) / servingSizeG,
          fiber: n0(serving.fiber) / servingSizeG,
          sugar: n0(serving.sugar) / servingSizeG,
          sodium: n0(serving.sodium) / servingSizeG,
        };
      } else {
        // Derive from per100g
        const per100Like = raw.nutrition?.per100g || per100;
        const computed = per100ToPerGram(per100Like);
        if (computed) {
          perGram = computed;
        }
      }
      
      // If calories missing, compute from macros
      if (!perGram.calories && (perGram.protein || perGram.carbs || perGram.fat)) {
        perGram.calories = (perGram.protein || 0) * 4 + (perGram.carbs || 0) * 4 + (perGram.fat || 0) * 9;
      }
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
  
  // Enhanced image URL selection for PHOTO and BARCODE flows
  let imageUrl = storeAnalysis?.imageUrl;
  if (!imageUrl) {
    if (isPhotoSource) {
      // PHOTO: prefer captured photo, then enrichment sources
      imageUrl = pick<string>(
        raw.imageUrl, 
        raw.photoUrl, 
        raw.selectedImage, 
        raw.directImg,
        raw.image,
        raw.productImageUrl
      );
    } else if (isBarcodeSource) {
      // BARCODE: prefer OFF images, then other sources
      imageUrl = pick<string>(
        raw.imageUrl,
        raw.imageThumbUrl,
        raw.directImg,
        raw.image,
        raw.productImageUrl
      );
    } else {
      // Default fallback for other sources
      imageUrl = pick<string>(
        raw.image, 
        raw.imageUrl, 
        raw.productImageUrl, 
        raw.photoUrl,
        raw.image_url
      );
    }
  }

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
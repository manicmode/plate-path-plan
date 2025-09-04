// Legacy Food Item Adapter for FoodConfirmationCard
// Maps various data formats from detection/report pipelines to legacy card expectations

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

export function toLegacyFoodItem(raw: AnyItem, index: number): LegacyFoodItem {
  const name = pick<string>(
    raw.displayName, raw.name, raw.productName, raw.title, raw.canonicalName
  ) || `item-${index + 1}`;

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

  // Build per-gram basis for recompute
  const perGram: LegacyNutrition['perGram'] = {};
  let baseFrom = null;

  if (per100) {
    baseFrom = { basis: 'per100g' as const, div: 100, src: per100 };
  } else if (perServing && (raw.analysis?.servingGrams || raw.meta?.servingGrams)) {
    const servingGrams = raw.analysis?.servingGrams || raw.meta?.servingGrams;
    baseFrom = { basis: 'perServing' as const, div: servingGrams, src: perServing };
  }

  if (baseFrom) {
    for (const k of ['calories', 'protein', 'carbs', 'fat', 'sugar', 'fiber', 'sodium'] as const) {
      const v = pick<number>(baseFrom.src?.[k], n?.[k]);
      if (typeof v === 'number' && v > 0) {
        perGram[k] = v / baseFrom.div;
      }
    }
  } else {
    // Fallback: use current nutrition values as basis for the current grams
    for (const k of ['calories', 'protein', 'carbs', 'fat', 'sugar', 'fiber', 'sodium'] as const) {
      const v = pick<number>(n?.[k], raw?.[k]);
      if (typeof v === 'number' && v > 0 && baseGrams) {
        perGram[k] = v / baseGrams;
      }
    }
  }

  const healthScore = pick<number>(
    raw.analysis?.healthScore, 
    raw.healthScore, 
    raw.score,
    raw.meta?.healthScore
  );
  
  const flags = pick<any[]>(
    raw.analysis?.flags, 
    raw.flags, 
    raw.healthFlags,
    raw.meta?.flags
  ) ?? [];
  
  const ingredients = pick<string[]>(
    raw.analysis?.ingredients, 
    raw.ingredients, 
    raw.ingredientList,
    raw.meta?.ingredients
  ) ?? [];
  
  const confidence = pick<number>(raw.confidence, raw.analysis?.confidence);
  const imageUrl = pick<string>(
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
    id: String(raw.id ?? raw.uid ?? `idx-${index}`),
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
      basis: baseFrom?.basis,
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
  const pg = item.nutrition.perGram || {};
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
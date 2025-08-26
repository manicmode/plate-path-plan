// Server response interface for barcode products
export interface BarcodeProduct {
  productName: string;
  brand?: string;
  barcode: string;
  imageUrl?: string;

  // Nutrition per OFF serving (raw numbers; grams/mg)
  nutritionSummary?: {
    calories?: number; 
    protein?: number; 
    carbs?: number; 
    fat?: number;
    sugar?: number; 
    fiber?: number; 
    sodium?: number; 
    satFat?: number;
    servingSize?: { amount?: number; unit?: string }; 
  };

  // Ingredients & additives
  ingredients?: string[];             
  ingredientsText?: string;           
  additives?: string[];               
  allergens?: string[];               

  // Derived health info
  healthFlags: Array<{
    type: 'danger' | 'warning' | 'good';
    title: string;
    description?: string;
    icon?: string;
  }>;
  healthScore: number | null;         

  // Optional meta
  offId?: string;
  nova?: number;                      
}

// Client-side LogProduct interface for UI consumption
export interface LogProduct {
  name: string;
  brand?: string;
  barcode: string;
  imageUrl?: string;
  
  // nutrition per base serving
  nutrition: {
    calories?: number; 
    protein?: number; 
    carbs?: number; 
    fat?: number;
    sugar?: number; 
    fiber?: number; 
    sodium?: number; 
    satFat?: number;
    serving?: { amount?: number; unit?: string };
  };
  
  ingredients: string[];
  additives?: string[];
  allergens?: string[];

  healthFlags: Array<{ 
    type: 'danger' | 'warning' | 'good'; 
    title: string; 
    description?: string; 
    icon?: string;
  }>;
  healthScore: number | null;
  nova?: number;
}

/**
 * Map server BarcodeProduct response to client LogProduct
 */
export function mapServerToLogProduct(p: BarcodeProduct): LogProduct {
  return {
    name: p.productName,
    brand: p.brand,
    barcode: p.barcode,
    imageUrl: p.imageUrl,
    nutrition: {
      calories: p.nutritionSummary?.calories,
      protein: p.nutritionSummary?.protein,
      carbs: p.nutritionSummary?.carbs,
      fat: p.nutritionSummary?.fat,
      sugar: p.nutritionSummary?.sugar,
      fiber: p.nutritionSummary?.fiber,
      sodium: p.nutritionSummary?.sodium,
      satFat: p.nutritionSummary?.satFat,
      serving: p.nutritionSummary?.servingSize,
    },
    ingredients: p.ingredients ?? (p.ingredientsText ? [p.ingredientsText] : []),
    additives: p.additives,
    allergens: p.allergens,
    healthFlags: p.healthFlags ?? [],
    healthScore: p.healthScore ?? null,
    nova: p.nova,
  };
}

/**
 * Scale nutrition values by portion percentage
 */
export function scaleNutrition(
  nutrition: LogProduct['nutrition'], 
  portionPct: number
): LogProduct['nutrition'] {
  const factor = portionPct / 100;
  
  return {
    calories: nutrition.calories ? Math.round(nutrition.calories * factor) : undefined,
    protein: nutrition.protein ? Math.round(nutrition.protein * factor * 10) / 10 : undefined,
    carbs: nutrition.carbs ? Math.round(nutrition.carbs * factor * 10) / 10 : undefined,
    fat: nutrition.fat ? Math.round(nutrition.fat * factor * 10) / 10 : undefined,
    sugar: nutrition.sugar ? Math.round(nutrition.sugar * factor * 10) / 10 : undefined,
    fiber: nutrition.fiber ? Math.round(nutrition.fiber * factor * 10) / 10 : undefined,
    sodium: nutrition.sodium ? Math.round(nutrition.sodium * factor) : undefined,
    satFat: nutrition.satFat ? Math.round(nutrition.satFat * factor * 10) / 10 : undefined,
    serving: nutrition.serving,
  };
}
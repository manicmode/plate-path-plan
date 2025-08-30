/**
 * Nutrition portion calculation utilities
 * Converts per 100g values to per portion with portion parsing
 */

export interface NutritionPer100g {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  sugar?: number;
  fiber?: number;
  sodium?: number;
}

export interface PortionInfo {
  grams: number;
  isEstimated: boolean;
  source: 'product' | 'ocr' | 'ocr_declared' | 'ocr_inferred_ratio' | 'db_declared' | 'model_estimate' | 'user_set' | 'estimated' | 'fallback_default';
  confidence?: number; // 0-2, higher = more reliable
  display?: string; // Human-readable display like "1 cup", "2 tbsp"
}

/**
 * Enhanced portion parsing with multiple detection methods
 * Precedence: user_set → ocr_declared → db_declared → ocr_inferred_ratio → model_estimate → fallback_default
 */
export function parsePortionGrams(
  productData?: any,
  ocrText?: string,
  userPreference?: { grams: number; display?: string },
  defaultGrams = 30
): PortionInfo {
  // 1. User override has highest precedence
  if (userPreference?.grams && userPreference.grams > 0) {
    return { 
      grams: userPreference.grams, 
      isEstimated: false, 
      source: 'user_set',
      confidence: 2,
      display: userPreference.display
    };
  }

  // 2. Try OCR declared serving size
  if (ocrText) {
    const ocrDeclared = extractDeclaredPortionFromOCR(ocrText);
    if (ocrDeclared.grams > 0) {
      return ocrDeclared;
    }
  }

  // 3. Try product data/database
  if (productData?.serving_size) {
    const grams = parseServingSize(productData.serving_size);
    if (grams > 0) {
      return { 
        grams, 
        isEstimated: false, 
        source: 'db_declared',
        confidence: 2
      };
    }
  }

  // 4. Try to infer from nutrition ratio (per100g vs perServing)
  const inferred = inferPortionFromNutritionRatio(productData);
  if (inferred.grams > 0) {
    return inferred;
  }

  // 5. Model estimate based on food category
  const modelEstimate = estimatePortionFromCategory(productData?.productName || productData?.itemName || '');
  if (modelEstimate.grams > 0) {
    return modelEstimate;
  }

  // 6. Default fallback
  return { 
    grams: defaultGrams, 
    isEstimated: true, 
    source: 'estimated',
    confidence: 0
  };
}

/**
 * Parse serving size string to grams
 */
function parseServingSize(servingStr: string): number {
  if (!servingStr || typeof servingStr !== 'string') return 0;
  
  const str = servingStr.toLowerCase().trim();
  
  // Direct gram amounts: "30g", "1 serving (30g)", etc.
  const gramMatch = str.match(/(\d+(?:\.\d+)?)\s*g(?:rams?)?/);
  if (gramMatch) {
    return parseFloat(gramMatch[1]);
  }
  
  // Common serving conversions
  const conversions: Record<string, number> = {
    // Snacks & bars
    'bar': 40,
    'piece': 25,
    'cookie': 30,
    'cracker': 10,
    
    // Beverages (assume 1 serving = density factor)
    'cup': 240, // 240ml ≈ 240g for most liquids
    'bottle': 500,
    'can': 355,
    
    // Portions
    'serving': 30,
    'portion': 30,
    'pack': 25,
    'sachet': 15,
  };
  
  for (const [unit, grams] of Object.entries(conversions)) {
    if (str.includes(unit)) {
      // Extract quantity if present: "2 cookies" = 2 * 30g
      const qtyMatch = str.match(new RegExp(`(\\d+(?:\\.\\d+)?)\\s*${unit}`));
      const quantity = qtyMatch ? parseFloat(qtyMatch[1]) : 1;
      return quantity * grams;
    }
  }
  
  return 0;
}

/**
 * Extract declared portion size from OCR text
 */
function extractDeclaredPortionFromOCR(ocrText: string): PortionInfo {
  const lines = ocrText.split('\n');
  
  for (const line of lines) {
    const lower = line.toLowerCase().trim();
    
    // Look for serving size declarations
    if (lower.includes('serving size') || lower.includes('portion size')) {
      const grams = parseServingSize(line);
      if (grams > 0) {
        return { 
          grams, 
          isEstimated: false, 
          source: 'ocr_declared',
          confidence: 1
        };
      }
    }
    
    // Look for "per X" statements
    const perMatch = lower.match(/per\s+(\d+(?:\.\d+)?)\s*g/);
    if (perMatch) {
      return { 
        grams: parseFloat(perMatch[1]), 
        isEstimated: false, 
        source: 'ocr_declared',
        confidence: 1
      };
    }
  }
  
  return { grams: 0, isEstimated: true, source: 'estimated', confidence: 0 };
}

/**
 * Infer portion size from nutrition ratios (per100g vs perServing)
 */
function inferPortionFromNutritionRatio(productData?: any): PortionInfo {
  if (!productData?.nutritionData) {
    return { grams: 0, isEstimated: true, source: 'estimated', confidence: 0 };
  }
  
  const per100g = productData.nutritionData;
  const perServing = productData.perServingNutrition;
  
  if (!per100g || !perServing) {
    return { grams: 0, isEstimated: true, source: 'estimated', confidence: 0 };
  }
  
  // Use calories ratio as primary method
  if (per100g.calories > 0 && perServing.calories > 0) {
    const ratio = perServing.calories / per100g.calories;
    const inferredGrams = Math.round(ratio * 100);
    
    // Sanity check: portion should be 5-250g
    if (inferredGrams >= 5 && inferredGrams <= 250) {
      return { 
        grams: Math.round(inferredGrams / 5) * 5, // Round to nearest 5g
        isEstimated: false, 
        source: 'ocr_inferred_ratio',
        confidence: 1
      };
    }
  }
  
  // Fallback to protein/carbs/fat median if calories unavailable
  const ratios: number[] = [];
  
  if (per100g.protein > 0 && perServing.protein > 0) {
    ratios.push(perServing.protein / per100g.protein);
  }
  if (per100g.carbs > 0 && perServing.carbs > 0) {
    ratios.push(perServing.carbs / per100g.carbs);
  }
  if (per100g.fat > 0 && perServing.fat > 0) {
    ratios.push(perServing.fat / per100g.fat);
  }
  
  if (ratios.length > 0) {
    ratios.sort((a, b) => a - b);
    const medianRatio = ratios[Math.floor(ratios.length / 2)];
    const inferredGrams = Math.round(medianRatio * 100);
    
    if (inferredGrams >= 5 && inferredGrams <= 250) {
      return { 
        grams: Math.round(inferredGrams / 5) * 5,
        isEstimated: false, 
        source: 'ocr_inferred_ratio',
        confidence: 1
      };
    }
  }
  
  return { grams: 0, isEstimated: true, source: 'estimated', confidence: 0 };
}

/**
 * Estimate portion based on food category
 */
function estimatePortionFromCategory(productName: string): PortionInfo {
  if (!productName) {
    return { grams: 0, isEstimated: true, source: 'estimated', confidence: 0 };
  }
  
  const name = productName.toLowerCase();
  
  // Category-based estimates
  const categoryMap = {
    // Beverages
    'juice|drink|soda|water|milk|tea|coffee': 240,
    // Cereals
    'cereal|flakes|granola|muesli|oats': 30,
    // Yogurt/Dairy
    'yogurt|yoghurt': 150,
    // Snacks
    'chips|crackers|cookies|bar': 25,
    // Spreads
    'butter|jam|peanut butter|nutella': 15,
    // Fruits
    'apple|banana|orange|fruit': 150,
    // Nuts
    'nuts|almonds|walnuts': 30,
    // Rice/Grains
    'rice|quinoa|pasta': 100,
    // Vegetables
    'vegetables|salad': 80
  };
  
  for (const [pattern, grams] of Object.entries(categoryMap)) {
    const regex = new RegExp(pattern, 'i');
    if (regex.test(name)) {
      return { 
        grams, 
        isEstimated: true, 
        source: 'model_estimate',
        confidence: 0
      };
    }
  }
  
  return { grams: 0, isEstimated: true, source: 'estimated', confidence: 0 };
}

/**
 * Convert per 100g nutrition to per portion
 */
export function toPerPortion(
  nutrition100g: NutritionPer100g, 
  portionGrams: number
): NutritionPer100g {
  if (!nutrition100g || portionGrams <= 0) {
    return {};
  }
  
  const factor = portionGrams / 100;
  
  return {
    calories: nutrition100g.calories ? Math.round(nutrition100g.calories * factor) : undefined,
    protein: nutrition100g.protein ? Math.round(nutrition100g.protein * factor * 10) / 10 : undefined,
    carbs: nutrition100g.carbs ? Math.round(nutrition100g.carbs * factor * 10) / 10 : undefined,
    fat: nutrition100g.fat ? Math.round(nutrition100g.fat * factor * 10) / 10 : undefined,
    sugar: nutrition100g.sugar ? Math.round(nutrition100g.sugar * factor * 10) / 10 : undefined,
    fiber: nutrition100g.fiber ? Math.round(nutrition100g.fiber * factor * 10) / 10 : undefined,
    sodium: nutrition100g.sodium ? Math.round(nutrition100g.sodium * factor) : undefined,
  };
}
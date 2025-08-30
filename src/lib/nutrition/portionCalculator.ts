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
  source: string;
}

/**
 * Parse portion grams from various sources
 * Returns portion size in grams, with estimation flag
 */
export function parsePortionGrams(
  productData?: any,
  ocrText?: string,
  defaultGrams = 30
): PortionInfo {
  // Try product data first
  if (productData?.serving_size) {
    const grams = parseServingSize(productData.serving_size);
    if (grams > 0) {
      return { grams, isEstimated: false, source: 'product' };
    }
  }

  // Try OCR text
  if (ocrText) {
    const grams = extractPortionFromOCR(ocrText);
    if (grams > 0) {
      return { grams, isEstimated: false, source: 'ocr' };
    }
  }

  // Default estimation
  return { grams: defaultGrams, isEstimated: true, source: 'estimated' };
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
 * Extract portion size from OCR text
 */
function extractPortionFromOCR(ocrText: string): number {
  const lines = ocrText.split('\n');
  
  for (const line of lines) {
    const lower = line.toLowerCase().trim();
    
    // Look for serving size declarations
    if (lower.includes('serving size') || lower.includes('portion size')) {
      const grams = parseServingSize(line);
      if (grams > 0) return grams;
    }
    
    // Look for "per X" statements
    const perMatch = lower.match(/per\s+(\d+(?:\.\d+)?)\s*g/);
    if (perMatch) {
      return parseFloat(perMatch[1]);
    }
  }
  
  return 0;
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
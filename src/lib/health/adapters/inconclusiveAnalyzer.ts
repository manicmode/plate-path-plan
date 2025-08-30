/**
 * Inconclusive Analysis Handler
 * Handles cases where OCR text is too weak for proper health analysis
 */

export interface InconclusiveResult {
  status: 'inconclusive';
  reason: 'low_confidence' | 'no_ingredients' | 'insufficient_text' | 'front_of_pack';
  score: null;
  flags: [];
  message: string;
}

/**
 * Check if OCR text contains ingredients/nutrition data
 * Returns true if text contains sufficient label information for analysis
 */
export function hasLabelData(text: string): boolean {
  if (!text || text.trim().length < 30) {
    return false;
  }

  const normalizedText = text.toLowerCase();
  const wordCount = text.split(/\s+/).length;

  // Check for ingredients section
  const hasIngredients = /ingredients?\s*:/.test(normalizedText);
  
  // Check for nutrition facts patterns
  const hasNutrientValues = /\d+\s*(g|mg|mcg|kcal|cal)\b/.test(normalizedText);
  const hasNutrientLabels = /(protein|fat|carb|sugar|sodium|fiber|calorie)/i.test(text);
  const hasNutritionFacts = hasNutrientValues && hasNutrientLabels;
  
  // Check for daily value percentages
  const hasDailyValues = /\d+\s*%/.test(normalizedText);
  
  // Check for nutrition table pattern (grid of numbers with units)
  const nutritionTablePattern = /\d+\s*(g|mg|kcal)\s+\d+\s*%/i;
  const hasNutritionTable = nutritionTablePattern.test(text);

  // Must have minimum word count AND either ingredients or nutrition data
  const hasMinimumContent = wordCount >= 30;
  const hasRelevantData = hasIngredients || hasNutritionFacts || hasDailyValues || hasNutritionTable;

  return hasMinimumContent && hasRelevantData;
}

/**
 * Detect if image is likely front-of-pack (marketing content, not ingredients/nutrition)
 */
export function isFrontOfPack(text: string): boolean {
  if (!text || text.trim().length < 10) {
    return false;
  }

  const normalizedText = text.toLowerCase();
  
  // Front-of-pack indicators (marketing text, brand names, claims)
  const frontOfPackTerms = [
    'new', 'improved', 'original', 'classic', 'premium', 'organic', 'natural',
    'fresh', 'delicious', 'tasty', 'crispy', 'crunchy', 'smooth', 'creamy',
    'authentic', 'traditional', 'gourmet', 'artisan', 'handcrafted',
    'net wt', 'net weight', 'oz', 'lb', 'fl oz', 'serving suggestion'
  ];
  
  const frontOfPackCount = frontOfPackTerms.filter(term => 
    normalizedText.includes(term)
  ).length;

  // Back-of-pack indicators (detailed nutrition/ingredients info)
  const backOfPackTerms = [
    'ingredients:', 'nutrition facts', 'daily value', 'per serving',
    'calories', 'protein', 'carbohydrate', 'dietary fiber', 'total fat',
    'saturated fat', 'trans fat', 'cholesterol', 'sodium', 'vitamin',
    'allergen', 'contains:', 'may contain'
  ];
  
  const backOfPackCount = backOfPackTerms.filter(term => 
    normalizedText.includes(term)
  ).length;

  // If more front-of-pack terms than back-of-pack terms, likely front
  return frontOfPackCount > backOfPackCount && backOfPackCount < 2;
}

/**
 * Check if analysis should return inconclusive instead of low score
 */
export function shouldReturnInconclusive(
  ocrText: string,
  parseResult?: { ok: boolean; reason?: string },
  confidence?: number
): InconclusiveResult | null {
  // Check text length threshold
  if (ocrText.trim().length < 30) {
    return {
      status: 'inconclusive',
      reason: 'insufficient_text',
      score: null,
      flags: [],
      message: "We couldn't read enough label text to analyze this product."
    };
  }

  // Check if this is front-of-pack content
  if (isFrontOfPack(ocrText)) {
    return {
      status: 'inconclusive',
      reason: 'front_of_pack',
      score: null,
      flags: [],
      message: "We need the Ingredients or Nutrition Facts panel. Please retake with the back of the package."
    };
  }

  // Check for label data
  if (!hasLabelData(ocrText)) {
    return {
      status: 'inconclusive',
      reason: 'no_ingredients',
      score: null,
      flags: [],
      message: "We need the Ingredients or Nutrition Facts panel. Fill the frame and avoid glare."
    };
  }

  // Check parser confidence
  if (parseResult && !parseResult.ok && parseResult.reason === 'low_confidence') {
    return {
      status: 'inconclusive',
      reason: 'low_confidence',
      score: null,
      flags: [],
      message: "We couldn't read enough label text to analyze this product."
    };
  }

  // Check confidence threshold (if provided by analyzer)
  if (typeof confidence === 'number' && confidence < 0.35) {
    return {
      status: 'inconclusive',
      reason: 'low_confidence',
      score: null,
      flags: [],
      message: "We couldn't read enough label text to analyze this product."
    };
  }

  return null; // Continue with normal analysis
}
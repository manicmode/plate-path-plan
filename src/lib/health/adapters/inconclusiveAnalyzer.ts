/**
 * Inconclusive Analysis Handler
 * Handles cases where OCR text is too weak for proper health analysis
 */

export interface InconclusiveResult {
  status: 'inconclusive';
  reason: 'low_confidence' | 'no_ingredients' | 'insufficient_text';
  score: null;
  flags: [];
  message: string;
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

  // Check if ingredients text is missing
  const hasIngredients = /ingredient|contains|made.with/i.test(ocrText);
  const hasNutrition = /calorie|protein|fat|carb|sugar|sodium|fiber/i.test(ocrText);
  
  if (!hasIngredients && !hasNutrition) {
    return {
      status: 'inconclusive',
      reason: 'no_ingredients',
      score: null,
      flags: [],
      message: "We couldn't read enough label text to analyze this product."
    };
  }

  return null; // Continue with normal analysis
}
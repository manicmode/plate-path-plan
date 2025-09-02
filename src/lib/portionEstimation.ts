/**
 * Intelligent Portion Estimation System
 * Priority: OCR -> User Prefs -> Nutrition Ratios -> Category Heuristics -> 30g Fallback
 */

export interface PortionEstimate {
  grams: number;
  source: 'ocr' | 'user_pref' | 'nutrition_ratio' | 'category' | 'fallback';
  confidence: 'high' | 'medium' | 'low';
  displayText: string; // e.g., "150g • est."
}

// Category-based portion heuristics (grams)
const CATEGORY_PORTIONS: Record<string, number> = {
  protein: 120, // salmon, chicken breast, etc.
  vegetable: 85, // asparagus, broccoli, etc.
  fruit: 80, // apple, orange, etc.
  grain: 150, // rice, pasta, bread
  dairy: 100, // cheese, yogurt, etc.
  fat: 15, // olive oil, butter, etc.
  other: 100
};

// Specific food overrides for better accuracy
const SPECIFIC_PORTIONS: Record<string, number> = {
  'salmon': 120,
  'salmon fillet': 120,
  'grilled salmon': 120,
  'asparagus': 85,
  'asparagus spears': 85,
  'tomato': 80,
  'cherry tomato': 60,
  'lemon': 30,
  'lemon slice': 15,
  'lime': 25,
  'rice': 150,
  'white rice': 150,
  'brown rice': 150,
  'bread': 30,
  'bread slice': 30,
  'egg': 50,
  'chicken breast': 140,
  'chicken': 140,
  'beef': 150,
  'steak': 150,
  'broccoli': 90,
  'salad': 120,
  'mixed greens': 100,
  'lettuce': 80
};

export function estimatePortionIntelligent(
  foodName: string, 
  category: string = 'other',
  options: {
    ocrPortion?: number;
    userPreference?: number;
    nutritionRatio?: number;
  } = {}
): PortionEstimate {
  const { ocrPortion, userPreference, nutritionRatio } = options;
  
  // Priority 1: OCR declared portion (highest confidence)
  if (ocrPortion && ocrPortion > 0 && ocrPortion <= 1000) {
    return {
      grams: Math.round(ocrPortion),
      source: 'ocr',
      confidence: 'high',
      displayText: `${Math.round(ocrPortion)}g • from label`
    };
  }
  
  // Priority 2: User preference (high confidence)
  if (userPreference && userPreference > 0 && userPreference <= 1000) {
    return {
      grams: Math.round(userPreference),
      source: 'user_pref',
      confidence: 'high',
      displayText: `${Math.round(userPreference)}g • your usual`
    };
  }
  
  // Priority 3: Nutrition ratios (medium confidence)
  if (nutritionRatio && nutritionRatio > 0 && nutritionRatio <= 1000) {
    return {
      grams: Math.round(nutritionRatio),
      source: 'nutrition_ratio',
      confidence: 'medium',
      displayText: `${Math.round(nutritionRatio)}g • calculated`
    };
  }
  
  // Priority 4: Specific food heuristics (medium confidence)
  const foodNameLower = foodName.toLowerCase().trim();
  const specificPortion = SPECIFIC_PORTIONS[foodNameLower];
  
  if (specificPortion) {
    return {
      grams: specificPortion,
      source: 'category',
      confidence: 'medium',
      displayText: `${specificPortion}g • est.`
    };
  }
  
  // Priority 5: Category heuristics (medium confidence)
  const categoryPortion = CATEGORY_PORTIONS[category] || CATEGORY_PORTIONS.other;
  
  if (categoryPortion !== 30) { // Not using fallback
    return {
      grams: categoryPortion,
      source: 'category',
      confidence: 'medium',
      displayText: `${categoryPortion}g • est.`
    };
  }
  
  // Priority 6: 30g fallback (low confidence)
  return {
    grams: 30,
    source: 'fallback',
    confidence: 'low',
    displayText: '30g • est.'
  };
}

// Helper function to estimate based on food name pattern matching
export function estimatePortionFromName(name: string): number {
  const estimate = estimatePortionIntelligent(name);
  return estimate.grams;
}
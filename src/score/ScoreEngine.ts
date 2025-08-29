/**
 * ScoreEngine - Canonical 0-100 health scoring system
 * Provides consistent scoring logic across all product analysis flows
 */

export interface ScoreInput {
  name?: string;
  ingredientsText?: string;
  nutrition?: {
    calories?: number;
    protein_g?: number;
    carbs_g?: number;
    fat_g?: number;
    sugar_g?: number;
    fiber_g?: number;
    sodium_mg?: number;
    saturated_fat_g?: number;
  };
  novaGroup?: number;
  additives?: string[];
  allergens?: string[];
  engineFixes?: boolean;
}

export interface ScoreResult {
  score: number; // 0-100
  final?: number; // alias for score
  breakdown: {
    nutrition: number;
    ingredients: number;
    processing: number;
  };
  reasoning: string[];
}

const clamp01 = (v:number)=> Math.max(0, Math.min(1, v));
const clamp = (v:number,min=0,max=100)=> Math.max(min, Math.min(max, v));

/**
 * Main scoring engine - returns score on 0-100 scale
 */
export function calculateHealthScore(input: ScoreInput): ScoreResult {
  const fixes = !!input.engineFixes;

  if (!fixes) {
    // existing behavior (unchanged)
    const nutritionScore = calculateNutritionScore(input.nutrition || {});
    const ingredientsScore = calculateIngredientsScore(input.ingredientsText || '');
    const processingScore = calculateProcessingScore(input.novaGroup, input.additives);

    // Weighted average
    const score = Math.round(
      nutritionScore * 0.5 +
      ingredientsScore * 0.3 +
      processingScore * 0.2
    );

    return {
      score: Math.max(0, Math.min(100, score)),
      breakdown: {
        nutrition: nutritionScore,
        ingredients: ingredientsScore,
        processing: processingScore
      },
      reasoning: generateReasoning(input, { nutritionScore, ingredientsScore, processingScore })
    };
  }

  // Defaults when config missing
  const w = {
    base: 80,              // start point (0–100)
    sugarPenalty: 30,
    sodiumPenalty: 20,
    satfatPenalty: 15,
    fiberBonus: 10,
    proteinBonus: 5,
  };

  const n = input.nutrition || {};

  // Normalize contributions (cap at reasonable dietary bounds)
  let final = w.base;
  final -= clamp01((n.sugar_g ?? 0) / 50)   * w.sugarPenalty;   // 50 g/100g ~ max penalty
  final -= clamp01((n.sodium_mg ?? 0) /1500)* w.sodiumPenalty;  // 1500 mg/100g ~ max penalty
  final -= clamp01((n.saturated_fat_g ?? 0) / 10)  * w.satfatPenalty;  // 10 g/100g ~ max penalty
  final += clamp01((n.fiber_g ?? 0) / 10)   * w.fiberBonus;     // 10 g/100g ~ max bonus
  final += clamp01((n.protein_g ?? 0) / 20) * w.proteinBonus;   // 20 g/100g ~ max bonus

  final = clamp(final, 0, 100);

  if (import.meta.env.VITE_DEBUG_PERF === 'true') {
    console.info('[ENGINE][DETAIL]', {
      weights: w,
      normalized: {
        kcal: n.calories, sugar: n.sugar_g, sodium: n.sodium_mg,
        satfat: n.saturated_fat_g, fiber: n.fiber_g, protein: n.protein_g
      },
      contributions: {
        sugarPenalty: clamp01((n.sugar_g ?? 0) / 50) * w.sugarPenalty,
        sodiumPenalty: clamp01((n.sodium_mg ?? 0) /1500) * w.sodiumPenalty,
        satfatPenalty: clamp01((n.saturated_fat_g ?? 0) / 10) * w.satfatPenalty,
        fiberBonus: clamp01((n.fiber_g ?? 0) / 10) * w.fiberBonus,
        proteinBonus: clamp01((n.protein_g ?? 0) / 20) * w.proteinBonus
      },
      final100: final
    });
  }

  return { 
    score: final, 
    final,
    breakdown: {
      nutrition: final,
      ingredients: 80, // placeholder for compatibility
      processing: 80   // placeholder for compatibility
    },
    reasoning: [`Health score: ${Math.round(final)}/100`]
  };
}

function calculateNutritionScore(nutrition: any): number {
  // Start with neutral baseline (50 instead of 70 to allow more score variation)
  let score = 50;

  // Debug logging for score calculation
  if (import.meta.env.VITE_DEBUG_PERF === 'true') {
    console.info('[ENGINE][NUTRITION_DETAIL]', {
      inputs: {
        calories: nutrition.calories,
        sugar_g: nutrition.sugar_g,
        sodium_mg: nutrition.sodium_mg,
        saturated_fat_g: nutrition.saturated_fat_g,
        fiber_g: nutrition.fiber_g,
        protein_g: nutrition.protein_g
      },
      baseline: score
    });
  }

  // Positive factors (more generous scoring)
  if (nutrition.protein_g && nutrition.protein_g > 10) {
    const bonus = Math.min(20, Math.floor(nutrition.protein_g / 5) * 5); // Up to +20
    score += bonus;
  }
  if (nutrition.fiber_g && nutrition.fiber_g > 3) {
    const bonus = Math.min(15, Math.floor(nutrition.fiber_g / 2) * 5); // Up to +15
    score += bonus;
  }

  // Negative factors (more impactful penalties)
  if (nutrition.sugar_g && nutrition.sugar_g > 15) {
    const penalty = Math.min(30, Math.floor((nutrition.sugar_g - 15) / 10) * 10 + 15); // Escalating penalty
    score -= penalty;
  }
  if (nutrition.sodium_mg && nutrition.sodium_mg > 600) {
    const penalty = Math.min(25, Math.floor((nutrition.sodium_mg - 600) / 300) * 10 + 15); // Escalating penalty
    score -= penalty;
  }
  if (nutrition.saturated_fat_g && nutrition.saturated_fat_g > 5) {
    const penalty = Math.min(20, Math.floor((nutrition.saturated_fat_g - 5) / 3) * 8 + 10);
    score -= penalty;
  }
  if (nutrition.calories && nutrition.calories > 400) {
    const penalty = Math.min(15, Math.floor((nutrition.calories - 400) / 100) * 3 + 5);
    score -= penalty;
  }

  const finalScore = Math.max(0, Math.min(100, score));
  
  if (import.meta.env.VITE_DEBUG_PERF === 'true') {
    console.info('[ENGINE][NUTRITION_RESULT]', {
      baseline: 50,
      adjustments: score - 50,
      finalScore
    });
  }

  return finalScore;
}

function calculateIngredientsScore(ingredientsText: string): number {
  let score = 80; // baseline
  const text = ingredientsText.toLowerCase();

  // Common negative indicators
  const negativeTerms = [
    'high fructose corn syrup', 'artificial flavor', 'artificial color',
    'monosodium glutamate', 'sodium benzoate', 'potassium sorbate',
    'bht', 'bha', 'tbhq', 'carrageenan'
  ];

  negativeTerms.forEach(term => {
    if (text.includes(term)) score -= 10;
  });

  // Positive indicators
  if (text.includes('organic')) score += 5;
  if (text.includes('whole grain')) score += 5;
  if (text.includes('natural')) score += 3;

  return Math.max(0, Math.min(100, score));
}

function calculateProcessingScore(novaGroup?: number, additives?: string[]): number {
  let score = 80; // baseline

  if (novaGroup) {
    switch (novaGroup) {
      case 1: score = 95; break; // unprocessed
      case 2: score = 85; break; // minimally processed
      case 3: score = 60; break; // processed
      case 4: score = 30; break; // ultra-processed
    }
  }

  if (additives && additives.length > 5) {
    score -= additives.length * 2;
  }

  return Math.max(0, Math.min(100, score));
}

function generateReasoning(input: ScoreInput, scores: any): string[] {
  const reasons: string[] = [];

  if (scores.nutritionScore < 50) {
    reasons.push("High sugar, sodium or saturated fat content");
  }
  if (scores.ingredientsScore < 50) {
    reasons.push("Contains artificial additives or preservatives");
  }
  if (scores.processingScore < 50) {
    reasons.push("Highly processed product");
  }

  if (input.nutrition?.fiber_g && input.nutrition.fiber_g > 5) {
    reasons.push("Good source of fiber");
  }
  if (input.nutrition?.protein_g && input.nutrition.protein_g > 15) {
    reasons.push("High protein content");
  }

  return reasons;
}

/**
 * Convert 0-100 score to 0-10 scale for UI compatibility
 */
export const toFinal10 = (v100:number)=> Math.round(Math.max(0, Math.min(100, v100)))/10;
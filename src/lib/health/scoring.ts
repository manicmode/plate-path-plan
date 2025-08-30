/**
 * Health Score Calculation Engine
 * Calibrated scoring system (0-100) with deterministic results
 * Targets: Granola ≈ 80-85, Sour Punch ≈ 45-55
 */

export interface NutritionInput {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  saturated_fat?: number;
  sugar?: number;
  fiber?: number;
  sodium?: number; // in mg
}

export interface ProductMeta {
  category?: string;
  name?: string;
  brand?: string;
  isUltraProcessed?: boolean;
  portionGrams?: number;
}

export interface ScoringInput {
  per100g: NutritionInput;
  perServing: NutritionInput;
  meta: ProductMeta;
  flags?: string[];
}

// Scoring weights tuned to target examples
const WEIGHTS = {
  sugarPenalty: 0.30,
  satFatPenalty: 0.15,
  sodiumPenalty: 0.10,
  energyDensityPenalty: 0.10,
  ultraProcessedPenalty: 0.10,
  fiberBonus: 0.10,
  proteinBonus: 0.10,
  ingredientQuality: 0.05
};

/**
 * Clamp value to non-negative
 */
function clamp0(value: number): number {
  return Math.max(0, Number(value) || 0);
}

/**
 * Safe number conversion
 */
function toNumberSafe(value: any): number {
  return Number(value) || 0;
}

/**
 * Check if product is ultra-processed based on meta or flags
 */
function isUltraProcessed(meta: ProductMeta, flags?: string[]): boolean {
  if (meta.isUltraProcessed) return true;
  
  // Check category hints
  const name = (meta.name || '').toLowerCase();
  const category = (meta.category || '').toLowerCase();
  
  const ultraProcessedKeywords = [
    'soda', 'candy', 'chips', 'crackers', 'cookies',
    'instant', 'frozen meal', 'packaged snack'
  ];
  
  return ultraProcessedKeywords.some(keyword => 
    name.includes(keyword) || category.includes(keyword)
  );
}

/**
 * Check for artificial additives in flags
 */
function hasArtificialAdditives(flags?: string[]): boolean {
  if (!flags) return false;
  
  const additiveFlags = [
    'artificial_colors',
    'artificial_flavors',
    'preservatives',
    'high_fructose_corn_syrup',
    'trans_fats'
  ];
  
  return flags.some(flag => additiveFlags.includes(flag));
}

/**
 * Apply category-specific bonuses/penalties
 */
function getCategoryBonus(meta: ProductMeta, perServing: NutritionInput): number {
  const category = (meta.category || '').toLowerCase();
  const name = (meta.name || '').toLowerCase();
  
  // Breakfast cereals bonus for high fiber + protein
  if (category.includes('cereal') || category.includes('breakfast')) {
    const fiber = clamp0(perServing.fiber);
    const protein = clamp0(perServing.protein);
    
    if (fiber >= 3 && protein >= 4) {
      return 3; // Small bonus for nutritious breakfast items
    }
  }
  
  // Candy penalty
  if (category.includes('candy') || name.includes('gum') || name.includes('candy')) {
    return -5; // Baseline penalty for candy
  }
  
  // Healthy category bonuses
  if (category.includes('fruit') || category.includes('vegetable')) {
    return 2;
  }
  
  return 0;
}

/**
 * Calculate health score from 0-100
 * Higher scores = healthier products
 */
export function calculateHealthScore(input: ScoringInput): number {
  const { per100g, perServing, meta, flags } = input;
  
  // Extract per-serving nutrition values
  const sugar = clamp0(perServing.sugar);
  const satFat = clamp0(perServing.saturated_fat);
  const sodium = clamp0(perServing.sodium) / 1000; // Convert mg to g-equivalent
  const fiber = clamp0(perServing.fiber);
  const protein = clamp0(perServing.protein);
  
  // Energy density from per-100g (kcal per 100g)
  const energyDensity = clamp0(per100g.calories) / 100; // Scale to 0-5 range
  
  // Ultra-processed and additives
  const isUP = isUltraProcessed(meta, flags) ? 1 : 0;
  const hasAdditives = hasArtificialAdditives(flags) ? 1 : 0;
  
  // Category-specific adjustments
  const categoryBonus = getCategoryBonus(meta, perServing);
  
  // Calculate score with penalties and bonuses
  let score = 100;
  
  // Penalties (subtract from 100)
  score -= WEIGHTS.sugarPenalty * sugar * 8; // ~8 points per 10g sugar
  score -= WEIGHTS.satFatPenalty * satFat * 10; // ~10 points per 10g sat fat
  score -= WEIGHTS.sodiumPenalty * sodium * 10; // ~10 points per gram sodium
  score -= WEIGHTS.energyDensityPenalty * energyDensity * 8; // Energy density penalty
  score -= WEIGHTS.ultraProcessedPenalty * isUP * 15; // Ultra-processed penalty
  score -= WEIGHTS.ingredientQuality * hasAdditives * 10; // Additives penalty
  
  // Bonuses (add to score)
  score += WEIGHTS.fiberBonus * Math.min(fiber, 8) * 2; // Cap fiber bonus at 8g
  score += WEIGHTS.proteinBonus * Math.min(protein, 20) * 1.5; // Cap protein bonus at 20g
  
  // Apply category bonus
  score += categoryBonus;
  
  // Clamp to 0-100 range and round
  score = Math.max(0, Math.min(100, Math.round(score)));
  
  return score;
}

/**
 * Convert score to 0-10 range (for legacy compatibility)
 */
export function scoreToTen(score100: number): number {
  return Math.max(0, Math.min(10, Math.round(score100 / 10)));
}

/**
 * Convert score to star rating (0-5 stars, half-star increments)
 */
export function scoreToStars(score100: number): number {
  const stars = (score100 / 100) * 5; // Convert to 0-5 range
  return Math.round(stars * 2) / 2; // Round to nearest 0.5
}

/**
 * Sanity check for score validation
 * Logs errors if score is out of expected range
 */
export function validateScore(score: number, productName?: string): number {
  if (score < 0 || score > 100 || !Number.isFinite(score)) {
    console.error('[REPORT][V2][SCORE][ERROR]', {
      stage: 'validation',
      score,
      productName,
      message: 'Score out of valid range (0-100)'
    });
    
    // Return safe fallback
    return Math.max(0, Math.min(100, Math.round(score) || 50));
  }
  
  return score;
}

/**
 * V2 Scoring toggle - defaults OFF for safety
 */
function isScoreV2Enabled(): boolean {
  if (typeof window === 'undefined') return false;
  
  const qp = new URLSearchParams(window.location.search);
  if (qp.has('scoreV2')) return qp.get('scoreV2') === '1';
  
  return Boolean((window as any).__flags?.score_v2_enabled ?? false);
}

/**
 * Legacy scoring fallback (existing logic)
 */
function legacyScore(perServing: any): number {
  // Use existing calculateHealthScore but with legacy inputs
  const input = {
    per100g: perServing, // Legacy used perServing as per100g
    perServing,
    meta: {},
    flags: []
  };
  return Math.max(0, Math.min(100, Math.round(calculateHealthScore(input))));
}

/**
 * Safe V2 scorer with canonicalization guards
 */
export function safeScoreV2(input: {
  per100g: any;
  perServing: any;
  meta: any;
  flags?: string[];
}): number {
  try {
    // Dynamic import for canonicalization to avoid circular deps
    const { canonicalizePer100g, perServingFromPer100g } = (() => {
      try {
        return require('./canonicalizeNutrients');
      } catch {
        // Fallback if import fails
        return {
          canonicalizePer100g: (raw: any) => raw,
          perServingFromPer100g: (per100g: any, grams: number) => per100g
        };
      }
    })();
    
    // Canonicalize inputs
    const per100g = canonicalizePer100g(input.per100g);
    const grams = input.meta?.portionGrams || 30;
    const perServing = perServingFromPer100g(per100g, grams);
    
    // Check for critical missing fields
    const missing = [];
    if (!Number.isFinite(perServing.sugars_g)) missing.push('perServing.sugars_g');
    if (!Number.isFinite(perServing.saturated_fat_g)) missing.push('perServing.saturated_fat_g');
    if (!Number.isFinite(perServing.sodium_mg)) missing.push('perServing.sodium_mg');
    if (!Number.isFinite(per100g.energy_kcal)) missing.push('per100g.energy_kcal');
    
    if (missing.length > 0) {
      console.error('[REPORT][V2][SCORE][DIAG_MISSING]', { missing, meta: input.meta });
      return legacyScore(input.perServing);
    }
    
    // Log inputs for debugging
    console.info('[REPORT][V2][SCORE][INPUTS]', { per100g, perServing, grams });
    
    // Calculate V2 score using canonical inputs
    const scoringInput = {
      per100g: {
        calories: per100g.energy_kcal,
        sugar: perServing.sugars_g,
        saturated_fat: perServing.saturated_fat_g,
        sodium: perServing.sodium_mg,
        fiber: perServing.fiber_g,
        protein: perServing.protein_g
      },
      perServing: {
        calories: perServing.energy_kcal,
        sugar: perServing.sugars_g,
        saturated_fat: perServing.saturated_fat_g,
        sodium: perServing.sodium_mg,
        fiber: perServing.fiber_g,
        protein: perServing.protein_g
      },
      meta: input.meta,
      flags: input.flags || []
    };
    
    const score = calculateHealthScore(scoringInput);
    
    if (!Number.isFinite(score)) {
      console.error('[REPORT][V2][SCORE][DIAG_NAN]', { per100g, perServing, meta: input.meta });
      return legacyScore(input.perServing);
    }
    
    const validatedScore = Math.max(0, Math.min(100, Math.round(score)));
    
    console.info('[REPORT][V2][SCORE][VALUE]', { 
      score: validatedScore, 
      grams,
      productName: input.meta?.name 
    });
    
    return validatedScore;
    
  } catch (error) {
    console.error('[REPORT][V2][SCORE][ERROR]', {
      stage: 'v2_calculation',
      message: error?.message,
      meta: input.meta
    });
    return legacyScore(input.perServing);
  }
}

/**
 * Main scoring entry point with V2 toggle
 */
export function scoreProduct(input: ScoringInput): number {
  try {
    let score: number;
    
    if (isScoreV2Enabled()) {
      score = safeScoreV2(input);
    } else {
      score = calculateHealthScore(input);
      score = validateScore(score, input.meta.name);
    }
    
    return score;
  } catch (error) {
    console.error('[REPORT][V2][SCORE][ERROR]', {
      stage: 'main_entry',
      message: error?.message,
      productName: input.meta?.name
    });
    
    // Return neutral score on error
    return 50;
  }
}
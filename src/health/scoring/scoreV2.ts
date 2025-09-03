/**
 * Dual-curve health scoring system
 * Whole foods get generous scoring, packaged foods use stricter evaluation
 */

import { classifyFoodKind, type FoodClassificationInput } from './isWholeFood';

export interface Nutrients {
  calories?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  fiber_g?: number;
  sodium_mg?: number;
  sugars_g?: number;
  satfat_g?: number;
}

export interface ScoreContext extends FoodClassificationInput {
  nutrients: Nutrients;
}

const clamp = (v: number, min = 0, max = 100) => Math.max(min, Math.min(max, v));

/**
 * Scoring curve for whole foods - generous baseline with gentle bonuses
 */
function scoreWholeFood(n: Nutrients): number {
  // Start with high baseline - whole foods are inherently healthy
  let score = 90;

  // Positive adjustments
  if ((n.fiber_g ?? 0) >= 3) score += 3;        // Good fiber content
  if ((n.protein_g ?? 0) >= 10) score += 2;     // Good protein
  if ((n.sugars_g ?? 0) <= 8) score += 2;       // Low sugar

  // Gentle deductions (rare for whole foods)
  if ((n.sugars_g ?? 0) > 15) score -= 4;       // Very sweet fruits
  if ((n.sodium_mg ?? 0) > 400) score -= 5;     // Unlikely for plain produce
  if ((n.satfat_g ?? 0) > 5) score -= 5;        // High saturated fat

  // Maintain high floor for whole foods
  return clamp(score, 70, 100);
}

/**
 * Scoring curve for packaged foods - stricter evaluation with penalties
 */
function scorePackaged(n: Nutrients): number {
  // Lower baseline - packaged foods must earn their score
  let score = 60;
  
  const sugar = n.sugars_g ?? 0;
  const fiber = n.fiber_g ?? 0;
  const sodium = n.sodium_mg ?? 0;
  const satfat = n.satfat_g ?? 0;
  const protein = n.protein_g ?? 0;

  // Penalties for problematic nutrients
  if (sugar > 10) score -= Math.min(15, (sugar - 10) * 0.8);
  if (sodium > 600) score -= Math.min(15, (sodium - 600) / 100);
  if (satfat > 5) score -= Math.min(10, (satfat - 5) * 1.2);

  // Bonuses for beneficial nutrients
  if (fiber >= 3) score += Math.min(8, fiber * 1.5);
  if (protein >= 10) score += Math.min(8, (protein - 10) * 0.6);

  // Additional penalties for very processed foods
  if (sodium > 1000) score -= 5;  // Very high sodium
  if (sugar > 20) score -= 5;     // Very high sugar

  return clamp(Math.round(score), 5, 98);
}

/**
 * Main scoring function with dual curves based on food classification
 */
export function scoreFoodV2(ctx: ScoreContext): number {
  const DBG = import.meta.env.VITE_HEALTH_SCORE_DEBUG === 'true';
  
  if (DBG) {
    console.info('[SCORE][V2][INPUT]', {
      source: (ctx as any).source, // 'photo_item'
      name: ctx.name, 
      kind: ctx.genericSlug,
      genericSlug: ctx.genericSlug,
      per100g: (ctx as any).nutrients?.per100g, 
      portion: (ctx as any).portion,
      flags: (ctx as any).flags,
      rawNutrients: ctx.nutrients
    });
  }

  const kind = classifyFoodKind(ctx);
  // For photo items that are ambiguous, treat as whole food if they match generic foods
  const useWhole = (kind === 'whole_food') || 
    (kind === 'ambiguous' && ctx.genericSlug && (ctx as any).source === 'photo_item');
  
  const n = ctx.nutrients ?? {};

  const score = useWhole ? scoreWholeFood(n) : scorePackaged(n);

  if (DBG) {
    console.info('[SCORE][V2][COMPONENTS]', {
      kind,
      useWhole,
      curve: useWhole ? 'whole_food' : 'packaged',
      finalScore: score,
      nutrients: n
    });
  }

  // Diagnostic logging when V2 flag is enabled
  if (import.meta.env.VITE_HEALTH_SCORE_V2 === 'true') {
    console.info('[SCORE][V2]', { 
      name: ctx.name, 
      kind, 
      score, 
      curve: useWhole ? 'whole_food' : 'packaged',
      nutrients: n 
    });
  }

  return score;
}

/**
 * Get expected score range for validation
 */
export function getExpectedScoreRange(foodName: string): { min: number; max: number } {
  const name = foodName.toLowerCase();
  
  // QA targets from requirements
  if (name.includes('asparagus')) return { min: 95, max: 100 };
  if (name.includes('tomato')) return { min: 88, max: 92 };
  if (name.includes('lemon')) return { min: 88, max: 92 };
  if (name.includes('salmon')) return { min: 85, max: 95 };
  if (name.includes('granola') && name.includes('bar')) return { min: 70, max: 80 };
  if (name.includes('cereal') && name.includes('sugar')) return { min: 50, max: 65 };
  if (name.includes('candy')) return { min: 5, max: 30 };
  
  // Default ranges
  return { min: 0, max: 100 };
}
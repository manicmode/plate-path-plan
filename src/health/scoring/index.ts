/**
 * Centralized health scoring system with V2 dual-curve support
 * Main entry point for all health score calculations
 */

import { scoreFoodV2, type ScoreContext, type Nutrients, getExpectedScoreRange } from './scoreV2';

export type { ScoreContext, Nutrients } from './scoreV2';
export { getExpectedScoreRange } from './scoreV2';

/**
 * Legacy scoring function (current heuristic-based approach)
 */
function legacyScoreFood(nutrients: Nutrients): number {
  const calories = nutrients.calories || 0;
  const protein = nutrients.protein_g || 0;
  const fiber = nutrients.fiber_g || 0;
  const sugar = nutrients.sugars_g || 0;
  const sodium = nutrients.sodium_mg || 0;
  
  let healthScore = 5; // Start neutral
  if (fiber > 3) healthScore += 1;
  if (protein > 10) healthScore += 1;
  if (sugar > 15) healthScore -= 1;
  if (sodium > 400) healthScore -= 1;
  if (calories > 300) healthScore -= 0.5;
  
  return Math.max(1, Math.min(10, healthScore));
}

/**
 * Main scoring function - switches between V1 and V2 based on feature flag
 * @param ctx - Complete context including nutrients, source, and classification hints
 * @returns Score on 0-10 scale (for backward compatibility)
 */
export function scoreFood(ctx: ScoreContext): number {
  // Check feature flag for V2 scoring
  if (import.meta.env.VITE_HEALTH_SCORE_V2 === 'true') {
    const score100 = scoreFoodV2(ctx);
    const score10 = score100 / 10; // Convert 0-100 to 0-10 scale
    
    console.info('[SCORE][V2][FINAL]', { 
      name: ctx.name, 
      source: ctx.source,
      score100, 
      score10: Math.round(score10 * 10) / 10 // Round to 1 decimal
    });
    
    return Math.round(score10 * 10) / 10; // Round to 1 decimal place
  }
  
  // Legacy scoring (V1)
  const legacyScore = legacyScoreFood(ctx.nutrients);
  console.info('[SCORE][V1][FINAL]', { 
    name: ctx.name, 
    source: ctx.source,
    score10: legacyScore 
  });
  
  return legacyScore;
}

/**
 * Quick scoring for minimal nutrient data (backwards compatibility)
 */
export function quickScoreFood(nutrients: Nutrients, name?: string, source?: string): number {
  return scoreFood({
    name,
    source: source as any,
    nutrients
  });
}

/**
 * Score validation utility for testing
 */
export function validateScore(foodName: string, actualScore: number): { valid: boolean; expected: { min: number; max: number } } {
  if (import.meta.env.VITE_HEALTH_SCORE_V2 !== 'true') {
    return { valid: true, expected: { min: 0, max: 10 } }; // Skip validation for V1
  }
  
  // Note: getExpectedScoreRange is already imported at the top
  const expected = getExpectedScoreRange(foodName);
  
  // Convert to 0-10 scale for comparison
  const expectedMin = expected.min / 10;
  const expectedMax = expected.max / 10;
  
  const valid = actualScore >= expectedMin && actualScore <= expectedMax;
  
  return { 
    valid, 
    expected: { min: expectedMin, max: expectedMax } 
  };
}
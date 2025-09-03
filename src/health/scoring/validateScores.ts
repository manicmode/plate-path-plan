/**
 * Validation script for V2 health scoring system
 * Tests expected score ranges for target foods
 */

import { scoreFood, validateScore, type Nutrients, type ScoreContext } from './index';

export interface TestFood {
  name: string;
  context: ScoreContext;
  expectedMin: number;
  expectedMax: number;
}

const testFoods: TestFood[] = [
  // Whole foods (should score high)
  {
    name: 'Asparagus',
    context: {
      name: 'asparagus',
      source: 'photo_item',
      genericSlug: 'asparagus',
      nutrients: {
        calories: 20,
        protein_g: 2,
        carbs_g: 4,
        fat_g: 0,
        fiber_g: 2,
        sodium_mg: 2,
        sugars_g: 2,
      }
    },
    expectedMin: 9.5, // 95/10
    expectedMax: 10.0
  },
  {
    name: 'Tomato',
    context: {
      name: 'tomato',
      source: 'photo_item',
      genericSlug: 'tomato',
      nutrients: {
        calories: 15,
        protein_g: 1,
        carbs_g: 3,
        fat_g: 0,
        fiber_g: 1,
        sodium_mg: 5,
        sugars_g: 3,
      }
    },
    expectedMin: 8.8, // 88/10
    expectedMax: 9.2
  },
  {
    name: 'Lemon',
    context: {
      name: 'lemon',
      source: 'photo_item',
      genericSlug: 'lemon',
      nutrients: {
        calories: 9,
        protein_g: 0,
        carbs_g: 3,
        fat_g: 0,
        fiber_g: 1,
        sodium_mg: 0,
        sugars_g: 1,
      }
    },
    expectedMin: 8.8,
    expectedMax: 9.2
  },
  {
    name: 'Salmon',
    context: {
      name: 'salmon',
      source: 'photo_item',
      genericSlug: 'salmon',
      nutrients: {
        calories: 175,
        protein_g: 24,
        carbs_g: 0,
        fat_g: 8,
        fiber_g: 0,
        sodium_mg: 50,
        sugars_g: 0,
      }
    },
    expectedMin: 8.5,
    expectedMax: 9.5
  },
  // Packaged foods (should use stricter curve)
  {
    name: 'Granola Bar',
    context: {
      name: 'granola bar',
      source: 'barcode',
      upc: '1234567890',
      ingredients: 'oats, honey, nuts, dried fruit',
      nutrients: {
        calories: 250,
        protein_g: 6,
        carbs_g: 35,
        fat_g: 10,
        fiber_g: 4,
        sodium_mg: 150,
        sugars_g: 12,
      }
    },
    expectedMin: 7.0,
    expectedMax: 8.0
  },
  {
    name: 'Sugary Cereal',
    context: {
      name: 'sugar cereal',
      source: 'barcode',
      upc: '9876543210',
      ingredients: 'corn, sugar, vitamins, preservatives',
      nutrients: {
        calories: 300,
        protein_g: 4,
        carbs_g: 70,
        fat_g: 2,
        fiber_g: 1,
        sodium_mg: 200,
        sugars_g: 25,
      }
    },
    expectedMin: 5.0,
    expectedMax: 6.5
  },
  {
    name: 'Candy',
    context: {
      name: 'candy',
      source: 'barcode',
      upc: '5555555555',
      ingredients: 'sugar, corn syrup, artificial colors, flavors',
      nutrients: {
        calories: 400,
        protein_g: 0,
        carbs_g: 100,
        fat_g: 0,
        fiber_g: 0,
        sodium_mg: 50,
        sugars_g: 95,
      }
    },
    expectedMin: 0.5,
    expectedMax: 3.0
  }
];

/**
 * Run validation tests on the scoring system
 */
export function runScoreValidation(): { passed: number; failed: number; results: Array<{ name: string; passed: boolean; score: number; expected: string }> } {
  console.info('[SCORE][VALIDATION] Starting validation tests...');
  
  const results = testFoods.map(testFood => {
    const actualScore = scoreFood(testFood.context);
    const passed = actualScore >= testFood.expectedMin && actualScore <= testFood.expectedMax;
    
    const result = {
      name: testFood.name,
      passed,
      score: actualScore,
      expected: `${testFood.expectedMin}-${testFood.expectedMax}`
    };
    
    const status = passed ? '✅' : '❌';
    console.info(`[SCORE][VALIDATION] ${status} ${testFood.name}: ${actualScore} (expected ${testFood.expectedMin}-${testFood.expectedMax})`);
    
    return result;
  });
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  console.info(`[SCORE][VALIDATION] Complete: ${passed} passed, ${failed} failed`);
  
  return { passed, failed, results };
}

/**
 * Quick console test for development
 */
export function quickTest() {
  if (import.meta.env.VITE_HEALTH_SCORE_V2 !== 'true') {
    console.warn('[SCORE][VALIDATION] V2 scoring disabled, skipping validation');
    return;
  }
  
  console.info('[SCORE][VALIDATION] Quick validation test');
  runScoreValidation();
}
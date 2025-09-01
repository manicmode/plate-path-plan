/**
 * Meal vs Packaged Product Detection
 * REV: MEAL_REV_SBX=2025-08-31T17:55Z-r2
 */

import { MealGateResult } from './types';

const MEAL_REV_SBX = "2025-08-31T17:55Z-r2";

// Food vessel and utensil indicators
const MEAL_INDICATORS = [
  'plate', 'bowl', 'fork', 'spoon', 'knife', 'table', 'dish', 'serving',
  'platter', 'cutting board', 'chopsticks', 'napkin', 'glass', 'cup',
  'meal', 'lunch', 'dinner', 'breakfast', 'food preparation'
];

// Packaged product indicators
const PACKAGE_INDICATORS = [
  'barcode', 'box', 'wrapper', 'bottle', 'package', 'logo', 'brand',
  'label', 'can', 'jar', 'container', 'plastic', 'packaging',
  'product', 'nutrition facts', 'ingredients list', 'upc'
];

// Multi-food indicators
const MULTI_FOOD_INDICATORS = [
  'salad', 'stir fry', 'pasta', 'rice bowl', 'sandwich', 'pizza',
  'soup', 'stew', 'casserole', 'plate of food', 'mixed vegetables'
];

/**
 * Lightweight heuristic to detect if image contains a meal vs packaged product
 */
export async function isMealPhoto(input: HTMLCanvasElement | string): Promise<MealGateResult> {
  try {
    // For now, use simple heuristics based on detected labels
    // In a real implementation, this would use computer vision APIs
    
    // Mock analysis - in real implementation this would analyze the image
    const mockLabels = await getMockImageLabels(input);
    
    let foodScore = 0;
    let packageScore = 0;
    
    // Check for meal indicators
    for (const label of mockLabels) {
      const lowerLabel = label.toLowerCase();
      
      if (MEAL_INDICATORS.some(indicator => lowerLabel.includes(indicator))) {
        foodScore += 1;
      }
      
      if (PACKAGE_INDICATORS.some(indicator => lowerLabel.includes(indicator))) {
        packageScore += 1;
      }
      
      if (MULTI_FOOD_INDICATORS.some(indicator => lowerLabel.includes(indicator))) {
        foodScore += 2; // Multi-food gets extra weight
      }
    }
    
    // Simple threshold rule
    const isMeal = (foodScore - packageScore) >= 1;
    
    const reason = isMeal 
      ? `Detected meal indicators (score: ${foodScore} vs ${packageScore})`
      : `Detected packaged product indicators (score: ${packageScore} vs ${foodScore})`;
    
    if (import.meta.env.VITE_DEBUG_MEAL === '1') {
      console.log('[MEAL][GATE]', { 
        rev: MEAL_REV_SBX, 
        isMeal, 
        foodScore, 
        packageScore, 
        reason,
        labels: mockLabels
      });
    }
    
    return {
      isMeal,
      reason,
      foodScore,
      packageScore
    };
    
  } catch (error) {
    console.error('[MEAL][GATE] Error analyzing image:', error);
    return {
      isMeal: false,
      reason: 'Analysis failed - defaulting to non-meal'
    };
  }
}

/**
 * Mock image label detection - replace with real computer vision API
 */
async function getMockImageLabels(input: HTMLCanvasElement | string): Promise<string[]> {
  // In real implementation, this would call a vision API
  // For now, return mock labels based on random selection
  
  const allPossibleLabels = [
    ...MEAL_INDICATORS.slice(0, 3),
    ...PACKAGE_INDICATORS.slice(0, 2),
    'food', 'organic', 'fresh'
  ];
  
  // Return 3-5 random labels for testing
  const numLabels = Math.floor(Math.random() * 3) + 3;
  const shuffled = [...allPossibleLabels].sort(() => 0.5 - Math.random());
  
  return shuffled.slice(0, numLabels);
}
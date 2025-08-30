/**
 * Nutritional Flags Engine
 * Analyzes nutrition data and generates health warnings/flags
 */

import type { NutritionPer100g, NutritionPerServing, PortionInfo } from '@/types/nutrition';

export interface FlagInfo {
  flag: string;
  severity: 'low' | 'medium' | 'high';
  message: string;
  source: 'ocr' | 'db' | 'calculation';
}

export interface FlagsInput {
  per100g: NutritionPer100g;
  perServing: NutritionPerServing;
  portionGrams: number;
  ingredientsText?: string;
  category?: string;
}

/**
 * Safe number conversion with fallback
 */
function toNum(value: any): number {
  return Number(value) || 0;
}

/**
 * Check for high sugar content
 */
function checkHighSugar(perServing: NutritionPerServing): FlagInfo[] {
  const sugar = toNum(perServing.sugar);
  const flags: FlagInfo[] = [];
  
  if (sugar >= 15) {
    flags.push({
      flag: 'very_high_sugar',
      severity: 'high',
      message: `Very high sugar content: ${sugar.toFixed(1)}g per serving`,
      source: 'calculation'
    });
  } else if (sugar >= 10) {
    flags.push({
      flag: 'high_sugar',
      severity: 'medium', 
      message: `High sugar content: ${sugar.toFixed(1)}g per serving`,
      source: 'calculation'
    });
  }
  
  return flags;
}

/**
 * Check for high sodium content
 */
function checkHighSodium(perServing: NutritionPerServing): FlagInfo[] {
  const sodium = toNum(perServing.sodium);
  const flags: FlagInfo[] = [];
  
  if (sodium >= 600) {
    flags.push({
      flag: 'very_high_sodium',
      severity: 'high',
      message: `Very high sodium: ${sodium}mg per serving`,
      source: 'calculation'
    });
  } else if (sodium >= 400) {
    flags.push({
      flag: 'high_sodium', 
      severity: 'medium',
      message: `High sodium: ${sodium}mg per serving`,
      source: 'calculation'
    });
  }
  
  return flags;
}

/**
 * Check for high saturated fat
 */
function checkHighSaturatedFat(perServing: NutritionPerServing): FlagInfo[] {
  const satFat = toNum(perServing.saturated_fat);
  const flags: FlagInfo[] = [];
  
  if (satFat >= 8) {
    flags.push({
      flag: 'very_high_saturated_fat',
      severity: 'high',
      message: `Very high saturated fat: ${satFat.toFixed(1)}g per serving`,
      source: 'calculation'
    });
  } else if (satFat >= 5) {
    flags.push({
      flag: 'high_saturated_fat',
      severity: 'medium',
      message: `High saturated fat: ${satFat.toFixed(1)}g per serving`, 
      source: 'calculation'
    });
  }
  
  return flags;
}

/**
 * Check for artificial ingredients in text
 */
function checkArtificialIngredients(ingredientsText: string): FlagInfo[] {
  if (!ingredientsText) return [];
  
  const text = ingredientsText.toLowerCase();
  const flags: FlagInfo[] = [];
  
  // Artificial colors
  const colorPatterns = [
    'red 40', 'yellow 5', 'yellow 6', 'blue 1', 'blue 2',
    'artificial color', 'fd&c', 'tartrazine'
  ];
  
  if (colorPatterns.some(pattern => text.includes(pattern))) {
    flags.push({
      flag: 'artificial_colors',
      severity: 'medium',
      message: 'Contains artificial colors',
      source: 'ocr'
    });
  }
  
  // Artificial flavors
  if (text.includes('artificial flavor') || text.includes('artificial flavoring')) {
    flags.push({
      flag: 'artificial_flavors',
      severity: 'low',
      message: 'Contains artificial flavors',
      source: 'ocr'
    });
  }
  
  // Preservatives
  const preservatives = [
    'bha', 'bht', 'sodium benzoate', 'potassium sorbate',
    'sodium nitrite', 'sodium nitrate'
  ];
  
  if (preservatives.some(preservative => text.includes(preservative))) {
    flags.push({
      flag: 'preservatives',
      severity: 'low',
      message: 'Contains preservatives',
      source: 'ocr'
    });
  }
  
  // High fructose corn syrup
  if (text.includes('high fructose corn syrup') || text.includes('hfcs')) {
    flags.push({
      flag: 'high_fructose_corn_syrup',
      severity: 'medium',
      message: 'Contains high fructose corn syrup',
      source: 'ocr'
    });
  }
  
  return flags;
}

/**
 * Check for ultra-processed indicators
 */
function checkUltraProcessed(ingredientsText: string, category?: string): FlagInfo[] {
  const flags: FlagInfo[] = [];
  
  if (!ingredientsText) return flags;
  
  const text = ingredientsText.toLowerCase();
  
  // Count ingredients (rough estimate)
  const ingredientCount = text.split(',').length;
  
  if (ingredientCount > 15) {
    flags.push({
      flag: 'ultra_processed',
      severity: 'medium', 
      message: 'Highly processed with many ingredients',
      source: 'ocr'
    });
  }
  
  // Check for emulsifiers, stabilizers, etc.
  const processingIndicators = [
    'mono- and diglycerides', 'lecithin', 'xanthan gum',
    'carrageenan', 'modified starch', 'maltodextrin'
  ];
  
  const foundIndicators = processingIndicators.filter(indicator => 
    text.includes(indicator)
  );
  
  if (foundIndicators.length >= 2) {
    flags.push({
      flag: 'multiple_emulsifiers',
      severity: 'low',
      message: 'Contains multiple emulsifiers and stabilizers',
      source: 'ocr'
    });
  }
  
  return flags;
}

/**
 * Main flags analysis engine
 * Analyzes nutrition data and ingredients to generate health flags
 */
export function runFlagsEngine(input: FlagsInput): FlagInfo[] {
  const flags: FlagInfo[] = [];
  
  try {
    // Nutritional flags based on per-serving values
    flags.push(...checkHighSugar(input.perServing));
    flags.push(...checkHighSodium(input.perServing));
    flags.push(...checkHighSaturatedFat(input.perServing));
    
    // Ingredient-based flags
    if (input.ingredientsText) {
      flags.push(...checkArtificialIngredients(input.ingredientsText));
      flags.push(...checkUltraProcessed(input.ingredientsText, input.category));
    }
    
    // Log telemetry
    console.info('[REPORT][V2][FLAGS][RUN]', { 
      count: flags.length,
      portionGrams: input.portionGrams,
      flags: flags.map(f => f.flag)
    });
    
    return flags;
    
  } catch (error) {
    console.error('[REPORT][V2][FLAGS][ERROR]', {
      stage: 'analysis',
      message: error.message
    });
    
    return []; // Return empty flags on error
  }
}

/**
 * Get flags sorted by severity
 */
export function getFlagsBySeverity(flags: FlagInfo[]): {
  high: FlagInfo[];
  medium: FlagInfo[];
  low: FlagInfo[];
} {
  return {
    high: flags.filter(f => f.severity === 'high'),
    medium: flags.filter(f => f.severity === 'medium'), 
    low: flags.filter(f => f.severity === 'low')
  };
}

/**
 * Get total flag count by severity
 */
export function getFlagCounts(flags: FlagInfo[]): {
  total: number;
  high: number;
  medium: number;
  low: number;
} {
  const bySeverity = getFlagsBySeverity(flags);
  
  return {
    total: flags.length,
    high: bySeverity.high.length,
    medium: bySeverity.medium.length,
    low: bySeverity.low.length
  };
}
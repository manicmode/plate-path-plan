/**
 * Serving Size Normalization Utilities
 * Handles parsing and scaling of food serving sizes
 */

export interface ParsedServing {
  baseServingLabel: string;
  baseServingQuantity: number;
  baseServingUnit: string;
  isCountBased: boolean;
  isWeightBased: boolean;
}

export interface PerUnitNutrition {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  saturated_fat?: number;
}

export interface NormalizationResult {
  titleText: string;
  subtitleText: string;
  perUnitCalories: number;
  effectiveQuantity: number;
  finalCalories: number;
  nutrition: PerUnitNutrition;
}

const COUNT_UNITS = ['piece', 'pieces', 'slice', 'slices', 'egg', 'eggs', 'item', 'items', 'unit', 'units', 'serving', 'servings'];
const WEIGHT_UNITS = ['g', 'gram', 'grams', 'kg', 'kilogram', 'kilograms', 'oz', 'ounce', 'ounces', 'lb', 'pound', 'pounds'];

/**
 * Parses a serving label to extract quantity, unit, and type information
 */
export function parseServingLabel(label: string): ParsedServing {
  const normalizedLabel = label.toLowerCase().trim();
  
  // Extract number from the beginning
  const numberMatch = normalizedLabel.match(/^(\d+(?:\.\d+)?)\s*/);
  const baseServingQuantity = numberMatch ? parseFloat(numberMatch[1]) : 1;
  
  // Extract unit after the number
  const remainingText = normalizedLabel.replace(/^\d+(?:\.\d+)?\s*/, '');
  const unitMatch = remainingText.match(/^([a-z]+)/);
  const baseServingUnit = unitMatch ? unitMatch[1] : '';
  
  // Determine if count-based or weight-based
  const isCountBased = COUNT_UNITS.includes(baseServingUnit) || 
    (baseServingQuantity > 0 && !baseServingUnit && normalizedLabel.includes('egg'));
  const isWeightBased = WEIGHT_UNITS.includes(baseServingUnit);
  
  return {
    baseServingLabel: label,
    baseServingQuantity,
    baseServingUnit,
    isCountBased,
    isWeightBased
  };
}

/**
 * Converts base nutrition to per-unit nutrition for count-based items
 */
export function getPerUnitNutrition(
  baseNutrition: PerUnitNutrition, 
  baseServingQuantity: number
): PerUnitNutrition {
  if (baseServingQuantity <= 0) return baseNutrition;
  
  return {
    calories: baseNutrition.calories / baseServingQuantity,
    protein: baseNutrition.protein / baseServingQuantity,
    carbs: baseNutrition.carbs / baseServingQuantity,
    fat: baseNutrition.fat / baseServingQuantity,
    fiber: baseNutrition.fiber / baseServingQuantity,
    sugar: baseNutrition.sugar / baseServingQuantity,
    sodium: baseNutrition.sodium / baseServingQuantity,
    saturated_fat: baseNutrition.saturated_fat ? baseNutrition.saturated_fat / baseServingQuantity : undefined
  };
}

/**
 * Normalizes serving information and calculates final nutrition values
 */
export function normalizeServing(
  foodName: string,
  quantity: string,
  baseNutrition: PerUnitNutrition,
  baseServingInfo?: string
): NormalizationResult {
  // Parse user quantity
  const quantityMatch = quantity.match(/(\d+(?:\.\d+)?)\s*(.*)/) || ['', '1', ''];
  const userQuantity = parseFloat(quantityMatch[1]) || 1;
  const userUnit = quantityMatch[2]?.toLowerCase().trim() || '';
  
  // Parse base serving if provided
  const parsedServing = baseServingInfo ? parseServingLabel(baseServingInfo) : null;
  
  let perUnitNutrition: PerUnitNutrition;
  let effectiveQuantity: number;
  let titleText: string;
  let subtitleText: string;
  
  if (parsedServing?.isCountBased) {
    // For count-based items, divide base nutrition by base quantity
    perUnitNutrition = getPerUnitNutrition(baseNutrition, parsedServing.baseServingQuantity);
    effectiveQuantity = userQuantity;
    titleText = `${userQuantity} ${userUnit || parsedServing.baseServingUnit || ''} ${foodName}`.trim();
    subtitleText = `Based on ${parsedServing.baseServingLabel}`;
  } else if (parsedServing?.isWeightBased) {
    // For weight-based items, use direct scaling
    const baseWeight = parsedServing.baseServingQuantity;
    const userWeight = userQuantity;
    const scaleFactor = userWeight / baseWeight;
    
    perUnitNutrition = {
      calories: baseNutrition.calories * scaleFactor,
      protein: baseNutrition.protein * scaleFactor,
      carbs: baseNutrition.carbs * scaleFactor,
      fat: baseNutrition.fat * scaleFactor,
      fiber: baseNutrition.fiber * scaleFactor,
      sugar: baseNutrition.sugar * scaleFactor,
      sodium: baseNutrition.sodium * scaleFactor,
      saturated_fat: baseNutrition.saturated_fat ? baseNutrition.saturated_fat * scaleFactor : undefined
    };
    effectiveQuantity = 1;
    titleText = `${userQuantity} ${userUnit || parsedServing.baseServingUnit} ${foodName}`.trim();
    subtitleText = `Scaled from ${parsedServing.baseServingLabel}`;
  } else {
    // Default case - treat as direct multiplier
    perUnitNutrition = baseNutrition;
    effectiveQuantity = userQuantity;
    titleText = userQuantity === 1 ? foodName : `${userQuantity} ${userUnit} ${foodName}`.trim();
    subtitleText = baseServingInfo || 'Estimated serving';
  }
  
  // Calculate final nutrition
  const finalNutrition: PerUnitNutrition = {
    calories: perUnitNutrition.calories * effectiveQuantity,
    protein: perUnitNutrition.protein * effectiveQuantity,
    carbs: perUnitNutrition.carbs * effectiveQuantity,
    fat: perUnitNutrition.fat * effectiveQuantity,
    fiber: perUnitNutrition.fiber * effectiveQuantity,
    sugar: perUnitNutrition.sugar * effectiveQuantity,
    sodium: perUnitNutrition.sodium * effectiveQuantity,
    saturated_fat: perUnitNutrition.saturated_fat ? perUnitNutrition.saturated_fat * effectiveQuantity : undefined
  };
  
  return {
    titleText,
    subtitleText,
    perUnitCalories: perUnitNutrition.calories,
    effectiveQuantity,
    finalCalories: finalNutrition.calories,
    nutrition: finalNutrition
  };
}

/**
 * Gets debug information for serving normalization
 */
export function getServingDebugInfo(
  foodName: string,
  quantity: string,
  baseNutrition: PerUnitNutrition,
  baseServingInfo?: string,
  sourceChosen?: string,
  reason?: string
) {
  const normalized = normalizeServing(foodName, quantity, baseNutrition, baseServingInfo);
  const parsedServing = baseServingInfo ? parseServingLabel(baseServingInfo) : null;
  
  return {
    ...normalized,
    baseServingLabel: parsedServing?.baseServingLabel || 'Unknown',
    baseServingQuantity: parsedServing?.baseServingQuantity || 1,
    baseServingUnit: parsedServing?.baseServingUnit || '',
    sourceChosen: sourceChosen || 'unknown',
    reason: reason || 'no_reason_provided',
    isCountBased: parsedServing?.isCountBased || false,
    isWeightBased: parsedServing?.isWeightBased || false
  };
}
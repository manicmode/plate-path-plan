/**
 * Serving normalization utilities for parsing and scaling nutrition data
 */

export interface ServingInfo {
  baseServingLabel: string;
  baseServingQuantity: number;
  baseServingUnit: string;
  isQuantityBased: boolean;
  isWeightBased: boolean;
}

export interface NutritionData {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  saturated_fat?: number;
}

export interface ParsedQuantity {
  numeric: number;
  unit?: string;
  isEstimated: boolean;
}

export interface NormalizedNutrition extends NutritionData {
  perUnitCalories: number;
  scalingFactor: number;
  servingInfo: ServingInfo;
  finalQuantity: number;
  finalUnit?: string;
}

/**
 * Parse a serving label to extract quantity and unit information
 * Examples: "2 large eggs", "3 slices", "100 g", "1 medium avocado"
 */
export function parseServingLabel(servingLabel: string): ServingInfo {
  const normalizedLabel = servingLabel.toLowerCase().trim();
  
  // Match patterns like "2 large eggs", "3 slices", "100 g", "1 medium avocado"
  const quantityPattern = /^(\d+(?:\.\d+)?)\s*([a-z]+)?\s*(.*)$/;
  const match = normalizedLabel.match(quantityPattern);
  
  if (match) {
    const quantity = parseFloat(match[1]);
    const potentialUnit = match[2];
    const remainder = match[3].trim();
    
    // Weight-based units
    const weightUnits = ['g', 'gram', 'grams', 'kg', 'kilogram', 'kilograms', 'oz', 'ounce', 'ounces', 'lb', 'pound', 'pounds'];
    
    // Count-based units
    const countUnits = ['egg', 'eggs', 'slice', 'slices', 'piece', 'pieces', 'cup', 'cups', 'tbsp', 'tablespoon', 'tablespoons', 'tsp', 'teaspoon', 'teaspoons'];
    
    let unit = '';
    let isWeightBased = false;
    let isQuantityBased = false;
    
    if (potentialUnit && weightUnits.includes(potentialUnit)) {
      unit = potentialUnit;
      isWeightBased = true;
    } else if (potentialUnit && countUnits.includes(potentialUnit)) {
      unit = potentialUnit;
      isQuantityBased = true;
    } else {
      // Check remainder for units
      for (const weightUnit of weightUnits) {
        if (remainder.includes(weightUnit)) {
          unit = weightUnit;
          isWeightBased = true;
          break;
        }
      }
      
      if (!unit) {
        for (const countUnit of countUnits) {
          if (remainder.includes(countUnit)) {
            unit = countUnit;
            isQuantityBased = true;
            break;
          }
        }
      }
    }
    
    // If no specific unit found but we have descriptive text, assume it's quantity-based
    if (!unit && remainder) {
      const descriptors = ['large', 'medium', 'small', 'whole', 'half', 'quarter'];
      const hasDescriptor = descriptors.some(desc => remainder.includes(desc));
      if (hasDescriptor) {
        // Infer unit from remainder (e.g., "large eggs" -> "eggs")
        const pluralPattern = /(\w+)s?$/;
        const pluralMatch = remainder.match(pluralPattern);
        if (pluralMatch) {
          unit = pluralMatch[1].endsWith('s') ? pluralMatch[1] : pluralMatch[1] + 's';
          isQuantityBased = true;
        }
      }
    }
    
    return {
      baseServingLabel: servingLabel,
      baseServingQuantity: quantity,
      baseServingUnit: unit || 'serving',
      isQuantityBased,
      isWeightBased
    };
  }
  
  // Default case - assume single serving
  return {
    baseServingLabel: servingLabel,
    baseServingQuantity: 1,
    baseServingUnit: 'serving',
    isQuantityBased: false,
    isWeightBased: false
  };
}

/**
 * Parse user quantity input from GPT
 * Examples: "2", "1 cup", "150 g", "2 eggs"
 */
export function parseUserQuantity(quantityStr?: string): ParsedQuantity {
  if (!quantityStr) {
    return { numeric: 1, isEstimated: true };
  }
  
  const normalizedInput = quantityStr.toLowerCase().trim();
  
  // Extract numeric value and optional unit
  const match = normalizedInput.match(/^(\d+(?:\.\d+)?)\s*(.*)$/);
  if (match) {
    const numeric = parseFloat(match[1]);
    const unitPart = match[2].trim();
    
    if (isNaN(numeric)) {
      return { numeric: 1, isEstimated: true };
    }
    
    return {
      numeric,
      unit: unitPart || undefined,
      isEstimated: false
    };
  }
  
  return { numeric: 1, isEstimated: true };
}

/**
 * Normalize nutrition data based on serving information and user quantity
 */
export function normalizeNutrition(
  baseNutrition: NutritionData,
  servingLabel: string,
  userQuantity?: string
): NormalizedNutrition {
  const servingInfo = parseServingLabel(servingLabel);
  const parsedQuantity = parseUserQuantity(userQuantity);
  
  // Calculate per-unit nutrition by dividing base nutrition by base serving quantity
  const perUnitNutrition: NutritionData = {
    calories: baseNutrition.calories / servingInfo.baseServingQuantity,
    protein: baseNutrition.protein / servingInfo.baseServingQuantity,
    carbs: baseNutrition.carbs / servingInfo.baseServingQuantity,
    fat: baseNutrition.fat / servingInfo.baseServingQuantity,
    fiber: baseNutrition.fiber / servingInfo.baseServingQuantity,
    sugar: baseNutrition.sugar / servingInfo.baseServingQuantity,
    sodium: baseNutrition.sodium / servingInfo.baseServingQuantity,
    saturated_fat: (baseNutrition.saturated_fat || 0) / servingInfo.baseServingQuantity
  };
  
  // Determine final scaling factor
  let scalingFactor = parsedQuantity.numeric;
  let finalUnit = parsedQuantity.unit;
  
  // Unit compatibility check
  if (parsedQuantity.unit && servingInfo.baseServingUnit) {
    const userUnitNormalized = parsedQuantity.unit.toLowerCase();
    const baseUnitNormalized = servingInfo.baseServingUnit.toLowerCase();
    
    // Check if units are compatible (same type)
    const weightUnits = ['g', 'gram', 'grams', 'kg', 'kilogram', 'kilograms', 'oz', 'ounce', 'ounces'];
    const countUnits = ['egg', 'eggs', 'slice', 'slices', 'piece', 'pieces'];
    
    const userIsWeight = weightUnits.some(unit => userUnitNormalized.includes(unit));
    const baseIsWeight = weightUnits.some(unit => baseUnitNormalized.includes(unit));
    const userIsCount = countUnits.some(unit => userUnitNormalized.includes(unit));
    const baseIsCount = countUnits.some(unit => baseUnitNormalized.includes(unit));
    
    // If units are incompatible, prefer the base serving approach
    if ((userIsWeight && baseIsCount) || (userIsCount && baseIsWeight)) {
      console.warn(`Unit mismatch: user specified ${parsedQuantity.unit} but base serving is ${servingInfo.baseServingUnit}`);
      // Keep the scaling but note the mismatch
      finalUnit = servingInfo.baseServingUnit;
    }
  }
  
  // If no user unit specified, inherit from base serving
  if (!finalUnit) {
    finalUnit = servingInfo.baseServingUnit;
  }
  
  // Calculate final nutrition values
  const finalNutrition: NormalizedNutrition = {
    calories: Math.round(perUnitNutrition.calories * scalingFactor),
    protein: Math.round(perUnitNutrition.protein * scalingFactor * 10) / 10,
    carbs: Math.round(perUnitNutrition.carbs * scalingFactor * 10) / 10,
    fat: Math.round(perUnitNutrition.fat * scalingFactor * 10) / 10,
    fiber: Math.round(perUnitNutrition.fiber * scalingFactor * 10) / 10,
    sugar: Math.round(perUnitNutrition.sugar * scalingFactor * 10) / 10,
    sodium: Math.round(perUnitNutrition.sodium * scalingFactor),
    saturated_fat: Math.round((perUnitNutrition.saturated_fat || 0) * scalingFactor * 10) / 10,
    perUnitCalories: Math.round(perUnitNutrition.calories * 10) / 10,
    scalingFactor,
    servingInfo,
    finalQuantity: parsedQuantity.numeric,
    finalUnit
  };
  
  return finalNutrition;
}

/**
 * Determine which nutrition source to prefer based on user input and available data
 */
export function selectPreferredNutritionSource(
  userQuantity?: string,
  availableSources: { source: string; isWeightBased: boolean; isCountBased: boolean; }[] = []
): string {
  const parsedQuantity = parseUserQuantity(userQuantity);
  
  if (!parsedQuantity.unit) {
    // No unit specified, prefer count-based if available, otherwise weight-based
    const countBased = availableSources.find(s => s.isCountBased);
    if (countBased) return countBased.source;
    
    const weightBased = availableSources.find(s => s.isWeightBased);
    if (weightBased) return weightBased.source;
    
    return 'generic';
  }
  
  const userUnit = parsedQuantity.unit.toLowerCase();
  const weightUnits = ['g', 'gram', 'grams', 'kg', 'kilogram', 'kilograms', 'oz', 'ounce', 'ounces'];
  const countUnits = ['egg', 'eggs', 'slice', 'slices', 'piece', 'pieces'];
  
  const userWantsWeight = weightUnits.some(unit => userUnit.includes(unit));
  const userWantsCount = countUnits.some(unit => userUnit.includes(unit));
  
  if (userWantsWeight) {
    const weightBased = availableSources.find(s => s.isWeightBased);
    if (weightBased) return weightBased.source;
  }
  
  if (userWantsCount) {
    const countBased = availableSources.find(s => s.isCountBased);
    if (countBased) return countBased.source;
  }
  
  // Fallback to first available
  return availableSources[0]?.source || 'generic';
}

/**
 * Generate display title with quantity and unit, handling unit mismatches
 */
export function generateDisplayTitle(
  foodName: string,
  quantity: number,
  unit?: string,
  isEstimated: boolean = false
): string {
  let title = foodName;
  
  if (quantity > 1 || unit) {
    const quantityStr = quantity === Math.floor(quantity) ? quantity.toString() : quantity.toFixed(1);
    
    // Handle unit compatibility - avoid nonsensical combinations
    if (unit && unit !== 'serving') {
      const weightUnits = ['g', 'gram', 'grams', 'kg', 'kilogram', 'kilograms', 'oz', 'ounce', 'ounces'];
      const countUnits = ['egg', 'eggs', 'slice', 'slices', 'piece', 'pieces', 'cup', 'cups'];
      const isWeightUnit = weightUnits.some(w => unit.toLowerCase().includes(w));
      const isCountUnit = countUnits.some(c => unit.toLowerCase().includes(c));
      
      // Prevent titles like "1 g avocado" - keep weight-based as is for common weights
      if (isWeightUnit && quantity <= 1) {
        // For single weight units, show the food name as-is and let serving info handle the details
        title = foodName;
      } else if (isCountUnit || quantity > 1) {
        // Show quantity for count units or multiple quantities
        const displayUnit = isCountUnit ? '' : ` ${unit}`;
        title = `${quantityStr}${displayUnit} ${foodName}`;
      } else {
        // Default case
        title = `${quantityStr} ${unit} ${foodName}`;
      }
    } else if (quantity > 1) {
      // No unit but quantity > 1
      title = `${quantityStr} ${foodName}`;
    }
  }
  
  if (isEstimated) {
    title += ' (estimated)';
  }
  
  return title;
}

/**
 * Intelligent portion inference system
 * Estimates realistic portions based on food type, units, and context
 */

import { PORTION_DEFAULTS, FOOD_CLASS_MAP, SIZE_MULTIPLIERS, PortionClass } from './portionDefaults';
import { ParsedFacets } from '../text/parse';

export interface PortionEstimate {
  grams: number;
  unit: string;
  source: 'class_default' | 'unit_count' | 'custom_amount';
  displayText: string;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Infers portion size for a food candidate
 */
export function inferPortion(
  foodName: string,
  originalText: string,
  facets?: ParsedFacets,
  classId?: string
): PortionEstimate {
  console.log('[PORTION][INFER]', { foodName, originalText, classId, facets });
  
  // Strategy 1: Use provided classId
  if (classId && classId in PORTION_DEFAULTS) {
    const portion = PORTION_DEFAULTS[classId as PortionClass];
    return {
      grams: portion.grams,
      unit: portion.unit,
      source: 'class_default',
      displayText: `${portion.grams} g (${portion.unit})`,
      confidence: 'high'
    };
  }
  
  // Strategy 2: Extract from unit count in original text or facets
  if (facets?.units) {
    const { count, unit } = facets.units;
    
    // Find the base portion for this unit type
    let baseGrams = 100; // fallback
    let baseUnit = unit || 'portion';
    
    // Map units to portion classes
    const unitToClass: Record<string, PortionClass> = {
      'slice': 'pizza_slice',
      'bowl': 'teriyaki_bowl',
      'roll': 'california_roll',
      'cup': 'rice_cooked',
      'egg': 'egg_large',
    };
    
    if (unit && unit in unitToClass) {
      const portionClass = unitToClass[unit as keyof typeof unitToClass];
      const portion = PORTION_DEFAULTS[portionClass];
      baseGrams = portion.grams;
      baseUnit = portion.unit;
    }
    
    const totalGrams = Math.round(baseGrams * (count || 1));
    
    return {
      grams: totalGrams,
      unit: baseUnit,
      source: 'unit_count',
      displayText: `${totalGrams} g (${count || 1} ${baseUnit}${(count || 1) !== 1 ? 's' : ''})`,
      confidence: 'high'
    };
  }
  
  // Strategy 3: Special cases - club sandwich gets better default portions
  if (classId === 'club_sandwich' || /\bclub\s+sand(wich)?\b/i.test(foodName)) {
    return {
      grams: 150,
      unit: '1 sandwich',
      source: 'class_default', 
      displayText: '150 g (1 sandwich)',
      confidence: 'high'
    };
  }
  
  // Strategy 4: Map food name to portion class
  const normalizedName = foodName.toLowerCase();
  
  for (const [pattern, portionClass] of Object.entries(FOOD_CLASS_MAP)) {
    if (normalizedName.includes(pattern.toLowerCase())) {
      const portion = PORTION_DEFAULTS[portionClass];
      
      // Check for size modifiers
      let multiplier = 1.0;
      for (const [size, mult] of Object.entries(SIZE_MULTIPLIERS)) {
        if (originalText.toLowerCase().includes(size)) {
          multiplier = mult;
          break;
        }
      }
      
      const adjustedGrams = Math.round(portion.grams * multiplier);
      
      return {
        grams: adjustedGrams,
        unit: portion.unit,
        source: 'class_default',
        displayText: `${adjustedGrams} g (${portion.unit}${multiplier !== 1.0 ? `, ${Object.keys(SIZE_MULTIPLIERS).find(k => SIZE_MULTIPLIERS[k as keyof typeof SIZE_MULTIPLIERS] === multiplier)}` : ''})`,
        confidence: 'medium'
      };
    }
  }
  
    // Strategy 4: Fallback to 100g
    console.log('[PORTION][INFER] from: fallback');
  return {
    grams: 100,
    unit: 'custom amount',
    source: 'custom_amount',
    displayText: '100 g (custom amount)',
    confidence: 'low'
  };
}

/**
 * Simple helper for backward compatibility
 */
export function estimatePortionFromName(name: string): number {
  const estimate = inferPortion(name, name);
  return estimate.grams;
}
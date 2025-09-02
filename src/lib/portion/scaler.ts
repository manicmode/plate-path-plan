/**
 * Portion Estimation v3 - Multi-signal Scaler
 * Combines count rules, area scaling, and heuristic fallback
 */

import { inferCountGrams } from './countRules';
import { basePortionFor, clampToRange } from './baseDefaults';
import { estimateItemFootprint, normalizePlateRatio, lerp } from './itemFootprint';
import { estimatePortionWithDefaults } from './estimate'; // v2 fallback
import { logCountHit, logAreaScale, logFinalPortion } from './log';

export interface PortionInputs {
  name: string;
  cat?: string;
  hints?: string; // GPT hint text like "1 fillet", "~6 spears"
  bbox?: { x: number; y: number; w: number; h: number };
  maskArea?: number;
}

export interface PortionResult {
  grams: number;
  source: 'count' | 'area' | 'base' | 'heuristic';
  range?: [number, number];
}

interface EstimationContext {
  plateArea?: number;
  mode?: 'strict' | 'lenient';
}

export async function estimatePortionV3(
  det: PortionInputs,
  ctx: EstimationContext = {}
): Promise<PortionResult> {
  try {
    const { name, cat, hints, bbox, maskArea } = det;
    const { plateArea, mode = 'lenient' } = ctx;
    
    // 1. Count model (highest priority)
    const countResult = inferCountGrams({ name, hints });
    if (countResult.grams && countResult.basis === 'count') {
      const base = basePortionFor(name, cat);
      const clampedGrams = clampToRange(countResult.grams, base);
      const finalGrams = roundToNearest5(clampedGrams);
      
      logCountHit(name, hints || '', finalGrams);
      logFinalPortion(name, finalGrams, 'count');
      
      return {
        grams: finalGrams,
        source: 'count',
        range: [Math.round(finalGrams * 0.85), Math.round(finalGrams * 1.15)]
      };
    }
    
    // 2. Area scaling (if plate detected)
    if (plateArea && plateArea > 0 && (bbox || maskArea)) {
      const footprint = estimateItemFootprint({ name, bbox, maskArea }, plateArea);
      
      if (footprint.plateRatio && footprint.plateRatio > 0.005) {
        const base = basePortionFor(name, cat);
        const scaledGrams = scaleByArea(name, cat, base.grams, footprint.plateRatio);
        const clampedGrams = clampToRange(scaledGrams, base);
        const finalGrams = roundToNearest5(clampedGrams);
        
        logAreaScale(name, footprint.plateRatio, base.grams, scaledGrams);
        logFinalPortion(name, finalGrams, 'area');
        
        return {
          grams: finalGrams,
          source: 'area',
          range: [Math.round(finalGrams * 0.85), Math.round(finalGrams * 1.15)]
        };
      }
    }
    
    // 3. Base default (no plate area or area info)
    const base = basePortionFor(name, cat);
    const finalGrams = roundToNearest5(base.grams);
    
    logFinalPortion(name, finalGrams, 'base');
    
    return {
      grams: finalGrams,
      source: 'base',
      range: [Math.round(finalGrams * 0.85), Math.round(finalGrams * 1.15)]
    };
    
  } catch (error) {
    console.warn('[PORTION][V3] Error, falling back to v2:', error);
    
    // 4. Heuristic fallback (v2 compatibility)
    try {
      const v2Result = await estimatePortionWithDefaults(det.name, det.cat || '', det.hints || null);
      const finalGrams = roundToNearest5(v2Result.grams);
      
      logFinalPortion(det.name, finalGrams, 'heuristic');
      
      return {
        grams: finalGrams,
        source: 'heuristic',
        range: [Math.round(finalGrams * 0.85), Math.round(finalGrams * 1.15)]
      };
    } catch (v2Error) {
      console.error('[PORTION][V3] V2 fallback also failed:', v2Error);
      
      // Ultimate fallback
      const fallbackGrams = 100;
      return {
        grams: fallbackGrams,
        source: 'heuristic',
        range: [85, 115]
      };
    }
  }
}

// Scale base portion by plate area ratio
function scaleByArea(name: string, category: string | undefined, baseGrams: number, plateRatio: number): number {
  const lowerName = name.toLowerCase();
  const cat = category || 'other';
  
  // Category-specific scaling curves
  if (cat === 'vegetable' || lowerName.includes('salad') || lowerName.includes('greens')) {
    // Leafy vegetables: more dramatic scaling
    const t = normalizePlateRatio(plateRatio, 0.05, 0.35);
    return baseGrams * lerp(0.7, 1.6, t);
  }
  
  if (cat === 'protein' || ['salmon', 'chicken', 'beef', 'pork', 'fish'].some(p => lowerName.includes(p))) {
    // Proteins: moderate scaling
    const t = normalizePlateRatio(plateRatio, 0.03, 0.25);
    return baseGrams * lerp(0.6, 1.8, t);
  }
  
  if (cat === 'fruit' || ['lemon', 'lime', 'apple', 'orange'].some(f => lowerName.includes(f))) {
    // Fruits: conservative scaling
    const t = normalizePlateRatio(plateRatio, 0.02, 0.20);
    return baseGrams * lerp(0.8, 1.4, t);
  }
  
  if (cat === 'sauce_condiment' || cat === 'fat_oil') {
    // Condiments: very limited scaling
    const t = normalizePlateRatio(plateRatio, 0.01, 0.15);
    return baseGrams * lerp(0.8, 2.0, t);
  }
  
  // Default scaling for other categories
  const t = normalizePlateRatio(plateRatio, 0.03, 0.30);
  return baseGrams * lerp(0.7, 1.7, t);
}

// Round to nearest 5g for clean UI
function roundToNearest5(grams: number): number {
  return Math.max(5, Math.round(grams / 5) * 5);
}
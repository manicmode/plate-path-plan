// Orchestration layer for ensemble food detection

import { detectFoodVisionV1, VisionV1Result } from './vision_v1';
import { detectFoodGptV, GptVisionResult } from './gpt_v';
import { detectGptFirst, GptFirstResult, DetectedItem } from './gptFirst';
import { fuseDetections, FusedFood } from './ensemble';
import { estimatePortions, PortionEstimate } from '@/portion/estimate';
import { estimatePortionIntelligent } from '@/lib/portionEstimation';
import { looksFoodish } from './filters';
import { FF } from '@/featureFlags';

export interface DetectionAndFusionResult {
  fused: FusedFood[];
  portions: PortionEstimate[];
  visionRaw?: VisionV1Result;
  gptRaw?: GptVisionResult;
  gptFirstResult?: GptFirstResult;
  ensembleUsed: boolean;
  detectionPath: 'gpt-first' | 'vision-first' | 'vision-only';
  _debug?: {
    visionFoodCount: number;
    gptFoodCount: number;
    fusedCount: number;
    costIncurred: boolean;
    gptFirstUsed: boolean;
    fallbackUsed: boolean;
  };
}

export async function detectAndFuseFoods(
  base64: string, 
  { useEnsemble }: { useEnsemble: boolean }
): Promise<DetectionAndFusionResult> {
  
  // Check if GPT-first is enabled
  if (FF.FEATURE_USE_GPT_FIRST) {
    console.log('[DETECT] Using GPT-first pipeline');
    
    const gptFirstResult = await detectGptFirst(base64);
    
    // Convert GPT-first items to portions with intelligent estimation
    const portions = gptFirstResult.items.map(item => ({
      name: item.name,
      grams_est: item.portion_estimate || estimatePortionIntelligent(item.name, item.category).grams,
      confidence: item.confidence >= 0.7 ? 'high' as const : 
                  item.confidence >= 0.5 ? 'medium' as const : 'low' as const,
      area_ratio: undefined,
      food_class: item.category,
      source: item.source
    }));
    
    // Convert items to fused format for compatibility
    const fused = gptFirstResult.items.map(item => ({
      canonicalName: item.name,
      sources: new Set([item.source]),
      origin: item.source as 'vision' | 'gpt',
      bbox: undefined,
      score: item.confidence
    }));
    
    const result: DetectionAndFusionResult = {
      fused,
      portions,
      gptFirstResult,
      visionRaw: gptFirstResult.visionResult,
      gptRaw: gptFirstResult.gptResult,
      ensembleUsed: gptFirstResult.source === 'hybrid',
      detectionPath: 'gpt-first',
      _debug: {
        visionFoodCount: gptFirstResult.visionResult?.foods?.length || 0,
        gptFoodCount: gptFirstResult.gptResult?.names?.length || 0,
        fusedCount: fused.length,
        costIncurred: gptFirstResult.source === 'gpt' || gptFirstResult.source === 'hybrid',
        gptFirstUsed: true,
        fallbackUsed: gptFirstResult._debug?.fallbackUsed || false
      }
    };
    
    // DEV summary logging
    if (import.meta.env.DEV) {
      console.info('[DETECT_GPT_FIRST]', {
        source: gptFirstResult.source,
        items: gptFirstResult.items.length,
        filtered: gptFirstResult._debug?.filteredCount || 0,
        portions: portions.map(p => `${p.name}:${p.grams_est}g`).slice(0, 3)
      });
    }
    
    return result;
  }
  
  // Legacy vision-first path
  console.log('[DETECT] Using legacy vision-first pipeline');
  
  const visionResult = await detectFoodVisionV1(base64);
  let gptResult: GptVisionResult = { names: [] };
  let ensembleUsed = false;
  let costIncurred = false;
  
  // Ensemble rules:
  // - If useEnsemble is false -> just Vision
  // - If Vision foods < 2 or total score < 0.6 -> run GPT fallback; otherwise skip
  if (useEnsemble) {
    const shouldRunGpt = visionResult.foods.length < 2 || 
      visionResult.foods.every(f => (f.score ?? 0) < 0.6);
    
    if (shouldRunGpt) {
      gptResult = await detectFoodGptV(base64);
      ensembleUsed = true;
      costIncurred = gptResult.names.length > 0;
      
      // Budget guard - log cost incurrence once per session
      if (costIncurred && import.meta.env.DEV) {
        console.info('[ENSEMBLE][COST]', {
          session: 'current',
          reason: visionResult.foods.length < 2 ? 'low_vision_recall' : 'low_vision_confidence'
        });
      }
    }
  }
  
  // Fuse detections - apply additional filtering to ensure quality
  const filteredGptNames = gptResult.names.filter(name => looksFoodish(name));
  const fused = fuseDetections(visionResult.foods, filteredGptNames);
  
  // Estimate portions
  const portions = estimatePortions(fused, visionResult.plateBBox, visionResult.imageWH);
  
  const result: DetectionAndFusionResult = {
    fused,
    portions,
    visionRaw: visionResult,
    gptRaw: gptResult,
    ensembleUsed,
    detectionPath: useEnsemble ? 'vision-first' : 'vision-only',
    _debug: {
      visionFoodCount: visionResult.foods.length,
      gptFoodCount: gptResult.names.length,
      fusedCount: fused.length,
      costIncurred,
      gptFirstUsed: false,
      fallbackUsed: ensembleUsed
    }
  };
  
  // DEV summary logging
  if (import.meta.env.DEV) {
    console.info('[DETECT_AND_FUSE]', {
      vision: visionResult.foods.length,
      gpt: gptResult.names.length,
      fused: fused.length,
      ensemble_used: ensembleUsed,
      portions: portions.map(p => `${p.name}:${p.grams_est}g`).slice(0, 3)
    });
  }
  
  return result;
}
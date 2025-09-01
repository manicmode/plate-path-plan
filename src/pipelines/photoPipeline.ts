// eslint-disable-next-line: no-cross-pipeline-imports
/**
 * Photo Pipeline - Meal-Only Detection (OCR OFF)
 * Enhanced with force option for sandbox testing
 */

import { isFeatureEnabled } from '@/lib/featureFlags';
import { supabase } from '@/integrations/supabase/client';

export type PipelineResult = { ok: true, report: any } | { ok: false, reason: string };

export type PipelineOptions = { force?: boolean, offline?: boolean };

export type PhotoPipelineCallbacks = {
  onTimeout?: () => void;
  onFail?: (result: any) => void;
  onSuccess?: (result: any) => void;
};

export async function analyzePhoto(
  input: { blob: Blob }, 
  options: PipelineOptions = {}
): Promise<PipelineResult> {
  // Input validation
  if (!input?.blob || !(input.blob instanceof Blob)) {
    return { ok: false, reason: 'invalid_input' };
  }

  const { force = false, offline = false } = options;
  const useV2 = isFeatureEnabled('photo_flow_v2');
  const MEAL_ONLY = true; // Force meal-only mode (OCR OFF)

  // Early return for disabled state (unless forced)
  if (!force && !useV2) {
    console.log('[PHOTO][STUB]', { blobSize: input.blob.size, blobType: input.blob.type });
    return { ok: false, reason: 'disabled' };
  }

  // V2 Meal-Only mode
  console.log('[PHOTO][PIPELINE]', { 
    v2: useV2, 
    force, 
    mealOnly: MEAL_ONLY,
    blobSize: input.blob.size, 
    blobType: input.blob.type 
  });

  if (offline) {
    // Simulate offline failure
    console.log('[PHOTO][OFFLINE] simulating failure');
    await new Promise(resolve => setTimeout(resolve, 2000)); // simulate network delay
    return { ok: false, reason: 'network_timeout' };
  }

  try {
    console.log('[PHOTO][MEAL_ONLY_PIPELINE_START]', { useV2, offline });

    // Convert blob to base64 for meal detector with high quality
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const img = new Image();
    
    // Load image from blob
    const imgUrl = URL.createObjectURL(input.blob);
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = imgUrl;
    });
    
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(imgUrl);
    
    const base64 = canvas.toDataURL('image/jpeg', 0.95);

    // ✅ LYF V1: Call meal-detector-v1 for Log Your Food
    console.log('[LYF] endpoint: meal-detector-v1');
    const { data: meal, error } = await supabase.functions.invoke('meal-detector-v1', {
      body: { image_base64: base64 }
    });

    if (error) {
      console.log('[PHOTO][MEAL_ERROR]', error);
      return { ok: false, reason: 'meal_detection_error' };
    }

    const items = meal?.items ?? [];
    console.log('[LYF] items detected:', items.map(i => i.name));
    console.log('[PHOTO][MEAL] items_detected=', items.length, meal?._debug || null);

    return { 
      ok: true, 
      report: {
        ...meal,
        items,
        source: 'meal-detector'
      }
    };

  } catch (error) {
    console.log('[PHOTO][ERROR]', String(error));
    return { ok: false, reason: 'fetch_error' };
  }
}

// Legacy wrapper for backward compatibility
export async function runPhotoPipeline(
  blob: Blob,
  callbacks: PhotoPipelineCallbacks = {},
  options: PipelineOptions = {}
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await analyzePhoto({ blob }, options);
    
    if (result.ok) {
      callbacks.onSuccess?.(result.report);
      return { success: true };
    } else {
      // Type guard ensures result has reason property
      const failureResult = result as { ok: false; reason: string };
      callbacks.onFail?.(failureResult);
      if (failureResult.reason === 'network_timeout') {
        callbacks.onTimeout?.();
      }
      return { success: false, error: failureResult.reason };
    }
  } catch (error) {
    callbacks.onFail?.({ error: String(error) });
    return { success: false, error: String(error) };
  }
}

export async function __smokeTest(): Promise<'ok' | 'fail'> {
  try {
    // Test with a dummy blob
    const blob = new Blob(['test'], { type: 'image/jpeg' });
    const result = await analyzePhoto({ blob });
    // Should return { ok: false, reason: 'disabled' } since it's a stub (without force)
    return result.ok === false && (result as { ok: false; reason: string }).reason === 'disabled' ? 'ok' : 'fail';
  } catch {
    return 'fail';
  }
}
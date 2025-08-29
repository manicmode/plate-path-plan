// eslint-disable-next-line: no-cross-pipeline-imports
/**
 * Isolated Photo Pipeline
 * Enhanced with force option for sandbox testing
 */

import { resolveFunctionsBase } from '@/lib/net/functionsBase';

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

  // Early return for disabled state (unless forced)
  if (!force) {
    console.log('[PHOTO][STUB]', { blobSize: input.blob.size, blobType: input.blob.type });
    return { ok: false, reason: 'disabled' };
  }

  // Force mode - simulate real pipeline behavior
  console.log('[PHOTO][FORCE_MODE]', { blobSize: input.blob.size, blobType: input.blob.type });

  if (offline) {
    // Simulate offline failure
    console.log('[PHOTO][OFFLINE] simulating failure');
    await new Promise(resolve => setTimeout(resolve, 2000)); // simulate network delay
    return { ok: false, reason: 'network_timeout' };
  }

  try {
    const base = resolveFunctionsBase();
    const url = `${base}/vision-ocr`;
    
    console.log('[PHOTO][FETCH_START]', { url });

    const formData = new FormData();
    formData.append('image', input.blob, 'photo.jpg');

    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json'
      }
    });

    console.log('[PHOTO][FETCH_DONE]', { status: response.status });

    if (!response.ok) {
      return { ok: false, reason: `http_${response.status}` };
    }

    const result = await response.json();
    console.log('[PHOTO][OCR][RESP]', result);

    return { ok: true, report: result };
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
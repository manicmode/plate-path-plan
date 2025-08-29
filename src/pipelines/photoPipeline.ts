// eslint-disable-next-line: no-cross-pipeline-imports
/**
 * Isolated Photo Pipeline
 * Stub only - photo implementation not yet extracted
 */

export type PipelineResult = { ok: true, report: any } | { ok: false, reason: string };

export async function analyzePhoto(input: { blob: Blob }): Promise<PipelineResult> {
  // Input validation
  if (!input?.blob || !(input.blob instanceof Blob)) {
    return { ok: false, reason: 'invalid_input' };
  }

  // Stub only - photo code not extracted yet per requirements
  console.log('[PHOTO][STUB]', { blobSize: input.blob.size, blobType: input.blob.type });
  return { ok: false, reason: 'disabled' };
}

export async function __smokeTest(): Promise<'ok' | 'fail'> {
  try {
    // Test with a dummy blob
    const blob = new Blob(['test'], { type: 'image/jpeg' });
    const result = await analyzePhoto({ blob });
    // Should return { ok: false, reason: 'disabled' } since it's a stub
    return result.ok === false && result.reason === 'disabled' ? 'ok' : 'fail';
  } catch {
    return 'fail';
  }
}
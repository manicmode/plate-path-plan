// eslint-disable-next-line: no-cross-pipeline-imports
/**
 * Isolated Photo Pipeline
 * Dark-shipped: Returns placeholder until flags enabled
 */

export type PipelineResult = { ok: true, report: any } | { ok: false, reason: string };

export async function analyzePhoto(input: { blob: Blob }): Promise<PipelineResult> {
  // Input validation
  if (!input?.blob || !(input.blob instanceof Blob)) {
    return { ok: false, reason: 'invalid_input' };
  }

  // Dark-ship placeholder - will contain current photo OCR implementation later
  // For now, this ensures the contract is established but not called
  return { ok: false, reason: 'dark' };
}
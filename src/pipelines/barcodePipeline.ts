// eslint-disable-next-line: no-cross-pipeline-imports
/**
 * Isolated Barcode Pipeline
 * Dark-shipped: Returns placeholder until flags enabled
 */

export type PipelineResult = { ok: true, report: any } | { ok: false, reason: string };

export async function analyzeBarcode(input: { code: string }): Promise<PipelineResult> {
  // Input validation
  if (!input?.code || typeof input.code !== 'string') {
    return { ok: false, reason: 'invalid_input' };
  }

  // Dark-ship placeholder - will contain current barcode implementation later
  // For now, this ensures the contract is established but not called
  return { ok: false, reason: 'dark' };
}
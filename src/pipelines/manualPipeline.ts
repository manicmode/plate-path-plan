// eslint-disable-next-line: no-cross-pipeline-imports
/**
 * Isolated Manual Pipeline
 * Dark-shipped: Returns placeholder until flags enabled
 */

export type PipelineResult = { ok: true, report: any } | { ok: false, reason: string };

export async function analyzeManual(input: { query: string }): Promise<PipelineResult> {
  // Input validation
  if (!input?.query || typeof input.query !== 'string') {
    return { ok: false, reason: 'invalid_input' };
  }

  // Dark-ship placeholder - will contain current manual search implementation later
  // For now, this ensures the contract is established but not called
  return { ok: false, reason: 'dark' };
}
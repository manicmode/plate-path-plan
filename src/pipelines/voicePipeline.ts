// eslint-disable-next-line: no-cross-pipeline-imports
/**
 * Isolated Voice Pipeline
 * Dark-shipped: Returns placeholder until flags enabled
 */

export type PipelineResult = { ok: true, report: any } | { ok: false, reason: string };

export async function analyzeVoice(input: { transcript: string }): Promise<PipelineResult> {
  // Input validation
  if (!input?.transcript || typeof input.transcript !== 'string') {
    return { ok: false, reason: 'invalid_input' };
  }

  // Dark-ship placeholder - will contain current voice analysis implementation later
  // For now, this ensures the contract is established but not called
  return { ok: false, reason: 'dark' };
}
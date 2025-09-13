export type ManualAction =
  | 'START' | 'DONE' | 'ABORT'
  | 'CACHE_HIT' | 'KEEP_LAST' | 'HOLE_PUNCH'
  | 'search_start' | 'search_abort' | 'search_skip' | 'search_request'
  | 'keep_last_used' | 'search_error' | 'hole_punch_start';

export function logManualAction(type: ManualAction, payload: Record<string, any> = {}) {
  // Safe, no external deps. Helpful in dev, silent in prod build.
  if (import.meta.env.DEV) console.log(`[MANUAL][${type.toUpperCase()}]`, payload);
}
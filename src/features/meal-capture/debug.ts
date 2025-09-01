/**
 * Meal Capture Debug Logging
 * Revision tag: 2025-08-31T21:45Z-r1
 */

const REVISION_TAG = '2025-08-31T21:45Z-r1';

/**
 * Debug logger for meal capture feature
 * Only logs when VITE_DEBUG_MEAL=1
 */
export function debugLog(message: string, ...args: any[]) {
  if (import.meta.env.VITE_DEBUG_MEAL === '1') {
    console.log(`[MEAL][${REVISION_TAG}] ${message}`, ...args);
  }
}

/**
 * Log feature initialization
 */
export function logFeatureInit() {
  debugLog('Feature initialized');
}

/**
 * Log step transitions in the wizard
 */
export function logStepTransition(from: string, to: string) {
  debugLog(`Step transition: ${from} → ${to}`);
}

/**
 * Log capture events
 */
export function logCapture(type: 'photo' | 'retry', data?: any) {
  debugLog(`Capture event: ${type}`, data);
}

/**
 * Log analysis events
 */
export function logAnalysis(stage: string, result?: any) {
  debugLog(`Analysis: ${stage}`, result);
}
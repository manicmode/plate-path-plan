/**
 * Meal Capture Mode Detection
 * MEAL_REV=2025-08-31T20:55Z-r3
 */

export function isMealCaptureMode(search: string): boolean {
  const params = new URLSearchParams(search);
  return params.get('mode') === 'meal-capture';
}

// Debug logging helper
export function debugLog(event: string, data?: any) {
  if (import.meta.env.VITE_DEBUG_MEAL === '1') {
    const MEAL_REV = '2025-08-31T20:55Z-r3';
    console.log(`[MEAL][${event}]`, { ...data, MEAL_REV });
  }
}
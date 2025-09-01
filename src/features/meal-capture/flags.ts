/**
 * Meal Capture Feature Flags
 * Revision tag: 2025-08-31T21:45Z-r1
 */

/**
 * Check if meal capture feature is enabled
 * Recognizes ?meal=1|true|on and mode=meal-capture, or VITE_MEAL_CAPTURE=1
 */
export function mealCaptureEnabled(search: string, env: ImportMetaEnv): boolean {
  // Check URL parameters
  const params = new URLSearchParams(search);
  const mealParam = params.get('meal');
  const modeParam = params.get('mode');
  
  // Check for meal parameter
  if (mealParam && ['1', 'true', 'on'].includes(mealParam.toLowerCase())) {
    return true;
  }
  
  // Check for mode parameter
  if (modeParam === 'meal-capture') {
    return true;
  }
  
  // Check environment variable
  if (env.VITE_MEAL_CAPTURE === '1') {
    return true;
  }
  
  return false;
}

/**
 * Check if meal capture is enabled from search params string
 * Used by PhotoCaptureModal for gateway logic
 */
export function mealCaptureEnabledFromSearch(search: string): boolean {
  return mealCaptureEnabled(search, import.meta.env);
}
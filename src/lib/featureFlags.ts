/**
 * Feature flags for controlling experimental features
 */

export const FEATURE_FLAGS = {
  photo_meal_ui_v1: true, // Enable branded candidates list in health check modal
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return FEATURE_FLAGS[flag] === true;
}

// Legacy exports for compatibility
export const ARENA_DEBUG_CONTROLS = true;
export const BARCODE_V2 = true;
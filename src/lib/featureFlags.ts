export const ARENA_ENABLED = true;
export const ARENA_SAFE_FALLBACK = true; // DEV-ONLY. Set false or remove later.
export const ARENA_DEBUG_CONTROLS = false; // Show debug buttons when true

// Barcode V2 feature flag - rock-solid recognition
export const BARCODE_V2 = true;

// Nutrition logging feature flags
export const NUTRITION_LOG_V2_ENABLED = true; // Enable new nutrition logging
export const PHOTO_ANALYSIS_ENABLED = true; // Enable photo analysis
export const VOICE_LOGGING_ENABLED = true; // Enable voice logging
export const MANUAL_ENTRY_ENABLED = true; // Enable manual entry

// Legacy fallback flag - should remain false in production
export const ARENA_LEGACY_FALLBACK = false; // Warns if enabled

// Mobile debugging and safety flags
export const DISABLE_SERVICE_WORKERS_MOBILE = false;
export const DISABLE_FIREBASE_MOBILE = false;
export const ENABLE_SW_CLEANUP_MOBILE = true;
export const MOBILE_DEBUG_MODE = true;
export const ENABLE_MOBILE_PERFORMANCE_MONITORING = true;
export const ENABLE_MOBILE_ERROR_RECOVERY = true;

// Log warning if legacy fallback is enabled
if (ARENA_LEGACY_FALLBACK && typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  console.warn('⚠️ ARENA_LEGACY_FALLBACK is enabled. This should remain false in production.');
}
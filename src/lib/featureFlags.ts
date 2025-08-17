export const ARENA_ENABLED = true;
export const ARENA_SAFE_FALLBACK = true; // DEV-ONLY. Set false or remove later.
export const ARENA_DEBUG_CONTROLS = false; // Show debug buttons when true

// Legacy fallback flag - should remain false in production
export const ARENA_LEGACY_FALLBACK = false; // Warns if enabled

// Log warning if legacy fallback is enabled
if (ARENA_LEGACY_FALLBACK && typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  console.warn('⚠️ ARENA_LEGACY_FALLBACK is enabled. This should remain false in production.');
}
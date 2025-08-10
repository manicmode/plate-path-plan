/**
 * Single source of truth for app feature flags.
 * Update here, then import FLAGS where needed.
 */
export const FLAGS = {
  /**
   * Future rollout: Global barcode search across public DBs.
   * NOTE: Intentionally NOT used at runtime yet.
   * Camera flow is hardcoded OFF for now.
   */
  BARCODE_GLOBAL_ROLLOUT: false,

  /**
   * XP demo flag (dev-friendly). Reads from Vite or Next-style envs.
   * Usage: import { FLAGS } and check FLAGS.ENABLE_XP.
   */
  ENABLE_XP:
    (typeof import.meta !== 'undefined' &&
      // Vite-style
      (import.meta as any)?.env?.VITE_ENABLE_XP === 'true') ||
    (typeof process !== 'undefined' &&
      // Next-style
      process.env?.NEXT_PUBLIC_ENABLE_XP === 'true') ||
    false,
} as const;

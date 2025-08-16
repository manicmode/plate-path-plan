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
   * Enable header section tabs for Awards and Hall of Fame views.
   * When true, shows Combined/Nutrition/Exercise/Recovery tabs at header level
   * for winners and hall-of-fame sections only (Arena keeps inner tabs).
   */
  ARENA_HEADER_SECTION_TABS_FOR_AWARDS: true,

  /**
   * Enable header section tabs for Challenge browse and management views.
   * When true, shows Combined/Nutrition/Exercise/Recovery tabs at header level
   * for challenges and my-challenges sections (Arena keeps inner tabs).
   */
  ARENA_HEADER_SECTION_TABS_FOR_CHALLENGES: true,

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

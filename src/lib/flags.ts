/**
 * Feature flags for food search and text analysis
 */

export const ENABLE_FOOD_TEXT_V3 = 
  import.meta.env.VITE_FOOD_TEXT_V3 !== '0'; // default on unless explicitly 0

export const ENABLE_AI_RERANK = 
  import.meta.env.VITE_AI_RERANK === '1'; // default off

export const FOOD_TEXT_DEBUG = 
  import.meta.env.VITE_FOOD_TEXT_DEBUG === '1'; // debug logging

export const SFX_DEBUG = 
  import.meta.env.VITE_SFX_DEBUG === '1'; // sound effects debug

// Legacy flags for backward compatibility
export const NUDGE_SCHEDULER_ENABLED = false;
export const isUserInRollout = (userId?: string) => false;
export const USE_SERVER_STT = false;
export const SHOW_SUPP_EDU = false;
export const PARTNER_ACME = false;
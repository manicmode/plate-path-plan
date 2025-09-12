/**
 * Feature flags for food search and text analysis
 */

export const ENABLE_FOOD_TEXT_V3 = 
  import.meta.env.VITE_FOOD_TEXT_V3 !== '0'; // default on unless explicitly 0

export const ENABLE_AI_RERANK = 
  import.meta.env.VITE_AI_RERANK === '1'; // default off

export const FOOD_TEXT_DEBUG = 
  import.meta.env.VITE_FOOD_TEXT_DEBUG === '1'; // debug logging

export const ENABLE_FOOD_TEXT_V3_NUTR = 
  import.meta.env.VITE_FOOD_TEXT_V3_NUTR !== '0'; // default on unless explicitly 0

export const SFX_DEBUG = 
  import.meta.env.VITE_SFX_DEBUG === '1'; // sound effects debug

export const ENABLE_SPEAK_UI_V2 = 
  import.meta.env.VITE_SPEAK_UI_V2 !== '0'; // default on unless explicitly 0

export const ENABLE_SPEAK_CONFETTI = 
  import.meta.env.VITE_SPEAK_CONFETTI === '1'; // default off

// Legacy flags for backward compatibility
export const NUDGE_SCHEDULER_ENABLED = false;
export const isUserInRollout = (userId?: string) => false;
export const USE_SERVER_STT = false;
export const SHOW_SUPP_EDU = false;
export const PARTNER_ACME = false;

export const MAX_PER_FAMILY_MANUAL =
  Number(import.meta.env.VITE_MAX_PER_FAMILY_MANUAL ?? '6');

// New flags for manual entry improvements
export const REQUIRE_CORE_TOKEN_MANUAL =
  import.meta.env.VITE_REQUIRE_CORE_TOKEN_MANUAL !== '1' ? false : true; // default false

export const MIN_PREFIX_LEN =
  Number(import.meta.env.VITE_MIN_PREFIX_LEN ?? '3'); // default 3

export const MANUAL_GENERIC_FALLBACK =
  import.meta.env.VITE_MANUAL_GENERIC_FALLBACK !== '0'; // default true

export const BRAND_VARIETY_BIAS =
  Number(import.meta.env.VITE_BRAND_VARIETY_BIAS ?? '0.3'); // 0..1 variety weight

// Nutrition Vault flags
export const NV_READ_THEN_CHEAP = 
  (import.meta.env.VITE_NV_READ_THEN_CHEAP ?? '1') === '1'; // default ON

export const NV_WRITE_THROUGH = 
  (import.meta.env.VITE_NV_WRITE_THROUGH ?? '1') === '1';   // default ON

export const NV_MAX_RESULTS = 
  Number(import.meta.env.VITE_NV_MAX_RESULTS ?? '8');

export const NV_MIN_PREFIX = 
  Number(import.meta.env.VITE_NV_MIN_PREFIX ?? '3');

export const NV_MIN_HITS = 
  Number(import.meta.env.VITE_NV_MIN_HITS ?? '1');

// Manual entry performance flags (for rollback)
export const ENABLE_DEBOUNCED_SEARCH = 
  (import.meta.env.VITE_ENABLE_DEBOUNCED_SEARCH ?? '1') === '1'; // default ON

export const EDGE_MULTI_QUERY = 
  (import.meta.env.VITE_EDGE_MULTI_QUERY ?? '0') === '1'; // default OFF

export const IMAGE_PROXY_OFF = 
  (import.meta.env.VITE_IMAGE_PROXY_OFF ?? '1') === '1'; // default ON

export const MANUAL_SEARCH_EDGE_GATE = 
  (import.meta.env.VITE_MANUAL_SEARCH_EDGE_GATE ?? '1') === '1'; // default ON
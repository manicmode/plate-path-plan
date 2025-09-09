/**
 * Feature flags for food search and text analysis
 */

// New flag helper system (default ON if undefined, except DIAG)
export const flag = (name: string, onByDefault = true) => {
  const v = (import.meta as any).env?.[name];
  if (v === undefined || v === null) return onByDefault;
  if (typeof v === 'string') return v === '1' || v.toLowerCase() === 'true';
  return !!v;
};

export const intFlag = (name: string, def = 3) => {
  const v = (import.meta as any).env?.[name];
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
};

// Defaults ON unless explicitly set off
export const F = {
  MANUAL_ENTRY_LABEL_TIGHT: flag('VITE_MANUAL_ENTRY_LABEL_TIGHT', true),
  MANUAL_INJECT_GENERIC:    flag('VITE_MANUAL_INJECT_GENERIC', true),
  CANDIDATE_CLASSIFIER_SAFE:flag('VITE_CANDIDATE_CLASSIFIER_SAFE', true),
  V3_ALT_BRAND_FIELDS:      flag('VITE_V3_ALT_BRAND_FIELDS', true),
  CORE_NOUN_STRICT:         flag('VITE_CORE_NOUN_STRICT', true),
  MANUAL_ENTRY_DIAG:        flag('VITE_MANUAL_ENTRY_DIAG', false),
  MIN_MANUAL_CHOICES:       intFlag('VITE_MIN_MANUAL_CHOICES', 3),
  
  // Health Scan Enrichment flags
  FEATURE_ENRICH_HEALTHSCAN: flag('VITE_FEATURE_ENRICH_HEALTHSCAN', false),
  ENRICH_TIMEOUT_MS: Number((import.meta as any).env?.VITE_ENRICH_TIMEOUT_MS || 1200),
  HEALTHSCAN_SAMPLING_PCT: Number((import.meta as any).env?.VITE_HEALTHSCAN_SAMPLING_PCT || 0),
};

// Helper for sampling (dev-only randomness)
export const sampledOn = (pct: number) =>
  pct >= 100 ? true : pct <= 0 ? false : (Math.random() * 100) < pct;

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
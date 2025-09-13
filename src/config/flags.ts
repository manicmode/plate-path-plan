export const BILLBOARD_ENABLED = true; // flip to false to fall back temporarily

// --- Manual Search Performance Flags (P0: Latency Hardening) ---

// Get runtime flag overrides
function getFlagOverrides(): Record<string, boolean> {
  if (typeof window === 'undefined') return {};
  
  try {
    // Query param override: ?flags=FEAT_MANUAL_CHEAP_ONLY:true,FEAT_MANUAL_LRU_CACHE:false
    const params = new URLSearchParams(window.location.search);
    const flagsParam = params.get('flags');
    if (flagsParam) {
      const overrides: Record<string, boolean> = {};
      flagsParam.split(',').forEach(pair => {
        const [key, value] = pair.split(':');
        if (key && value) {
          overrides[key.trim()] = value.trim() === 'true';
        }
      });
      return overrides;
    }

    // localStorage override: localStorage.__flags = JSON.stringify({...})
    const stored = localStorage.getItem('__flags');
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

const flagOverrides = getFlagOverrides();

// Helper to get flag value with overrides
function getFlag(key: string, defaultValue: boolean): boolean {
  return flagOverrides[key] ?? defaultValue;
}

// Check if we're in dev mode
const isDev = typeof window !== 'undefined' && window.location.hostname === 'localhost';

// P0 flags with smart defaults (ON in dev, OFF in prod unless overridden)
export const FEAT_MANUAL_CHEAP_ONLY = getFlag('FEAT_MANUAL_CHEAP_ONLY', isDev);

export const FEAT_MANUAL_HOLE_PUNCH = getFlag('FEAT_MANUAL_HOLE_PUNCH', false);

export const FEAT_MANUAL_LRU_CACHE = getFlag('FEAT_MANUAL_LRU_CACHE', true);

export const FEAT_MANUAL_KEEP_LAST = getFlag('FEAT_MANUAL_KEEP_LAST', true);

// P1 placeholders (keep OFF)
export const FEAT_MANUAL_ALIAS_LIMIT = getFlag('FEAT_MANUAL_ALIAS_LIMIT', false);

export const FEAT_MANUAL_LOOSE_AND = getFlag('FEAT_MANUAL_LOOSE_AND', false);

// UX enhancement flags
export const MANUAL_PORTION_STEP = getFlag('MANUAL_PORTION_STEP', true);
export const MANUAL_FX = getFlag('MANUAL_FX', true);

// Debug logging
if (typeof window !== 'undefined') {
  console.log('[FLAGS] Manual search optimization flags:', {
    FEAT_MANUAL_CHEAP_ONLY,
    FEAT_MANUAL_HOLE_PUNCH,
    FEAT_MANUAL_LRU_CACHE,
    FEAT_MANUAL_KEEP_LAST,
    FEAT_MANUAL_ALIAS_LIMIT,
    FEAT_MANUAL_LOOSE_AND,
    MANUAL_PORTION_STEP,
    MANUAL_FX,
    isDev,
    overrides: Object.keys(flagOverrides)
  });
}

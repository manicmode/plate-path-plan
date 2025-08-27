// Safe environment getter for browser/Vite; never touches `process`
const getEnv = (key: string): string | undefined => {
  // Vite / import.meta.env
  try {
    const ime = (import.meta as any)?.env ?? {};
    if (key in ime) return String(ime[key]);
  } catch {}
  // Optional window-injected env (if your host provides it)
  try {
    const wenv = (window as any)?.__ENV__;
    if (wenv && key in wenv) return String(wenv[key]);
  } catch {}
  return undefined;
};

// Dev detection without `process`
export const IS_DEV: boolean = !!((import.meta as any)?.env?.DEV);

export const flag = (k: string, def = false): boolean => {
  if (typeof window !== 'undefined') {
    const localFlag = localStorage.getItem(`flag:${k}`);
    if (localFlag !== null) {
      return localFlag === '1';
    }
  }
  
  const envVar = getEnv(`NEXT_PUBLIC_${k}`) ?? getEnv(`VITE_${k}`);
  if (envVar !== undefined) {
    return envVar === '1';
  }
  
  return def;
};

// Feature flags (default ON unless explicitly "0")
export const SHOW_SUPP_EDU: boolean =
  (getEnv('NEXT_PUBLIC_SHOW_SUPP_EDU') ?? getEnv('VITE_SHOW_SUPP_EDU') ?? '1') !== '0';

// Example partner flag (kept if you use it)
export const PARTNER_ACME: boolean =
  (getEnv('NEXT_PUBLIC_PARTNER_ACME') ?? getEnv('VITE_PARTNER_ACME') ?? '0') === '1';

// Nudge scheduler flags
export const NUDGE_SCHEDULER_ENABLED: boolean = 
  (getEnv('NUDGE_SCHEDULER_ENABLED') ?? '0') === '1';

export const NUDGE_QA_MODE: boolean =
  (getEnv('NUDGE_QA_MODE') ?? '0') === '1';

export const NUDGE_MAX_PER_DAY: number = 
  parseInt(getEnv('NUDGE_MAX_PER_DAY') ?? '2', 10);

// Rollout percentage (0-100)
export const NUDGE_ROLLOUT_PERCENT: number = 
  parseInt(getEnv('NUDGE_ROLLOUT_PERCENT') ?? '10', 10);

// Simple hash function for user rollout determination
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

// Check if user is in rollout percentage
export function isUserInRollout(userId: string): boolean {
  if (!NUDGE_SCHEDULER_ENABLED) return false;
  const userHash = simpleHash(userId);
  return (userHash % 100) < NUDGE_ROLLOUT_PERCENT;
}

// Hero subtext content engine flag
export const HERO_SUBTEXT_DYNAMIC: boolean = flag('hero_subtext_dynamic');

// Hero subtext rollout percentage (0-100)
export const HERO_SUBTEXT_ROLLOUT_PCT: number = 
  parseInt(getEnv('HERO_SUBTEXT_ROLLOUT_PCT') ?? '100', 10);

// Check if user is in hero subtext rollout
export function isUserInHeroSubtextRollout(userId: string): boolean {
  const userHash = simpleHash(userId);
  return (userHash % 100) < HERO_SUBTEXT_ROLLOUT_PCT;
}
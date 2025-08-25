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
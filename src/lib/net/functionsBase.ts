/**
 * Functions Base URL Resolver
 * Handles Preview vs Production URL differences
 */

export function resolveFunctionsBase() {
  const explicit = import.meta.env.VITE_FUNCTIONS_BASE;
  if (explicit) return explicit; // if you ever set it

  // Try to derive from Supabase URL
  const supa = import.meta.env.VITE_SUPABASE_URL; // e.g. https://uzoiiijqtahohfafqirm.supabase.co
  try {
    if (supa) {
      const host = new URL(supa).hostname; // uzoiiijqtahohfafqirm.supabase.co
      const ref = host.split('.')[0];
      if (ref) return `https://${ref}.functions.supabase.co`;
    }
  } catch {}
  
  // Fallback (works in prod deployments with proxy)
  return '/functions/v1';
}
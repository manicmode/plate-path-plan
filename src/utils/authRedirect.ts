// Hardened redirect guard for Supabase signUp
export function getSignUpRedirect(): string | undefined {
  if (typeof window === 'undefined') return undefined;

  const origin = window.location.origin;
  let host = '';
  try {
    host = new URL(origin).hostname;
  } catch {
    // noop
  }

  // Treat these as preview/dev where we must NOT send emailRedirectTo
  const PREVIEW_SUFFIXES = [
    'lovable.dev',
    'lovableproject.com',
    'localhost',
    '127.0.0.1',
  ];
  const isPreview = PREVIEW_SUFFIXES.some(
    (s) => host === s || host.endsWith(`.${s}`)
  );

  // Use explicit public site URL for prod; fallback to origin
  const siteUrl = (import.meta as any)?.env?.VITE_PUBLIC_SITE_URL || origin;
  const callback = `${String(siteUrl).replace(/\/$/, '')}/auth/callback`;

  return isPreview ? undefined : callback;
}

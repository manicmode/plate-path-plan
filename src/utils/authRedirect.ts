export function getSignUpRedirect(): string | undefined {
  try {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const isLovablePreview = origin.includes('lovable.dev');

    // In Lovable preview, omit redirect to avoid Supabase 4xx for non-whitelisted origins
    if (isLovablePreview) return undefined;

    // In production or local dev, send users back to a dedicated callback route
    if (origin) return `${origin}/auth/callback`;

    return undefined;
  } catch {
    return undefined;
  }
}

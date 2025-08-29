export const baseCors = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
} as const;

export function getCorsHeaders(origin?: string | null): HeadersInit {
  const allow = (() => {
    if (!origin) return 'https://plate-path-plan.lovable.app';
    try {
      const u = new URL(origin);
      const host = u.hostname;
      if (host.endsWith('.lovable.dev') || host.endsWith('.lovable.app')) return origin; // echo exact sandbox/app origin
      if (origin === 'http://localhost:5173' || origin === 'http://localhost:5174') return origin;
    } catch {}
    return 'https://plate-path-plan.lovable.app';
  })();

  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}
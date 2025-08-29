export const baseCors = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
} as const;

export function getCorsHeaders(origin?: string | null): HeadersInit {
  const allowed = [
    'https://plate-path-plan.lovable.app',
    'http://localhost:5173',
    'http://localhost:5174',
  ];
  const allow = origin && allowed.includes(origin) ? origin : allowed[0];
  return { ...baseCors, 'Access-Control-Allow-Origin': allow };
}
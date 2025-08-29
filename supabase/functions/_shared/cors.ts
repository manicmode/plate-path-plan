// Allow-list is configurable via env; fallback to common dev/prod origins
const DEFAULT_ALLOW = [
  'http://localhost:5173',
  'https://localhost:5173',  
  'https://plate-path-plan.lovable.app',
];

export const ALLOWLIST = (Deno.env.get('CORS_ALLOWLIST') ?? DEFAULT_ALLOW.join(','))
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

export function buildCors(origin: string | null) {
  const allowed = origin && ALLOWLIST.includes(origin);
  const allowOrigin = allowed ? origin! : ALLOWLIST[0]; // echo exact origin when allowed
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  } as Record<string, string>;
}

export function handleOptions(req: Request) {
  return new Response('ok', { headers: buildCors(req.headers.get('origin')) });
}
export const baseCors = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
} as const;

export function getCorsHeaders(origin?: string | null): HeadersInit {
  // Use '*' for Access-Control-Allow-Origin to handle Safari opaque origins and preview domains
  // We don't send credentials, so this is safe and avoids CORS blocking
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}
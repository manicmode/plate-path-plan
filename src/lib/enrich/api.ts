/**
 * Enrichment API endpoint builder and caller
 */

export const ENRICH_API_VERSION = 'v2_2';

export function buildEnrichUrl(fnName: string, params: Record<string, string>) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error('VITE_SUPABASE_URL not configured');
  }
  
  const url = new URL(`${supabaseUrl}/functions/v1/${fnName}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  url.searchParams.set('v', ENRICH_API_VERSION);
  return url.toString();
}

export async function callEnrichEdge(fnName: string, params: Record<string, string>) {
  const url = buildEnrichUrl(fnName, params);
  const res = await fetch(url, { 
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params)
  });
  
  if (!res.ok) {
    throw new Error(`edge_${res.status}`);
  }
  
  return res.json();
}
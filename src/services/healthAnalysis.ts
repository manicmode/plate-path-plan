import { supabase } from '@/integrations/supabase/client';
import type { ScanSource, NormalizedProduct, HealthAnalysis } from '@/types/health';

// Only send what the Edge function actually needs
function stripForAnalyze(p: NormalizedProduct) {
  return {
    id: p.id ?? null,
    barcode: p.barcode ?? null,
    name: p.name,
    brand: p.brand ?? null,
    imageUrl: p.imageUrl ?? null,
    nutriments: p.nutriments ?? null,
    ingredients: p.ingredients ?? null,
    novaGroup: p.novaGroup ?? null,
    serving: p.serving ?? null,
  };
}

export async function analyzeFromProduct(
  product: NormalizedProduct,
  opts?: { source?: ScanSource }
): Promise<HealthAnalysis> {
  // 1) Guarantee Authorization header (401s often happen only on one path)
  const { data: sessionData } = await supabase.auth.getSession();
  const access_token = sessionData?.session?.access_token ?? null;

  // 2) Trim payload (avoid 400/413 from huge objects)
  const body = {
    mode: 'product',
    product: stripForAnalyze(product),
    source: opts?.source ?? 'manual'
  };

  if (import.meta.env.DEV) {
    console.log('[ANALYZE] calling gpt-smart-food-analyzer with:', body);
  }

  // 3) Invoke with strong error surface + one 401 refresh retry
  const invoke = async (token?: string | null) => {
    return supabase.functions.invoke('gpt-smart-food-analyzer', {
      body,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
  };

  let { data, error } = await invoke(access_token);

  if (error?.context?.status === 401) {
    // refresh once and retry
    console.log('[ANALYZE] 401 detected, refreshing session and retrying...');
    await supabase.auth.refreshSession();
    const { data: s2 } = await supabase.auth.getSession();
    ({ data, error } = await invoke(s2?.session?.access_token ?? null));
  }

  if (error) {
    // Make the toast useful and dev logs detailed
    const status = error.context?.status ?? 'unknown';
    const msg = error.message ?? 'Edge Function returned a non-2xx status code';
    if (import.meta.env.DEV) {
      console.error('[ANALYZE] invoke error', { status, msg, body, error });
    }
    // surface readable error to UI
    throw new Error(`Analyze failed (${status}): ${msg}`);
  }

  if (import.meta.env.DEV) {
    console.log('[ANALYZE] success:', data);
  }

  // Expect the function to return a HealthAnalysis shape
  return data as HealthAnalysis;
}
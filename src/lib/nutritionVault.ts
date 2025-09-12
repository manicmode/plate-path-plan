/**
 * Nutrition Vault client helpers
 */

import { supabase } from '@/integrations/supabase/client';
import { NV_MAX_RESULTS } from './flags';

export interface NvWritePayload {
  provider: 'edamam' | 'nutritionix';
  provider_ref: string;
  name: string;
  brand?: string;
  class_id?: string;
  region?: string;
  per100g: {
    kcal: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g?: number;
    sugar_g?: number;
    sodium_mg?: number;
    [key: string]: number | undefined;
  };
  portion_defs?: any;
  upc_gtin?: string;
  attribution: string;
  ttl_days?: number;
  aliases?: string[];
}

export interface NvSearchResult {
  id: string;
  name: string;
  brand?: string;
  classId?: string;
  source: 'vault';
  per100g: any;
  portion_defs?: any;
  confidence: number;
  provider: string;
  provider_ref: string;
  isGeneric: boolean;
}

/**
 * Search nutrition vault for fast suggestions
 */
export async function nvSearch(q: string, maxResults = NV_MAX_RESULTS): Promise<NvSearchResult[]> {
  try {
    const { data, error } = await supabase.functions.invoke('nv-search', {
      body: { q, maxResults }
    });

    if (error) {
      console.error('[NV][SEARCH][CLIENT] Error:', error);
      
      // Handle 500 errors gracefully - don't freeze UI
      if (error.message && error.message.includes('500')) {
        console.warn('[NV-SEARCH][500] fallback to empty results');
        return [];
      }
      
      return [];
    }

    return data?.data || [];
  } catch (error) {
    console.error('[NV][SEARCH][CLIENT] Exception:', error);
    return [];
  }
}

/**
 * Write successful enrichment to vault
 */
export async function nvWrite(payload: NvWritePayload): Promise<{ ok: boolean; id?: string }> {
  try {
    const response = await supabase.functions.invoke('nv-write', {
      body: payload
    });

    // Check for non-2xx status codes and log failure details
    if (response.error) {
      console.error('[NV][WRITE][FAIL]', 'error', response.error.message || 'Unknown error', {
        provider: payload.provider,
        providerRef: payload.provider_ref,
        name: payload.name
      });
      // Log response text for debugging
      if (response.error.message) {
        console.error('[NV][WRITE][BODY]', response.error.message);
      }
      return { ok: false };
    }

    const { data } = response;
    
    if (data?.ok) {
      console.info('[NV][WRITE] ok', {
        provider: payload.provider,
        providerRef: payload.provider_ref,
        name: payload.name,
        id: data.id
      });
      return { ok: true, id: data.id };
    } else {
      console.error('[NV][WRITE][FAIL]', 'no-ok', data?.error || 'Unknown failure', {
        provider: payload.provider,
        providerRef: payload.provider_ref,
        name: payload.name
      });
      return { ok: false };
    }

  } catch (error) {
    console.error('[NV][WRITE][FAIL]', 'Exception', {
      provider: payload.provider,
      providerRef: payload.provider_ref,
      name: payload.name,
      error: error.message
    });
    return { ok: false };
  }
}
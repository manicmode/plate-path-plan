// SINGLE SOURCE OF TRUTH for Manual Entry & Speak-to-Log free-text parsing.
// Do not create new text-lookup functions; extend resolvers here.

import { supabase } from '@/integrations/supabase/client';

// Feature flag for rollback capability
export const FEATURE_TEXT_LOOKUP_V2 = true;

export type TextLookupSource = 'manual' | 'speech';

export interface TextLookupOptions {
  source: TextLookupSource;
  bypassCache?: boolean;
}

// Telemetry counters
const telemetry = {
  inc: (key: string) => {
    if (typeof window !== 'undefined') {
      console.log(`[TELEMETRY] ${key}`);
    }
  }
};

/**
 * Shared submit utility for both Manual and Speech text lookup
 * Both components MUST call this to maintain consistency
 */
export async function submitTextLookup(
  query: string, 
  options: TextLookupOptions
): Promise<any> {
  // Runtime guards
  if (!query || !query.trim()) {
    console.warn('[TEXT_LOOKUP][EMPTY]');
    telemetry.inc('text_lookup.v2.empty_query');
    throw new Error('Query cannot be empty');
  }

  const trimmed = query.trim();
  const safeQuery = trimmed.slice(0, 80); // Log first 80 chars, masked if contains sensitive data
  const maskedQuery = maskSensitiveData(safeQuery);
  
  console.log(`[TEXT_LOOKUP][${options.source.toUpperCase()}] Processing:`, maskedQuery);
  telemetry.inc(`text_lookup.v2.invoke.${options.source}`);

  try {
    // Use legacy path if feature flag disabled (rollback mechanism)
    if (!FEATURE_TEXT_LOOKUP_V2) {
      console.warn('[TEXT_LOOKUP][LEGACY_FALLBACK] Using legacy path');
      return await legacyTextLookup(trimmed, options);
    }

    // Get auth headers
    const { data: { session } } = await supabase.auth.getSession();
    const headers = session?.access_token 
      ? { Authorization: `Bearer ${session.access_token}` } 
      : {};

    // Call unified food-text-lookup function
    const { data, error } = await supabase.functions.invoke('food-text-lookup', {
      body: { 
        q: trimmed, 
        source: options.source,
        bypassCache: options.bypassCache 
      },
      headers
    });

    if (error) {
      console.error('[TEXT_LOOKUP][ERROR]', error);
      telemetry.inc('text_lookup.v2.error');
      throw new Error(`Text lookup failed: ${error.message}`);
    }

    if (!data?.ok) {
      console.warn('[TEXT_LOOKUP][NO_RESULTS]', data);
      telemetry.inc('text_lookup.v2.no_results');
      return { items: [], cached: false };
    }

    telemetry.inc('text_lookup.v2.success');
    if (data.cached) {
      telemetry.inc('text_lookup.v2.cache_hit');
    }

    console.log(`[TEXT_LOOKUP][SUCCESS] Found ${data.items?.length || 0} items`, {
      cached: data.cached,
      providers: data.items?.map((item: any) => item.provider) || []
    });

    return {
      items: data.items || [],
      cached: data.cached || false
    };

  } catch (error) {
    console.error('[TEXT_LOOKUP][SUBMIT_ERROR]', error);
    telemetry.inc('text_lookup.v2.submit_error');
    throw error;
  }
}

/**
 * Legacy fallback for rollback capability
 */
async function legacyTextLookup(query: string, options: TextLookupOptions): Promise<any> {
  console.log('[TEXT_LOOKUP][LEGACY] Using legacy path for:', options.source);
  telemetry.inc('text_lookup.legacy.fallback');
  
  if (options.source === 'manual') {
    // Use existing GPT nutrition estimator as fallback
    const { data, error } = await supabase.functions.invoke('gpt-nutrition-estimator', {
      body: {
        foodName: query,
        amountPercentage: 100
      }
    });

    if (error || !data?.nutrition) {
      throw new Error('Legacy manual lookup failed');
    }

    // Map to RecognizedFood format
    const { nutrition } = data;
    return {
      items: [{
        id: `legacy-manual-${Date.now()}`,
        source: 'manual',
        provider: 'gpt',
        name: query,
        servingGrams: 100,
        calories: Math.round(nutrition.calories),
        protein_g: Math.round(nutrition.protein * 10) / 10,
        carbs_g: Math.round(nutrition.carbs * 10) / 10,
        fat_g: Math.round(nutrition.fat * 10) / 10,
        fiber_g: Math.round(nutrition.fiber * 10) / 10,
        sugar_g: Math.round(nutrition.sugar * 10) / 10,
        __hydrated: true,
        confidence: nutrition.confidence || 0.6
      }],
      cached: false
    };
  }

  // For speech, return placeholder
  throw new Error('Speech-to-log not implemented in legacy mode');
}

/**
 * Mask potentially sensitive data in logs
 */
function maskSensitiveData(text: string): string {
  // Basic email/phone masking
  return text
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]')
    .replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[PHONE]');
}
// SINGLE SOURCE OF TRUTH for Manual Entry & Speak-to-Log free-text parsing.
// Do not create new text-lookup functions; extend resolvers here.

import { supabase } from '@/integrations/supabase/client';
import { ENABLE_FOOD_TEXT_V3, FOOD_TEXT_DEBUG } from '@/lib/flags';
import { parseQuery } from '@/lib/food/text/parse';
import { getFoodCandidates } from '@/lib/food/search/getFoodCandidates';
import { inferPortion } from '@/lib/food/portion/inferPortion';
import { canonicalFor } from '@/lib/food/text/canonicalMap';

// Feature flag for rollback capability
export const FEATURE_TEXT_LOOKUP_V2 = true;

export type TextLookupSource = 'manual' | 'speech';

export interface TextLookupOptions {
  source: TextLookupSource;
  bypassCache?: boolean;
  portionOverrideGrams?: number;
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
 * Main text lookup function with v3 support for manual/voice
 */
export async function submitTextLookup(query: string, options: TextLookupOptions): Promise<any> {
  const { source, bypassCache = false, portionOverrideGrams } = options;

  if (!query?.trim()) {
    throw new Error('Query cannot be empty');
  }

  const maskedQuery = maskSensitiveData(query);
  
  console.log(`[TEXT_LOOKUP] Processing query: "${maskedQuery}" from ${source}`);

  // Use v3 pipeline for manual/voice when enabled
  if (ENABLE_FOOD_TEXT_V3 && (source === 'manual' || source === 'speech')) {
    return await submitTextLookupV3(query, options);
  }

  // Fallback to legacy for all other cases or when v3 disabled
  return await submitTextLookupLegacy(query, options);
}

/**
 * New v3 text lookup with generic-first results and realistic portions
 */
async function submitTextLookupV3(query: string, options: TextLookupOptions): Promise<any> {
  const { source } = options;
  
  try {
    if (FOOD_TEXT_DEBUG) {
      console.log('[TEXT][V3] Starting v3 lookup for:', query);
    }

    // Parse query into facets
    const facets = parseQuery(query);
    
    if (FOOD_TEXT_DEBUG) {
      console.log('[TEXT][PARSE]', facets);
    }

    // Get ranked candidates
    const candidates = await getFoodCandidates(query, facets, {
      preferGeneric: true,
      requireCoreToken: true,
      maxPerFamily: 1
    }, source);

    if (FOOD_TEXT_DEBUG) {
      console.log('[TEXT][CANDIDATES] top6=', candidates.slice(0, 6).map(c => ({
        name: c.name,
        score: Math.round(c.score),
        kind: c.kind,
        servingG: c.servingGrams || 100
      })));
    }

    // Soften V3 gate: return low-confidence instead of throwing
    if (candidates.length === 0) {
      console.log('[TEXT][V3] low-confidence return count=0');
      return {
        success: true,
        items: [],
        cached: false,
        version: 'v3',
        reason: 'low-confidence'
      };
    }

    // Log candidate pipeline telemetry
    console.log(`[CANDIDATES][PIPE] incoming=${candidates.length}, after_alias=${candidates.length}, deduped=${candidates.length}, capped=${Math.min(candidates.length, 8)}`);
    
    // Return low-confidence for very few candidates but don't throw
    if (candidates.length === 1) {
      console.log('[TEXT][V3] low-confidence return count=1');
    }

    // Get the primary (best) candidate
    const primary = candidates[0];

    // Create food item with v3 structure and realistic portions
    const portionEstimate = inferPortion(primary.name, query, facets, primary.classId);
    
    // Attach canonical nutrition key for generics
    const canonicalKey = canonicalFor(facets.core[0] || 'food', facets);
    
    const foodItem = {
      id: primary.id || `v3-${Date.now()}`,
      name: primary.name,
      // Scale nutrition to realistic portion immediately  
      calories: Math.round((primary.calories || 0) * portionEstimate.grams / 100),
      protein: Math.round((primary.protein || 0) * portionEstimate.grams / 100 * 10) / 10,
      carbs: Math.round((primary.carbs || 0) * portionEstimate.grams / 100 * 10) / 10,
      fat: Math.round((primary.fat || 0) * portionEstimate.grams / 100 * 10) / 10,  
      fiber: Math.round((primary.fiber || 0) * portionEstimate.grams / 100 * 10) / 10,
      sugar: Math.round((primary.sugar || 0) * portionEstimate.grams / 100 * 10) / 10,
      sodium: Math.round((primary.sodium || 0) * portionEstimate.grams / 100),
      imageUrl: primary.imageUrl,
      servingGrams: portionEstimate.grams,
      servingText: portionEstimate.displayText,
      portionGrams: portionEstimate.grams,
      source: source === 'speech' ? 'voice' : 'manual',
      confidence: primary.confidence,
      // Attach nutrition key and generic marker
      nutritionKey: canonicalKey,
      isGeneric: !!canonicalKey,
      // v3 specific fields for better hydration hints
      canonicalKey: canonicalKey,
      classId: primary.classId,
      facets: facets,
      preferGeneric: true,
      // v3 specific fields
      __altCandidates: candidates.slice(1, 6).map(c => {
        const altPortion = inferPortion(c.name, query, facets, c.classId);
        
        // Flag: VITE_V3_ALT_BRAND_FIELDS (default ON) - Include brand fields for UI badge logic
        const includeBrandFields = (import.meta.env.VITE_V3_ALT_BRAND_FIELDS ?? '1') === '1';
        
        const baseAlt = {
          id: c.id || `alt-${Date.now()}-${Math.random()}`,
          name: c.name,
          servingG: altPortion.grams, // Pre-calculated portion
          calories: Math.round((c.calories || 0) * altPortion.grams / 100),
          protein: Math.round((c.protein || 0) * altPortion.grams / 100 * 10) / 10,
          carbs: Math.round((c.carbs || 0) * altPortion.grams / 100 * 10) / 10,
          fat: Math.round((c.fat || 0) * altPortion.grams / 100 * 10) / 10,
          fiber: Math.round((c.fiber || 0) * altPortion.grams / 100 * 10) / 10,
          sugar: Math.round((c.sugar || 0) * altPortion.grams / 100 * 10) / 10,
          sodium: Math.round((c.sodium || 0) * altPortion.grams / 100),
          imageUrl: c.imageUrl,
          kind: c.kind,
          classId: c.classId
        };
        
        // Include brand fields when flag is ON for proper UI badge logic
        if (includeBrandFields) {
          return {
            ...baseAlt,
            brand: (c as any).brand,
            brands: (c as any).brands,
            code: (c as any).code,
            canonicalKey: (c as any).canonicalKey,
            provider: (c as any).provider,
            isGeneric: (c as any).isGeneric
          };
        }
        
        return baseAlt;
      }),
      __source: source === 'speech' ? 'voice' : 'manual',
      __originalText: query
    };

    return {
      success: true,
      items: [foodItem],
      cached: false,
      version: 'v3'
    };

  } catch (error) {
    console.error('[TEXT][V3] Error:', error);
    
    // Fallback to legacy on error
    if (FOOD_TEXT_DEBUG) {
      console.log('[TEXT][V3] Falling back to legacy due to error');
    }
    
    return await submitTextLookupLegacy(query, options);
  }
}

/**
 * Legacy text lookup function (existing implementation)
 */
async function submitTextLookupLegacy(query: string, options: TextLookupOptions): Promise<any> {
  const { source, bypassCache = false } = options;
  const maskedQuery = maskSensitiveData(query);
  
  console.log(`[TEXT_LOOKUP][LEGACY] Processing query: "${maskedQuery}" from ${source}`);

  // Log telemetry for text input analysis
  const telemetryData = {
    source,
    masked_query: maskedQuery,
    timestamp: new Date().toISOString(),
  };

  console.log('[TEXT_LOOKUP_TELEMETRY]', telemetryData);

  // Check if using new text lookup (FEATURE_TEXT_LOOKUP_V2 is the existing flag)
  const useNewTextLookup = import.meta.env.VITE_FEATURE_TEXT_LOOKUP_V2 !== 'false';

  if (!useNewTextLookup) {
    // Use legacy text lookup if flag is false
    console.warn('[TEXT_LOOKUP][LEGACY_FALLBACK] Using legacy path');
    return await legacyTextLookup(query, options);
  }

  try {
    // Get auth headers
    const { data: { session } } = await supabase.auth.getSession();
    const headers = session?.access_token 
      ? { Authorization: `Bearer ${session.access_token}` } 
      : {};

    // Call unified food-text-lookup function
    const { data, error } = await supabase.functions.invoke('food-text-lookup', {
      body: { 
        q: query, 
        source: source,
        bypassCache: bypassCache,
        portionOverrideGrams: options.portionOverrideGrams
      },
      headers
    });

    if (error) {
      console.error('[TEXT_LOOKUP][ERROR]', error);
      throw new Error(`Text lookup failed: ${error.message}`);
    }

    if (!data?.ok) {
      console.warn('[TEXT_LOOKUP][NO_RESULTS]', data);
      return { items: [], cached: false };
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
    throw error;
  }
}

/**
 * Legacy fallback for rollback capability
 */
async function legacyTextLookup(query: string, options: TextLookupOptions): Promise<any> {
  console.log('[TEXT_LOOKUP][LEGACY] Using legacy path for:', options.source);
  
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
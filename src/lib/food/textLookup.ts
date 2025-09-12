// SINGLE SOURCE OF TRUTH for Manual Entry & Speak-to-Log free-text parsing.
// Do not create new text-lookup functions; extend resolvers here.

import { supabase } from '@/integrations/supabase/client';
import { 
  ENABLE_FOOD_TEXT_V3, 
  FOOD_TEXT_DEBUG, 
  MAX_PER_FAMILY_MANUAL,
  REQUIRE_CORE_TOKEN_MANUAL,
  MIN_PREFIX_LEN 
} from '@/lib/flags';
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

    // Use relaxed diversity cap for manual typing
    const maxPerFamily = options.source === 'manual' ? MAX_PER_FAMILY_MANUAL : 1;
    const isManual = options.source === 'manual';
    
    // instrumentation
    console.log('[CANDIDATES][DIVERSITY]', {
      source: options.source,
      maxPerFamily,
      requireCoreToken: isManual ? REQUIRE_CORE_TOKEN_MANUAL : true,
      allowPrefix: isManual,
      minPrefixLen: MIN_PREFIX_LEN
    });
    
    // Get ranked candidates
    const candidates = await getFoodCandidates(query, facets, {
      preferGeneric: true,
      requireCoreToken: isManual ? REQUIRE_CORE_TOKEN_MANUAL : true,
      maxPerFamily,
      disableBrandInterleave: isManual, // keep all brands for manual typing
      allowMoreBrands: isManual,
      allowPrefix: isManual,
      minPrefixLen: MIN_PREFIX_LEN
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

    // Log candidate pipeline telemetry (v3 specific)
    // Note: Final consolidated log moved to getFoodCandidates.ts
    console.log(`[CANDIDATES][PIPE] incoming=${candidates.length}, after_alias=${candidates.length}, deduped=${candidates.length}, capped=${Math.min(candidates.length, 8)}`);
    
    // Return low-confidence for very few candidates but don't throw
    if (candidates.length === 1) {
      console.log('[TEXT][V3] low-confidence return count=1');
    }

    // Helper function to map candidate to food item
    const mapCandidateToFoodItem = (candidate: any, portion: any, index: number) => {
      // C. Serving defaults: generic/classId candidates get 100g, others keep existing behavior
      const defaultServingGrams = (candidate.provider === 'generic' || candidate.classId) ? 100 : (portion?.grams || inferPortion(candidate.name, candidate.name)?.grams || 100);
      const servingGrams = portion?.grams || defaultServingGrams;
      
      const isGeneric = !!candidate.canonicalKey?.startsWith('generic_') || candidate.kind === 'generic';
      // Brand detection: items from OpenFoodFacts with actual ingredients are branded  
      const provider = candidate.provider || candidate.kind || (!isGeneric ? 'brand' : 'generic');
      const providerRef = candidate.providerRef || candidate.brand || candidate.upc || null;
      
      const mapped = {
        id: candidate.id || `v3-${Date.now()}-${index}`,
        name: candidate.name,
        // Scale nutrition to portion grams (use existing rounding utilities if present)
        calories: Math.round((candidate.calories || 0) * servingGrams / 100),
        protein: Math.round(((candidate.protein || 0) * servingGrams / 100) * 10) / 10,
        carbs: Math.round(((candidate.carbs || 0) * servingGrams / 100) * 10) / 10,
        fat: Math.round(((candidate.fat || 0) * servingGrams / 100) * 10) / 10,
        fiber: Math.round(((candidate.fiber || 0) * servingGrams / 100) * 10) / 10,
        sugar: Math.round(((candidate.sugar || 0) * servingGrams / 100) * 10) / 10,
        sodium: Math.round((candidate.sodium || 0) * servingGrams / 100),
        imageUrl: candidate.imageUrl,
        servingGrams,
        portionGrams: servingGrams,
        servingText: portion.displayText,
        source: source === 'speech' ? 'voice' : 'manual',
        confidence: candidate.confidence,
        isGeneric,
        provider,
        providerRef,
        // Pass through classification data
        kind: candidate.kind,
        classId: candidate.classId
      };
      
      console.log('[CANDIDATE][MAP]', { 
        name: mapped.name, 
        servingGrams: mapped.servingGrams, 
        isGeneric: mapped.isGeneric, 
        providerRef: mapped.providerRef 
      });
      
      return mapped;
    };

    // Get primary candidate
    const primary = candidates[0];
    const primaryPortion = inferPortion(primary.name, query, facets, primary.classId);
    const canonicalKey = canonicalFor(facets.core[0] || 'food', facets);
    
    // Map all candidates (up to 8) to UI-ready items
    const allItems = candidates.slice(0, 8).map((cand, idx) => {
      const portion = inferPortion(cand.name, query, facets, cand.classId);
      return mapCandidateToFoodItem(cand, portion, idx);
    });

    // LOG candidate telemetry
    console.log('[CANDIDATES][FINAL]', {
      incoming: candidates.length,
      after_alias: candidates.length,
      deduped: candidates.length,
      rankedAll: allItems.length,
    });

    return {
      success: true,
      items: allItems,          // Full set instead of just primary
      rankedAll: allItems,      // Explicit for consumers
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
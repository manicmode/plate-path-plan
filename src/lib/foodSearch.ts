/**
 * Unified food search pipeline for Health Scan fallbacks
 */

import { supabase } from '@/integrations/supabase/client';
import { isFeatureEnabled } from './featureFlags';

export interface CanonicalSearchResult {
  source: 'off' | 'fdc' | 'local';
  id: string;              // provider native id
  name: string;            // product / common name
  brand?: string;
  imageUrl?: string;
  servingHint?: string;    // e.g., "per 55g"
  caloriesPer100g?: number;
  confidence?: number;     // 0-1 ranking score
}

export function normalizeFoodQuery(s: string) {
  return s.toLowerCase().trim().replace(/\s+/g, ' ').replace(/[^\p{L}\p{N}\s]/gu,'');
}

/**
 * Debounced search function with timeout protection
 */
export async function searchFoodByName(
  query: string, 
  options: { timeout?: number; maxResults?: number } = {}
): Promise<CanonicalSearchResult[]> {
  const { timeout = 6000, maxResults = 10 } = options;
  
  console.warn('[FOOD-SEARCH][submit]', { raw: query });
  console.log('🔍 [FoodSearch] Starting search for:', query);
  
  if (!isFeatureEnabled('fallback_text_enabled')) {
    console.log('🚫 [FoodSearch] Text fallback disabled');
    return [];
  }
  
  const trimmedQuery = query.trim();
  const normalized = normalizeFoodQuery(trimmedQuery);
  console.warn('[FOOD-SEARCH][normalize]', { raw: query, normalized });
  
  if (normalized.length < 2) {
    console.log('🚫 [FoodSearch] Query too short');
    return [];
  }
  
  try {
    console.warn('[FOOD-SEARCH][request]', { endpoint: 'supabase:food-search', payload: { query: normalized, maxResults, sources: ['off'] } });
    console.log('📡 [FoodSearch] Calling food-search edge function...');
    const t0 = performance.now();
    
    // Create timeout controller for 10s timeout
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => timeoutController.abort(), 10000);
    
    const { data, error } = await supabase.functions.invoke('food-search', {
      body: { 
        query: normalized,  // Use normalized query instead of trimmedQuery
        maxResults,
        sources: ['off'] // Start with OpenFoodFacts only
      }
    });
    
    const dt = Math.round(performance.now() - t0);
    clearTimeout(timeoutId);
    
    if (error) {
      console.warn('[FOOD-SEARCH][error]', { name: error?.name, code: error?.code, message: error?.message });
      console.error('❌ [FoodSearch] Edge function error:', error);
      
      // Create custom error with HTTP status code for better UX
      const customError = new Error(error.message || 'Search function failed') as Error & { code?: string };
      
      // Map common error patterns to status codes
      if (error.message?.includes('404') || error.message?.includes('not found')) {
        customError.code = '404';
      } else if (error.message?.includes('401') || error.message?.includes('unauthorized')) {
        customError.code = '401';
      } else if (error.message?.includes('500') || error.message?.includes('internal')) {
        customError.code = '500';
      }
      
      throw customError;
    }
    
    if (!data?.results) {
      console.warn('[FOOD-SEARCH][response]', { status: 'no_results', count: 0, ms: dt });
      console.log('⚠️ [FoodSearch] No results returned');
      return [];
    }
    
    const results = data.results as CanonicalSearchResult[];
    console.warn('[FOOD-SEARCH][response]', { status: 200, count: results.length, ms: dt });
    console.log(`✅ [FoodSearch] Found ${results.length} results`);
    
    // Apply client-side ranking boosts
    return results
      .map(result => ({
        ...result,
        confidence: calculateConfidence(result, normalized)  // Use normalized query
      }))
      .sort((a, b) => (b.confidence || 0) - (a.confidence || 0))
      .slice(0, maxResults);
      
  } catch (error) {
    console.warn('[FOOD-SEARCH][error]', { name: error?.name, code: error?.code, message: error?.message });
    if (error instanceof Error && error.name === 'AbortError') {
      console.log('⏰ [FoodSearch] Search timeout');
      throw new Error('Search timed out - please try a shorter query');
    }
    
    console.error('💥 [FoodSearch] Search failed:', error);
    throw error;
  }
}

/**
 * Calculate confidence score for ranking
 */
function calculateConfidence(result: CanonicalSearchResult, query: string): number {
  const queryLower = query.toLowerCase();
  const nameLower = result.name.toLowerCase();
  const brandLower = result.brand?.toLowerCase() || '';
  
  let confidence = result.confidence || 0.5;
  
  // Exact name match boost
  if (nameLower === queryLower) {
    confidence += 0.3;
  } else if (nameLower.includes(queryLower)) {
    confidence += 0.2;
  }
  
  // Brand exact match boost
  if (brandLower && queryLower.includes(brandLower)) {
    confidence += 0.15;
  }
  
  // Shorter names boost (more specific)
  if (result.name.length < 50) {
    confidence += 0.05;
  }
  
  // Has nutrition data boost
  if (result.caloriesPer100g) {
    confidence += 0.05;
  }
  
  return Math.min(1.0, confidence);
}

/**
 * Transform search result to legacy health report format
 */
export function searchResultToLegacyProduct(result: CanonicalSearchResult): any {
  return {
    productName: result.name,
    barcode: result.id.startsWith('barcode:') ? result.id.replace('barcode:', '') : null,
    brand: result.brand || null,
    imageUrl: result.imageUrl || null,
    ingredientsText: null, // Will be fetched separately if needed
    healthScore: null, // Will be calculated separately
    healthFlags: [],
    nutrition: result.caloriesPer100g ? {
      calories: result.caloriesPer100g,
      protein: null,
      carbs: null,
      fat: null,
      fiber: null,
      sugar: null,
      sodium: null
    } : null,
    status: 'ok' as const,
    recommendation: null,
    servingHint: result.servingHint,
    source: result.source
  };
}
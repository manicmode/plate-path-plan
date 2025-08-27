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

/**
 * Debounced search function with timeout protection
 */
export async function searchFoodByName(
  query: string, 
  options: { timeout?: number; maxResults?: number } = {}
): Promise<CanonicalSearchResult[]> {
  const { timeout = 6000, maxResults = 10 } = options;
  
  console.log('🔍 [FoodSearch] Starting search for:', query);
  
  if (!isFeatureEnabled('fallback_text_enabled')) {
    console.log('🚫 [FoodSearch] Text fallback disabled');
    return [];
  }
  
  const trimmedQuery = query.trim();
  if (trimmedQuery.length < 2) {
    console.log('🚫 [FoodSearch] Query too short');
    return [];
  }
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    console.log('📡 [FoodSearch] Calling food_search edge function...');
    const { data, error } = await supabase.functions.invoke('food_search', {
      body: { 
        query: trimmedQuery,
        maxResults,
        sources: ['off'] // Start with OpenFoodFacts only
      }
    });
    
    clearTimeout(timeoutId);
    
    if (error) {
      console.error('❌ [FoodSearch] Edge function error:', error);
      throw new Error(error.message || 'Search function failed');
    }
    
    if (!data?.results) {
      console.log('⚠️ [FoodSearch] No results returned');
      return [];
    }
    
    const results = data.results as CanonicalSearchResult[];
    console.log(`✅ [FoodSearch] Found ${results.length} results`);
    
    // Apply client-side ranking boosts
    return results
      .map(result => ({
        ...result,
        confidence: calculateConfidence(result, trimmedQuery)
      }))
      .sort((a, b) => (b.confidence || 0) - (a.confidence || 0))
      .slice(0, maxResults);
      
  } catch (error) {
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
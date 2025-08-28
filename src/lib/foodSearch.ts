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
  barcode?: string | null; // OFF barcode when available
}

export function normalizeFoodQuery(s: string) {
  return s.toLowerCase().trim().replace(/\s+/g, ' ').replace(/[^\p{L}\p{N}\s]/gu,'');
}

// Enhanced mapper for OFF results - preserves barcode
export function mapOFFItem(item: any): CanonicalSearchResult {
  return {
    source: 'off' as const,
    id: item?.code ?? item?.id ?? null,
    name: item?.product_name ?? item?.generic_name ?? item?.brands ?? item?.code ?? 'Unknown Product',
    brand: item?.brands ?? null,
    imageUrl: item?.image_url ?? item?.image_front_url ?? null,
    servingHint: item?.serving_size ?? '100g',
    caloriesPer100g: item?.nutriments?.['energy-kcal_100g'] ?? null,
    confidence: 0.7, // Base confidence for OFF
    barcode: item?.code ?? item?.barcode ?? null // Preserve barcode!
  };
}

/**
 * Debounced search function with timeout protection
 */
export async function searchFoodByName(
  query: string, 
  options: { timeout?: number; maxResults?: number } = {}
): Promise<CanonicalSearchResult[]> {
  const { timeout = 6000, maxResults = 10 } = options;
  
  if (!isFeatureEnabled('fallback_text_enabled')) {
    console.log('🚫 [FoodSearch] Text fallback disabled');
    return [];
  }
  
  const trimmedQuery = query.trim();
  const normalized = normalizeFoodQuery(trimmedQuery);
  
  if (normalized.length < 2) {
    console.log('🚫 [FoodSearch] Query too short');
    return [];
  }
  
  try {
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
      console.log('⚠️ [FoodSearch] No results returned');
      return [];
    }
    
    const results = data.results as CanonicalSearchResult[];
    console.log(`✅ [FoodSearch] Found ${results.length} results`);
    
    // Apply enhanced ranking with word matching and category boosts
    const ranked = reorderForQuery(results, trimmedQuery);
    
    // Temporary proof logs (remove after verification)
    console.warn('[FOOD-SEARCH][rankedTop3]', ranked.slice(0,3).map(x => ({name:x.name, barcode:x.barcode, cats:x.categories_tags})));
    
    return ranked.slice(0, maxResults);
      
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.log('⏰ [FoodSearch] Search timeout');
      throw new Error('Search timed out - please try a shorter query');
    }
    
    console.error('💥 [FoodSearch] Search failed:', error);
    throw error;
  }
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// lightweight synonym helper (handles plural)
function variants(q: string) {
  const t = q.toLowerCase().trim();
  const set = new Set([t]);
  if (!t.endsWith('s')) set.add(`${t}s`);
  if (t.endsWith('s')) set.add(t.slice(0, -1)); // eggs -> egg
  return Array.from(set);
}

function rankScore(item: any, raw: string) {
  const name = (item?.name ?? item?.product_name ?? '').toLowerCase();
  const cats = JSON.stringify(item?.categories_tags ?? item?.categories ?? '').toLowerCase();
  const q = raw.toLowerCase().trim();
  const qTokens = new Set(q.split(/\s+/));
  const v = variants(raw);

  let s = 0;
  
  // Exact name match (highest priority)
  if (name === q) s += 100;
  
  // Starts with query
  if (name.startsWith(q)) s += 40;
  
  // Category boost for eggs when searching "egg"
  if (cats.includes('egg')) s += 25;
  
  // Penalize noodles when searching for "egg"
  if (name.includes('noodle')) s -= 30;
  
  // Token overlap bonus
  const tokens = new Set(name.split(/\W+/));
  qTokens.forEach(t => { if (tokens.has(t)) s += 5; });
  
  // Legacy exact word match bonus
  const exact = v.some(w => new RegExp(`(?:^|\\b)${escapeRe(w)}(?:\\b|$)`).test(name)) ? 50 : 0;
  const contains = v.some(w => name.includes(w)) ? 10 : 0;

  return s + exact + contains;
}

// Apply after data arrives, before rendering
export function reorderForQuery(items: any[], q: string) {
  if (!Array.isArray(items) || !q) return items;
  return [...items].sort((a, b) => rankScore(b, q) - rankScore(a, q));
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
    barcode: result.barcode ?? result.id, // Use barcode field first, fallback to id
    brand: result.brand,
    imageUrl: result.imageUrl,
    nutrition: {
      calories: result.caloriesPer100g || 0,
      // Add other nutrition fields as needed
    },
    source: result.source,
    confidence: result.confidence
  };
}
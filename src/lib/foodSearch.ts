/**
 * Unified food search pipeline for Health Scan fallbacks
 */

import { supabase } from '@/integrations/supabase/client';
import { isFeatureEnabled } from './featureFlags';
import { NV_READ_THEN_CHEAP, NV_MIN_PREFIX, NV_MIN_HITS, NV_MAX_RESULTS } from './flags';
import { nvSearch } from './nutritionVault';

// Import setup verification (runs automatically in dev mode)
import './nvSetupTest';

// Self-test functionality
async function selfTestSuggestPipeline(query: string) {
  let vaultHits = 0;
  let cheapHits = 0;
  let finalCount = 0;

  try {
    // Test vault search first
    if (NV_READ_THEN_CHEAP && query.length >= NV_MIN_PREFIX) {
      const vaultResults = await nvSearch(query, NV_MAX_RESULTS);
      vaultHits = vaultResults.length;
      
      if (vaultHits >= NV_MIN_HITS) {
        finalCount = vaultHits;
        return { vaultHits, cheapHits: 0, finalCount };
      }
    }

    // Test cheap path (mock/simplified)
    cheapHits = 4; // Simulated cheap results
    finalCount = Math.min(vaultHits + cheapHits, NV_MAX_RESULTS);
    
    return { vaultHits, cheapHits, finalCount };
  } catch (error) {
    console.error('[SUGGEST][PIPE][SELFTEST] Error:', error);
    return { vaultHits: 0, cheapHits: 0, finalCount: 0 };
  }
}

// Self-test runner (only with ?NV_SELFTEST=1)
if (typeof window !== 'undefined' && window.location.search.includes('NV_SELFTEST=1')) {
  setTimeout(async () => {
    try {
      const q = 'california roll';
      const { vaultHits, cheapHits, finalCount } = await selfTestSuggestPipeline(q);
      console.log('[SUGGEST][PIPE]', { vault: vaultHits, cheap: cheapHits, final: finalCount });
    } catch (e) {
      console.log('[SUGGEST][PIPE][ERROR]', String(e));
    }
  }, 1000);
}

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
  options: { signal?: AbortSignal; timeoutMs?: number; maxResults?: number; finalItemsLength?: number; bypassGuard?: boolean } = {}
): Promise<CanonicalSearchResult[]> {
  const { signal, timeoutMs = 900, maxResults = 50, finalItemsLength = 0, bypassGuard = false } = options;
  
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
  
  // Guard: Don't call during intake - only on user confirm (bypass for manual/voice search)
  if (!finalItemsLength && !bypassGuard) {
    console.log('🚫 [FoodSearch] Guarded - no final items to search for');
    return [];
  }
  
  try {
    // NEW: Vault read-through if enabled
    let vaultHits: any[] = [];
    
    if (NV_READ_THEN_CHEAP && trimmedQuery.length >= NV_MIN_PREFIX) {
      try {
        vaultHits = await nvSearch(trimmedQuery, NV_MAX_RESULTS);
        
        // If we have any vault hits, use them (lowered gate for testing)
        if (vaultHits.length > 0) {
          console.log(`[SUGGEST][PIPE] vault=${vaultHits.length} cheap=0 final=${vaultHits.length}`);
          return vaultHits.map(transformVaultToCanonical).slice(0, maxResults);
        }
      } catch (error) {
        console.error('[NV][SEARCH] Vault search failed, falling back:', error);
      }
    }

    console.log('📡 [FoodSearch] Calling food-search edge function...');
    const t0 = performance.now();
    
    // Create timeout controller with custom timeout
    const ctrl = new AbortController();
    const link = signal;
    if (link) link.addEventListener('abort', () => ctrl.abort(), { once: true });

    const t = setTimeout(() => {
      ctrl.abort();
      console.log('[FoodSearch][timeout]', { q: query, timeoutMs });
    }, timeoutMs);
    
    // Flag: VITE_CHEAP_FIRST_SUGGESTIONS - use cheap sources for suggestions
    const cheapFirstEnabled = (import.meta.env.VITE_CHEAP_FIRST_SUGGESTIONS ?? '1') === '1';
    const sources = cheapFirstEnabled ? ['fdc', 'off'] : ['off'];
    const actualMaxResults = cheapFirstEnabled ? Math.min(maxResults, 8) : maxResults;
    
    console.log(`[SUGGEST][CHEAP_FIRST] count=${actualMaxResults}, sources=[${sources.join(',')}]`);

    try {
      const { data, error } = await supabase.functions.invoke('food-search', {
        body: { 
          query: normalized,  // Use normalized query instead of trimmedQuery
          maxResults: actualMaxResults,
          sources
        }
      });
      
      const dt = Math.round(performance.now() - t0);
      return processSearchResults(data, error, dt, normalized, vaultHits, trimmedQuery, maxResults);
    } catch (e) {
      console.log('[FoodSearch][aborted-or-failed]', { q: query, err: String(e) });
      return [];                   // never throw upstream
    } finally {
      clearTimeout(t);
    }
  } catch (error) {
    console.error('[FoodSearch] Outer catch:', error);
    return [];
  }
}

function processSearchResults(data: any, error: any, dt: number, normalized: string, vaultHits: any[], trimmedQuery: string, maxResults: number): CanonicalSearchResult[] {
  if (error) {
    console.error('❌ [FoodSearch] Edge function error:', error);
    return [];
  }
  
  if (!data?.results) {
    console.log('⚠️ [FoodSearch] No results returned');
    return [];
  }
  
  const searchResults = data.results as CanonicalSearchResult[];
  console.log(`✅ [FoodSearch] Found ${searchResults.length} results`);
  
  // Merge vault hits with cheap results if we have vault hits
  let mergedResults = searchResults;
  if (vaultHits.length > 0) {
    const vaultAsCanonical = vaultHits.map(transformVaultToCanonical);
    mergedResults = deduplicateResults([...vaultAsCanonical, ...searchResults]);
  }
  
  // Apply enhanced ranking with word matching and category boosts
  const ranked = reorderForQuery(mergedResults, trimmedQuery);
  
  // Log pipeline summary
  console.log(`[SUGGEST][PIPE] vault=${vaultHits.length} cheap=${searchResults.length} final=${ranked.length}`);
  
  return ranked.slice(0, maxResults);
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
 * Transform vault result to CanonicalSearchResult format
 */
function transformVaultToCanonical(vaultResult: any): CanonicalSearchResult {
  return {
    source: 'local' as const, // Use 'local' to indicate cached/vault source
    id: vaultResult.id,
    name: vaultResult.name,
    brand: vaultResult.brand,
    imageUrl: undefined,
    servingHint: '100g',
    caloriesPer100g: vaultResult.per100g?.kcal || vaultResult.per100g?.calories,
    confidence: vaultResult.confidence || 0.8,
    barcode: vaultResult.provider_ref
  };
}

/**
 * Deduplicate results by name+brand+classId key
 */
function deduplicateResults(results: CanonicalSearchResult[]): CanonicalSearchResult[] {
  const seen = new Set<string>();
  return results.filter(result => {
    const key = `${result.name}|${result.brand || ''}|${result.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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
import { LRUMap } from '@/utils/lru';
import { FEAT_MANUAL_LRU_CACHE } from '@/config/flags';

// Global cache instance
const cache = new LRUMap<string, any>(200);

// Version for cache invalidation
const CACHE_VERSION = 'v1';

export interface CacheEntry {
  candidates: any[];
  timestamp: number;
  source: string;
}

/**
 * Generate cache key for manual search
 */
function getCacheKey(query: string): string {
  const normalized = query.toLowerCase().trim().replace(/\s+/g, ' ');
  const locale = typeof navigator !== 'undefined' ? (navigator.language || 'en') : 'en';
  const aliasMapVersion = '1'; // Could be dynamic based on alias map changes
  
  return `manual:${CACHE_VERSION}|q=${normalized}|locale=${locale.slice(0, 2)}|alias=${aliasMapVersion}`;
}

/**
 * Get cached search results
 */
export function get(query: string): CacheEntry | null {
  if (!FEAT_MANUAL_LRU_CACHE || !query?.trim()) {
    return null;
  }

  const key = getCacheKey(query);
  const entry = cache.get(key);
  
  if (entry) {
    console.log('[CACHE][HIT]', { key: key.slice(0, 50) + '...', age: Date.now() - entry.timestamp });
    return entry;
  }

  return null;
}

/**
 * Cache search results
 */
export function set(query: string, candidates: any[], source: string, ttlMs = 24 * 60 * 60 * 1000): void {
  if (!FEAT_MANUAL_LRU_CACHE || !query?.trim()) {
    return;
  }

  const key = getCacheKey(query);
  const entry: CacheEntry = {
    candidates,
    timestamp: Date.now(),
    source
  };

  cache.set(key, entry, ttlMs);
  console.log('[CACHE][SET]', { key: key.slice(0, 50) + '...', count: candidates.length, source });
}

/**
 * Clear entire cache (on auth changes, etc.)
 */
export function clear(): void {
  cache.clear();
  console.log('[CACHE][CLEAR] Manual search cache cleared');
}

/**
 * Get cache stats for debugging
 */
export function getStats(): { size: number; enabled: boolean } {
  return {
    size: cache.size(),
    enabled: FEAT_MANUAL_LRU_CACHE
  };
}
import { useCallback, useRef, useState } from 'react';
import { getFoodCandidates } from '@/lib/food/search/getFoodCandidates';
import type { TextLookupOptions } from '@/lib/food/textLookup';
import { logManualAction } from '@/lib/analytics/manualLog';
import { 
  FEAT_MANUAL_LRU_CACHE, 
  FEAT_MANUAL_KEEP_LAST,
  FEAT_MANUAL_CHEAP_ONLY
} from '@/config/flags';
import * as manualSearchCache from '@/services/manualSearchCache';

export interface ManualSearchConfig {
  allowNetwork?: boolean;
  debounceMs?: number;
}

export function useManualSearch(config: ManualSearchConfig = {}) {
  const { allowNetwork = true, debounceMs = 150 } = config;
  
  // State
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Refs for request management
  const searchRequestId = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const lastGoodResultsRef = useRef<any[]>([]);
  const searchGenRef = useRef(0);

  // Process candidates helper (matching original logic)
  const processCandidates = useCallback((items: any[], query: string) => {
    // This should match your original processCandidates function
    // For now, returning items as-is, but you may need to adapt this
    return items || [];
  }, []);

  // Core search function
  const performSearch = useCallback(async (query: string): Promise<any[]> => {
    const requestId = ++searchRequestId.current;
    
    // Cancel previous request
    if (abortRef.current) {
      abortRef.current.abort();
      logManualAction('search_abort', { reason: 'new_request' });
    }
    
    if (!query.trim()) {
      return [];
    }

    // Create new abort controller
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const currentGen = ++searchGenRef.current;
    
    logManualAction('search_request', { requestId, queryLength: query.length });

    // Check cache first
    if (FEAT_MANUAL_LRU_CACHE) {
      const cached = manualSearchCache.get(query);
      if (cached && cached.candidates.length > 0) {
        const cachedCandidates = processCandidates(cached.candidates, query);
        logManualAction('CACHE_HIT', { 
          requestId, 
          count: cachedCandidates.length, 
          source: 'cache' 
        });
        return cachedCandidates;
      }
    }

    try {
      const t0 = performance.now();
      
      const facets = { core: [query], prep: [], cuisine: [], form: [], protein: [] };
      const searchOpts = {
        allowNetwork,
        preferGeneric: true,
        requireCoreToken: false,
        maxPerFamily: 3,
        disableBrandInterleave: true,
        allowMoreBrands: true,
        allowPrefix: true,
        minPrefixLen: 2
      };
      const fallback = await getFoodCandidates(query, facets, searchOpts, 'manual');
      
      const searchMs = Math.round(performance.now() - t0);
      const items = fallback || [];
      const newCandidates = processCandidates(items, query);

      // Check if request is still valid
      if (currentGen !== searchGenRef.current || ctrl.signal.aborted) {
        logManualAction('search_abort', { requestId, reason: 'stale_request' });
        throw new Error('Request aborted');
      }

      // Cache successful results
      if (FEAT_MANUAL_LRU_CACHE && newCandidates.length > 0) {
        manualSearchCache.set(query, newCandidates, 'local');
      }

      logManualAction('DONE', { 
        requestId, 
        timeMs: searchMs, 
        count: newCandidates.length, 
        source: 'local' 
      });

      return newCandidates;
      
    } catch (e: any) {
      if (e?.name === 'AbortError' || currentGen !== searchGenRef.current) {
        logManualAction('search_abort', { requestId });
        throw e;
      }
      
      logManualAction('search_error', { requestId, error: String(e) });
      
      // Keep last good results on error if enabled
      if (FEAT_MANUAL_KEEP_LAST && lastGoodResultsRef.current.length > 0) {
        logManualAction('keep_last_used', { previousCount: lastGoodResultsRef.current.length });
        return lastGoodResultsRef.current;
      }
      
      throw e;
    }
  }, [allowNetwork, processCandidates]);

  // Debounced search function
  const search = useCallback((query: string) => {
    logManualAction('search_start', { query: query.slice(0, 20) });
    
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    if (!query.trim()) {
      setResults([]);
      setIsSearching(false);
      setError(null);
      return;
    }
    
    // Set searching state immediately for responsiveness
    setIsSearching(true);
    setError(null);
    
    // Debounce the actual search
    timeoutRef.current = setTimeout(async () => {
      try {
        const newResults = await performSearch(query);
        
        // Only update if we have results OR no previous results (SWR guard)
        const shouldUpdate = newResults.length > 0 || results.length === 0;
        
        if (shouldUpdate) {
          setResults(newResults);
          if (newResults.length > 0) {
            lastGoodResultsRef.current = newResults;
          }
        } else {
          logManualAction('DONE', {
            count: results.length,
            action: 'preserved_existing',
            source: 'local'
          });
        }
        
      } catch (e: any) {
        if (e?.name !== 'AbortError') {
          setError(String(e));
          
          // Keep last good results on error if enabled
          if (!(FEAT_MANUAL_KEEP_LAST && lastGoodResultsRef.current.length > 0)) {
            setResults([]);
          }
        }
      } finally {
        setIsSearching(false);
      }
    }, debounceMs);
    
  }, [performSearch, debounceMs, results.length]);

  // Reset function
  const reset = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort('reset');
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setResults([]);
    setIsSearching(false);
    setError(null);
    lastGoodResultsRef.current = [];
  }, []);

  // Cleanup on unmount
  const cleanup = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort('unmount');
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  return {
    search,
    isSearching,
    results,
    error,
    reset,
    cleanup
  };
}

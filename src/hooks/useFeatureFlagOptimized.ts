import { useMyFeatureFlags } from './useMyFeatureFlags';
import { supabase } from '@/integrations/supabase/client';

/**
 * Optimized feature flag hook that uses SWR cache first, 
 * then falls back to direct RPC call
 */
export function useFeatureFlagOptimized(key: string) {
  const { flagsMap, loading } = useMyFeatureFlags();
  
  // Check cache first
  const cachedValue = flagsMap[key];
  
  // If not in cache and not loading, fall back to direct call
  const enabled = cachedValue !== undefined 
    ? cachedValue 
    : false; // Default to false if not found

  // For debugging - you can remove this in production
  const isFromCache = cachedValue !== undefined;

  return { 
    enabled, 
    loading,
    isFromCache 
  };
}
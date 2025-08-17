import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logEvent } from '@/lib/telemetry';

interface RuntimeFlagResult {
  enabled: boolean | null;
  isLoading: boolean;
  error?: Error;
  refresh: () => Promise<void>;
}

// Simple in-memory cache for 15 seconds
const flagCache = new Map<string, { value: boolean; expiry: number }>();
const CACHE_DURATION = 15000; // 15 seconds
const pendingRequests = new Map<string, Promise<boolean>>();

export function useRuntimeFlag(name: string): RuntimeFlagResult {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>();

  const fetchFlag = useCallback(async (): Promise<boolean> => {
    // Check cache first
    const cached = flagCache.get(name);
    if (cached && Date.now() < cached.expiry) {
      return cached.value;
    }

    // Deduplicate simultaneous requests
    if (pendingRequests.has(name)) {
      return pendingRequests.get(name)!;
    }

    const request = (async (): Promise<boolean> => {
      try {
        // Try RPC first if it exists - use any type since RPC may not exist
        try {
          const { data: rpcResult, error: rpcError } = await supabase
            .rpc('runtime_flag_enabled' as any, { flag_name: name });
          
          if (!rpcError && typeof rpcResult === 'boolean') {
            const result = rpcResult;
            flagCache.set(name, { value: result, expiry: Date.now() + CACHE_DURATION });
            logEvent('arena.flag.resolve', { name, enabled: result, method: 'rpc' });
            return result;
          }
        } catch (rpcError) {
          // RPC doesn't exist or failed, try direct table query
        }

        // Fallback to direct table query - use any type since table may not exist
        const { data, error } = await (supabase as any)
          .from('runtime_flags')
          .select('enabled')
          .eq('name', name)
          .maybeSingle();

        if (error) {
          // Handle table doesn't exist (42P01) or other errors gracefully
          if (error.code === '42P01' || error.code === 'PGRST116') {
            const result = false;
            flagCache.set(name, { value: result, expiry: Date.now() + CACHE_DURATION });
            logEvent('arena.flag.resolve', { name, enabled: result, method: 'fallback', reason: 'table_missing' });
            return result;
          }
          throw error;
        }

        const result = data?.enabled ?? false;
        flagCache.set(name, { value: result, expiry: Date.now() + CACHE_DURATION });
        logEvent('arena.flag.resolve', { name, enabled: result, method: 'table' });
        return result;

      } catch (err) {
        // Default to false on any error
        const result = false;
        flagCache.set(name, { value: result, expiry: Date.now() + CACHE_DURATION });
        logEvent('arena.flag.resolve', { name, enabled: result, method: 'error', error: err });
        throw err;
      }
    })();

    pendingRequests.set(name, request);
    const result = await request;
    pendingRequests.delete(name);
    return result;
  }, [name]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(undefined);
    
    try {
      const result = await fetchFlag();
      setEnabled(result);
      logEvent('arena.flag.hard_disable', { enabled: result });
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch runtime flag');
      setError(error);
      setEnabled(false); // Default to false on error
    } finally {
      setIsLoading(false);
    }
  }, [fetchFlag]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    enabled,
    isLoading,
    error,
    refresh
  };
}
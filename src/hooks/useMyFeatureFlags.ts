import useSWR from 'swr';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type FeatureFlagData = {
  flag_key: string;
  global_enabled: boolean;
  user_enabled: boolean | null;
  resolved_enabled: boolean;
  has_user_override: boolean;
};

export type FeatureFlagsMap = Record<string, boolean>;

const CACHE_KEY = 'my-feature-flags';

const fetcher = async (): Promise<FeatureFlagData[]> => {
  const { data, error } = await supabase.rpc('get_my_feature_flags');
  if (error) throw error;
  return data || [];
};

/**
 * Hook for fetching and caching user's resolved feature flags with real-time updates
 */
export function useMyFeatureFlags() {
  const { data, error, mutate, isLoading } = useSWR<FeatureFlagData[]>(
    CACHE_KEY,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 5000, // 5 second deduping
    }
  );

  // Set up real-time subscriptions
  useEffect(() => {
    const globalChannel = supabase
      .channel('feature-flags-global')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'feature_flags'
        },
        () => {
          mutate(); // Refetch on global flag changes
        }
      )
      .subscribe();

    const userChannel = supabase
      .channel('feature-flags-user')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_feature_flags',
          filter: `user_id=eq.${supabase.auth.getUser().then(u => u.data.user?.id)}`
        },
        () => {
          mutate(); // Refetch on user flag changes
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(globalChannel);
      supabase.removeChannel(userChannel);
    };
  }, [mutate]);

  // Convert to map for easy lookup
  const flagsMap: FeatureFlagsMap = {};
  if (data) {
    data.forEach(flag => {
      flagsMap[flag.flag_key] = flag.resolved_enabled;
    });
  }

  return {
    flags: data || [],
    flagsMap,
    loading: isLoading,
    error,
    refresh: mutate,
  };
}
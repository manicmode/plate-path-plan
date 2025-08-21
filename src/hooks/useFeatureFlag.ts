import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useFeatureFlagActions } from '@/hooks/useFeatureFlagActions';
import { useMyFeatureFlags } from '@/hooks/useMyFeatureFlags';

export function useFeatureFlag(key: string) {
  const [enabled, setEnabled] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const { setUserFlag } = useFeatureFlagActions();
  const { flagsMap, loading: flagsLoading, refresh } = useMyFeatureFlags();

  useEffect(() => {
    // Use SWR cache first
    if (!flagsLoading && flagsMap[key] !== undefined) {
      setEnabled(flagsMap[key]);
      setLoading(false);
      return;
    }

    // Fallback to direct RPC call
    if (!flagsLoading) {
      let active = true;
      (async () => {
        const { data, error } = await supabase.rpc('is_feature_enabled', { feature_key: key });
        if (!active) return;
        if (!error && typeof data === 'boolean') setEnabled(data);
        setLoading(false);
      })();
      return () => { active = false; };
    }
  }, [key, flagsMap, flagsLoading]);

  const toggleUserOverride = async (enabledParam: boolean) => {
    const success = await setUserFlag(key, enabledParam);
    if (success) {
      await refresh();
    }
    return success;
  };

  return { 
    enabled, 
    loading: loading || flagsLoading,
    mutate: refresh,
    toggleUserOverride
  };
}
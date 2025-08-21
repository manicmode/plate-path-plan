import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { notify } from '@/lib/notify';

/**
 * Hook for feature flag management actions
 */
export function useFeatureFlagActions() {
  const [loading, setLoading] = useState(false);

  const setUserFlag = useCallback(async (flagKey: string, enabled: boolean) => {
    setLoading(true);
    try {
      const { error } = await supabase.rpc('set_user_feature_flag', {
        flag_key_param: flagKey,
        enabled_param: enabled
      });

      if (error) throw error;

      notify.success(`Feature flag "${flagKey}" ${enabled ? 'enabled' : 'disabled'} for your account`);

      return true;
    } catch (error) {
      console.error('Error setting user feature flag:', error);
      notify.error(error instanceof Error ? error.message : 'Failed to update feature flag');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleGlobalFlag = useCallback(async (flagKey: string, enabled: boolean) => {
    setLoading(true);
    try {
      const { error } = await supabase.rpc('toggle_feature_flag', {
        key_param: flagKey,
        enabled_param: enabled
      });

      if (error) throw error;

      notify.success(`Global flag "${flagKey}" ${enabled ? 'enabled' : 'disabled'}`);

      return true;
    } catch (error) {
      console.error('Error toggling global feature flag:', error);
      notify.error(error instanceof Error ? error.message : 'Failed to update global flag');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    setUserFlag,
    toggleGlobalFlag,
    loading,
  };
}
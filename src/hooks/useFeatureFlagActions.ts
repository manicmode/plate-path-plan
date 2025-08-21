import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook for feature flag management actions
 */
export function useFeatureFlagActions() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const setUserFlag = useCallback(async (flagKey: string, enabled: boolean) => {
    setLoading(true);
    try {
      const { error } = await supabase.rpc('set_user_feature_flag', {
        flag_key_param: flagKey,
        enabled_param: enabled
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Feature flag "${flagKey}" ${enabled ? 'enabled' : 'disabled'} for your account`,
      });

      return true;
    } catch (error) {
      console.error('Error setting user feature flag:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to update feature flag',
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const toggleGlobalFlag = useCallback(async (flagKey: string, enabled: boolean) => {
    setLoading(true);
    try {
      const { error } = await supabase.rpc('toggle_feature_flag', {
        key_param: flagKey,
        enabled_param: enabled
      });

      if (error) throw error;

      toast({
        title: "Admin Action",
        description: `Global flag "${flagKey}" ${enabled ? 'enabled' : 'disabled'}`,
      });

      return true;
    } catch (error) {
      console.error('Error toggling global feature flag:', error);
      toast({
        title: "Error", 
        description: error instanceof Error ? error.message : 'Failed to update global flag',
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  return {
    setUserFlag,
    toggleGlobalFlag,
    loading,
  };
}
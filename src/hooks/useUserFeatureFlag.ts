import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

/**
 * Hook for managing user-specific feature flag overrides
 */
export function useUserFeatureFlag() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const toggleUserFlag = useCallback(async (flagKey: string, enabled: boolean) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User must be authenticated');
      }

      const { error } = await supabase
        .from('user_feature_flags')
        .upsert({
          user_id: user.id,
          flag_key: flagKey,
          enabled,
        }, {
          onConflict: 'user_id,flag_key'
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Feature flag "${flagKey}" ${enabled ? 'enabled' : 'disabled'} for your account`,
      });

      return true;
    } catch (error) {
      console.error('Error toggling user feature flag:', error);
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

  const getUserFlags = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('user_feature_flags')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching user feature flags:', error);
      return [];
    }
  }, []);

  return {
    toggleUserFlag,
    getUserFlags,
    loading,
  };
}
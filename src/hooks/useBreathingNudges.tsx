import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface BreathingNudgePreferences {
  nudges_enabled: boolean;
  push_notifications_enabled: boolean;
}

export const useBreathingNudges = () => {
  const [nudgePreferences, setNudgePreferences] = useState<BreathingNudgePreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchNudgePreferences = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('breathing_nudge_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setNudgePreferences(data);
      } else {
        // Create default preferences if none exist
        const defaultPreferences = {
          user_id: user.id,
          nudges_enabled: true,
          push_notifications_enabled: true
        };

        const { data: newData, error: createError } = await supabase
          .from('breathing_nudge_preferences')
          .insert(defaultPreferences)
          .select()
          .single();

        if (createError) throw createError;
        setNudgePreferences(newData);
      }
    } catch (error) {
      console.error('Error fetching breathing nudge preferences:', error);
      toast({
        title: "Error",
        description: "Failed to load breathing nudge preferences",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const updateNudgePreferences = useCallback(async (updates: Partial<BreathingNudgePreferences>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('breathing_nudge_preferences')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      setNudgePreferences(data);
      toast({
        title: "Success",
        description: "Breathing nudge preferences updated"
      });
    } catch (error) {
      console.error('Error updating breathing nudge preferences:', error);
      toast({
        title: "Error",
        description: "Failed to update breathing nudge preferences",
        variant: "destructive"
      });
    }
  }, [toast]);

  useEffect(() => {
    fetchNudgePreferences();
  }, [fetchNudgePreferences]);

  return {
    nudgePreferences,
    updateNudgePreferences,
    isLoading,
    refetch: fetchNudgePreferences
  };
};
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';

interface YogaNudgePreferences {
  nudges_enabled: boolean;
  smart_nudges_enabled: boolean;
  push_notifications_enabled: boolean;
}

export const useYogaNudges = () => {
  const { user } = useAuth();
  const [nudgePreferences, setNudgePreferences] = useState<YogaNudgePreferences>({
    nudges_enabled: true,
    smart_nudges_enabled: true,
    push_notifications_enabled: true,
  });

  useEffect(() => {
    if (user?.id) {
      fetchNudgePreferences();
    }
  }, [user?.id]);

  const fetchNudgePreferences = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('yoga_nudge_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setNudgePreferences(data);
      }
    } catch (error) {
      console.error('Error fetching yoga nudge preferences:', error);
    }
  };

  const updateNudgePreferences = async (updates: Partial<YogaNudgePreferences>) => {
    if (!user?.id) return;

    try {
      const updatedPrefs = { ...nudgePreferences, ...updates };
      
      const { error } = await supabase
        .from('yoga_nudge_preferences')
        .upsert({
          user_id: user.id,
          ...updatedPrefs,
        });

      if (error) throw error;

      setNudgePreferences(updatedPrefs);
    } catch (error) {
      console.error('Error updating yoga nudge preferences:', error);
      throw error;
    }
  };

  return {
    nudgePreferences,
    updateNudgePreferences,
  };
};
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ThermotherapyNudgePreferences {
  user_id: string;
  nudges_enabled: boolean;
  smart_nudges_enabled: boolean;
  push_notifications_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export function useThermotherapyNudges() {
  const [nudgePreferences, setNudgePreferences] = useState<ThermotherapyNudgePreferences | null>(null);

  useEffect(() => {
    fetchNudgePreferences();
  }, []);

  const fetchNudgePreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('thermotherapy_nudge_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching thermotherapy nudge preferences:', error);
        return;
      }

      if (data) {
        setNudgePreferences(data);
      } else {
        // Create default preferences
        const defaultPrefs = {
          user_id: user.id,
          nudges_enabled: true,
          smart_nudges_enabled: true,
          push_notifications_enabled: true,
        };

        const { data: newPrefs, error: createError } = await supabase
          .from('thermotherapy_nudge_preferences')
          .insert(defaultPrefs)
          .select()
          .single();

        if (createError) {
          console.error('Error creating thermotherapy nudge preferences:', createError);
          return;
        }

        setNudgePreferences(newPrefs);
      }
    } catch (error) {
      console.error('Error fetching thermotherapy nudge preferences:', error);
    }
  };

  const updateNudgePreferences = async (updates: Partial<ThermotherapyNudgePreferences>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('thermotherapy_nudge_preferences')
        .upsert({
          user_id: user.id,
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('Error updating thermotherapy nudge preferences:', error);
        return;
      }

      setNudgePreferences(data);
    } catch (error) {
      console.error('Error updating thermotherapy nudge preferences:', error);
    }
  };

  return {
    nudgePreferences,
    updateNudgePreferences,
    fetchNudgePreferences,
  };
}
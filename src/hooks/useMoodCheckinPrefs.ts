import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/integrations/supabase/client';

interface MoodCheckinPrefs {
  user_id: string;
  reminder_time_local: string;
  enabled: boolean;
  timezone: string;
  updated_at?: string;
  created_at?: string;
}

export const useMoodCheckinPrefs = () => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<MoodCheckinPrefs | null>(null);
  const [loading, setLoading] = useState(true);

  const loadPreferences = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('mood_checkin_prefs')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading mood checkin preferences:', error);
        return;
      }

      if (data) {
        setPreferences(data);
      } else {
        // Create default preferences
        const defaultPrefs = {
          user_id: user.id,
          reminder_time_local: '20:30',
          enabled: true,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        };

        const { data: newData, error: insertError } = await supabase
          .from('mood_checkin_prefs')
          .insert(defaultPrefs)
          .select()
          .single();

        if (insertError) {
          console.error('Error creating mood checkin preferences:', insertError);
        } else {
          setPreferences(newData);
        }
      }
    } catch (error) {
      console.error('Error with mood checkin preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const updatePreferences = async (updates: Partial<MoodCheckinPrefs>) => {
    if (!user?.id || !preferences) return;

    try {
      const { data, error } = await supabase
        .from('mood_checkin_prefs')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating mood checkin preferences:', error);
        return;
      }

      setPreferences(data);
    } catch (error) {
      console.error('Error updating mood checkin preferences:', error);
    }
  };

  useEffect(() => {
    loadPreferences();
  }, [user?.id]);

  return {
    preferences,
    loading,
    updatePreferences,
    refetch: loadPreferences
  };
};
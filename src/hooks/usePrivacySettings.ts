import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PrivacySettings {
  allow_challenge_friend_requests: boolean;
}

export const usePrivacySettings = () => {
  const [settings, setSettings] = useState<PrivacySettings>({ 
    allow_challenge_friend_requests: true 
  });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const loadSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.rpc('get_privacy_settings_for_users', {
        target_ids: [user.id]
      });

      if (error) {
        console.error('Error loading privacy settings:', error);
        // Keep default settings on error
        setLoading(false);
        return;
      }

      // If no settings found, use default (true)
      if (data && data.length > 0) {
        setSettings({
          allow_challenge_friend_requests: data[0].allow_challenge_friend_requests
        });
      }
    } catch (error) {
      console.error('Error loading privacy settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (allow: boolean) => {
    setUpdating(true);
    
    // Optimistic update
    const previousSettings = { ...settings };
    setSettings({ allow_challenge_friend_requests: allow });

    try {
      const { error } = await supabase.rpc('upsert_privacy_settings', {
        allow
      });

      if (error) {
        // Rollback on error
        setSettings(previousSettings);
        toast.error('Failed to update privacy settings');
        console.error('Error updating privacy settings:', error);
        return false;
      }

      toast.success('Privacy settings updated successfully');
      return true;
    } catch (error) {
      // Rollback on error
      setSettings(previousSettings);
      toast.error('Failed to update privacy settings');
      console.error('Error updating privacy settings:', error);
      return false;
    } finally {
      setUpdating(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  return {
    settings,
    loading,
    updating,
    updateSettings
  };
};
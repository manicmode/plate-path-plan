import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';

export const useUserProfile = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ensureUserProfile = async () => {
      if (!user?.id) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Ensure user profile exists before any operations
        await supabase.rpc('rpc_ensure_user_profile');
      } catch (err) {
        console.error('Failed to ensure user profile:', err);
        setError('Failed to initialize user profile');
      } finally {
        setLoading(false);
      }
    };

    ensureUserProfile();
  }, [user?.id]);

  const upsertUserProfile = async (
    goals: string[],
    constraints: string[],
    preferences: string[]
  ) => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }

    setLoading(true);
    setError(null);

    try {
      await supabase.rpc('rpc_upsert_user_profile', {
        p_goals: goals,
        p_constraints: constraints, 
        p_preferences: preferences
      });
    } catch (err) {
      console.error('Failed to update user profile:', err);
      setError('Failed to update profile preferences');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    upsertUserProfile,
    loading,
    error
  };
};
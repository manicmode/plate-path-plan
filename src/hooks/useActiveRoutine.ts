import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';

interface ActiveRoutine {
  routine_id: string;
  routine_name: string;
  routine_type: string;
  table_source: string;
  is_active: boolean;
  start_date?: string;
  updated_at: string;
}

export function useActiveRoutine() {
  const { user } = useAuth();
  const [activeRoutine, setActiveRoutine] = useState<ActiveRoutine | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchActiveRoutine = async () => {
    if (!user?.id) {
      setActiveRoutine(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      // Call the database function to get active routine
      const { data, error } = await supabase.rpc(
        'get_user_active_routine',
        { target_user_id: user.id }
      );

      if (error) {
        console.error('Error fetching active routine:', error);
        setActiveRoutine(null);
        return;
      }

      // The function returns an array, get the first result
      const routine = data?.[0] || null;
      setActiveRoutine(routine);
    } catch (error) {
      console.error('Error in fetchActiveRoutine:', error);
      setActiveRoutine(null);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshActiveRoutine = () => {
    fetchActiveRoutine();
  };

  const clearActiveRoutine = () => {
    setActiveRoutine(null);
  };

  useEffect(() => {
    fetchActiveRoutine();
  }, [user?.id]);

  return {
    activeRoutine,
    isLoading,
    refreshActiveRoutine,
    clearActiveRoutine,
    hasActiveRoutine: !!activeRoutine
  };
}
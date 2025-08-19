import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Define a simplified UserHabit interface for this hook
export interface SimpleUserHabit {
  id: string;
  slug: string;
  status: 'active' | 'paused' | 'completed';
  schedule: any;
  reminder_at: string | null;
  target: number | null;
  notes: string | null;
  next_due_at: string | null;
  snooze_until: string | null;
  start_date: string;
  created_at: string;
  updated_at: string;
}

export const useUserHabits = () => {
  const [userHabits, setUserHabits] = useState<Map<string, SimpleUserHabit>>(new Map());
  const [loading, setLoading] = useState(false);

  const fetchUserHabits = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_habit')
        .select('*')
        .eq('status', 'active');

      if (error) throw error;

      const habitsMap = new Map<string, SimpleUserHabit>();
      (data || []).forEach(habit => {
        habitsMap.set(habit.slug, habit as SimpleUserHabit);
      });
      
      setUserHabits(habitsMap);
      return habitsMap;
    } catch (error) {
      console.error('Error fetching user habits:', error);
      return new Map();
    } finally {
      setLoading(false);
    }
  }, []);

  const hasHabit = useCallback((slug: string) => {
    return userHabits.has(slug);
  }, [userHabits]);

  const getUserHabit = useCallback((slug: string) => {
    return userHabits.get(slug);
  }, [userHabits]);

  return {
    userHabits,
    loading,
    fetchUserHabits,
    hasHabit,
    getUserHabit,
    setUserHabits
  };
};
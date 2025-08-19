import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { UserHabit } from '@/hooks/useHabitManagement';

export const useUserHabits = () => {
  const [userHabits, setUserHabits] = useState<Map<string, UserHabit>>(new Map());
  const [loading, setLoading] = useState(false);

  const fetchUserHabits = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_habit')
        .select('*')
        .eq('status', 'active');

      if (error) throw error;

      const habitsMap = new Map<string, UserHabit>();
      (data || []).forEach(habit => {
        habitsMap.set(habit.slug, habit as UserHabit);
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
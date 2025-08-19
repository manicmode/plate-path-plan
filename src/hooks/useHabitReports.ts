import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';

export interface HabitReportData {
  user_habit_id: string;
  slug: string;
  name: string;
  domain: string;
  completions: number;
  expected_count: number;
  adherence_pct: number;
  minutes: number;
  current_streak: number;
  last_logged_at: string | null;
}

export interface HabitKPIsData {
  overall_adherence_pct: number;
  active_habits: number;
  total_completions: number;
  total_minutes: number;
  streak_leader_slug: string | null;
  streak_leader_days: number;
}

export const useHabitReport = (period: 'week' | 'month') => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['habit-report', period, user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase.rpc('rpc_habit_report', {
        p_period: period
      });

      if (error) throw error;
      return data as HabitReportData[];
    },
    enabled: !!user
  });
};

export const useHabitKPIs = (period: 'week' | 'month') => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['habit-kpis', period, user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase.rpc('rpc_habit_kpis', {
        p_period: period
      });

      if (error) throw error;
      return data as HabitKPIsData;
    },
    enabled: !!user
  });
};
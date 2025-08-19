import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/auth";

export interface HabitReportData {
  user_habit_id: string;
  slug: string;
  name: string;
  domain: string;
  expected_count: number;
  completions: number;
  minutes: number;
  adherence_pct: number;
  current_streak: number;
  last_logged_at: string | null;
  reminder_at: string | null;
}

export interface HabitKPIs {
  active_habits: number;
  total_expected: number;
  total_completions: number;
  overall_adherence_pct: number;
  total_minutes: number;
  streak_leader_slug: string | null;
  streak_leader_days: number;
}

export const useHabitReport = (period: 'week' | 'month', startDate?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['habit-report', period, startDate, user?.id],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');
      
      const { data, error } = await supabase.rpc('rpc_habit_report', {
        period,
        p_start: startDate || null
      });

      if (error) throw error;
      return data as HabitReportData[];
    },
    enabled: !!user,
  });
};

export const useHabitKPIs = (period: 'week' | 'month', startDate?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['habit-kpis', period, startDate, user?.id],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');
      
      const { data, error } = await supabase.rpc('rpc_habit_kpis', {
        period,
        p_start: startDate || null
      });

      if (error) throw error;
      return data[0] as HabitKPIs;
    },
    enabled: !!user,
  });
};
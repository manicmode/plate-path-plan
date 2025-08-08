import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';

export interface ExerciseEntry {
  date: string;
  steps: number;
  duration_minutes: number;
  calories_burned: number;
  activity_type: string;
  intensity_level: string;
}

export interface ExerciseSummary {
  totalSteps: number;
  totalDuration: number;
  totalCalories: number;
  todaySteps: number;
  todayDuration: number;
  todayCalories: number;
}

export const useRealExerciseData = (timeRange: '7d' | '30d' = '7d') => {
  const { user } = useAuth();
  const [exerciseData, setExerciseData] = useState<ExerciseEntry[]>([]);
  const [summary, setSummary] = useState<ExerciseSummary>({
    totalSteps: 0,
    totalDuration: 0,
    totalCalories: 0,
    todaySteps: 0,
    todayDuration: 0,
    todayCalories: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const daysBack = timeRange === '7d' ? 7 : 30;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysBack);
        const startISO = startDate.toISOString().split('T')[0];

        // Fetch exercise logs (duration/calories)
        const { data: exData, error: exErr } = await supabase
          .from('exercise_logs')
          .select('*')
          .eq('user_id', user.id)
          .gte('created_at', startDate.toISOString())
          .order('created_at', { ascending: true });
        if (exErr) throw exErr;

        // Fetch steps from activity_steps_daily view
        const { data: stepsData, error: stepsErr } = await supabase
          .from('activity_steps_daily')
          .select('date, steps')
          .eq('user_id', user.id)
          .gte('date', startISO)
          .order('date', { ascending: true });
        if (stepsErr) throw stepsErr;

        // Group exercise logs by date
        const grouped: Record<string, ExerciseEntry> = {};
        exData?.forEach((entry) => {
          const date = new Date(entry.created_at).toISOString().split('T')[0];
          if (!grouped[date]) {
            grouped[date] = {
              date,
              steps: 0,
              duration_minutes: 0,
              calories_burned: 0,
              activity_type: entry.activity_type,
              intensity_level: entry.intensity_level || 'moderate',
            };
          }
          grouped[date].duration_minutes += entry.duration_minutes || 0;
          grouped[date].calories_burned += entry.calories_burned || 0;
        });

        // Overlay steps from activity_steps_daily, taking max per date (view already maxes)
        stepsData?.forEach((row: any) => {
          const date = row.date;
          if (!grouped[date]) {
            grouped[date] = {
              date,
              steps: row.steps || 0,
              duration_minutes: 0,
              calories_burned: 0,
              activity_type: 'general',
              intensity_level: 'moderate',
            };
          } else {
            grouped[date].steps = Math.max(grouped[date].steps || 0, row.steps || 0);
          }
        });

        const today = new Date().toISOString().split('T')[0];
        const entries = Object.values(grouped);
        setExerciseData(entries);

        const totalSteps = entries.reduce((s, e) => s + (e.steps || 0), 0);
        const totalDuration = entries.reduce((s, e) => s + (e.duration_minutes || 0), 0);
        const totalCalories = entries.reduce((s, e) => s + (e.calories_burned || 0), 0);

        const todayData = grouped[today];
        const todaySteps = todayData?.steps || 0;
        const todayDuration = todayData?.duration_minutes || 0;
        const todayCalories = todayData?.calories_burned || 0;

        setSummary({
          totalSteps,
          totalDuration,
          totalCalories,
          todaySteps,
          todayDuration,
          todayCalories,
        });
      } catch (err) {
        console.error('Error in useRealExerciseData:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user?.id, timeRange]);

  // Format data for charts using fixed 7 daily buckets ending today
  const getWeeklyChartData = () => {
    const end = new Date();
    const letters = ['S','M','T','W','T','F','S'];
    const start = new Date(end);
    start.setDate(end.getDate() - 6);
    const out: Array<{ label: string; fullLabel: string; steps: number; calories: number; duration: number; date: string }> = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = d.toISOString().slice(0,10);
      const day = exerciseData.find((e) => e.date === key);
      out.push({
        label: letters[d.getDay()],
        fullLabel: d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: '2-digit' }),
        steps: day?.steps || 0,
        calories: day?.calories_burned || 0,
        duration: day?.duration_minutes || 0,
        date: key,
      });
    }
    return out;
  };

  return {
    exerciseData,
    summary,
    weeklyChartData: getWeeklyChartData(),
    isLoading,
    error,
  };
};
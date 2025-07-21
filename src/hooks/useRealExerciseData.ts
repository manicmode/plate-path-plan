
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';

export interface ExerciseData {
  steps: number;
  calories: number;
  duration: number;
}

export const useRealExerciseData = (days: number = 7) => {
  const [data, setData] = useState<ExerciseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [todayTotal, setTodayTotal] = useState<ExerciseData>({
    steps: 0,
    calories: 0,
    duration: 0
  });
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;

    const fetchExerciseData = async () => {
      setLoading(true);
      
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - (days - 1));
      startDate.setHours(0, 0, 0, 0);

      const { data: exerciseLogs, error } = await supabase
        .from('exercise_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching exercise data:', error);
        setLoading(false);
        return;
      }

      // Group by day and calculate totals
      const dailyTotals: { [date: string]: ExerciseData } = {};
      const today = new Date().toISOString().split('T')[0];
      let todaySum: ExerciseData = {
        steps: 0,
        calories: 0,
        duration: 0
      };

      exerciseLogs?.forEach(log => {
        const date = new Date(log.created_at).toISOString().split('T')[0];
        
        if (!dailyTotals[date]) {
          dailyTotals[date] = {
            steps: 0,
            calories: 0,
            duration: 0
          };
        }

        dailyTotals[date].steps += log.steps || 0;
        dailyTotals[date].calories += log.calories_burned || 0;
        dailyTotals[date].duration += log.duration_minutes || 0;

        if (date === today) {
          todaySum.steps += log.steps || 0;
          todaySum.calories += log.calories_burned || 0;
          todaySum.duration += log.duration_minutes || 0;
        }
      });

      // Convert to array format for charts
      const chartData: ExerciseData[] = [];
      for (let i = 0; i < days; i++) {
        const date = new Date();
        date.setDate(date.getDate() - (days - 1 - i));
        const dateString = date.toISOString().split('T')[0];
        
        chartData.push(dailyTotals[dateString] || {
          steps: 0,
          calories: 0,
          duration: 0
        });
      }

      setData(chartData);
      setTodayTotal(todaySum);
      setLoading(false);
    };

    fetchExerciseData();
  }, [user?.id, days]);

  return { data, todayTotal, loading };
};

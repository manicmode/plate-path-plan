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

    const fetchExerciseData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const daysBack = timeRange === '7d' ? 7 : 30;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysBack);

        const { data, error: queryError } = await supabase
          .from('exercise_logs')
          .select('*')
          .eq('user_id', user.id)
          .gte('created_at', startDate.toISOString())
          .order('created_at', { ascending: true });

        if (queryError) {
          console.error('Error fetching exercise data:', queryError);
          setError(queryError.message);
          return;
        }

        // Group data by date and sum values for each day
        const groupedData: Record<string, ExerciseEntry> = {};
        const today = new Date().toISOString().split('T')[0];

        data?.forEach((entry) => {
          const date = new Date(entry.created_at).toISOString().split('T')[0];
          
          if (!groupedData[date]) {
            groupedData[date] = {
              date,
              steps: 0,
              duration_minutes: 0,
              calories_burned: 0,
              activity_type: entry.activity_type,
              intensity_level: entry.intensity_level || 'moderate'
            };
          }

          groupedData[date].steps += entry.steps || 0;
          groupedData[date].duration_minutes += entry.duration_minutes || 0;
          groupedData[date].calories_burned += entry.calories_burned || 0;
        });

        const exerciseEntries = Object.values(groupedData);
        setExerciseData(exerciseEntries);

        // Calculate summary statistics
        const totalSteps = exerciseEntries.reduce((sum, entry) => sum + entry.steps, 0);
        const totalDuration = exerciseEntries.reduce((sum, entry) => sum + entry.duration_minutes, 0);
        const totalCalories = exerciseEntries.reduce((sum, entry) => sum + entry.calories_burned, 0);

        const todayData = groupedData[today];
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

    fetchExerciseData();
  }, [user?.id, timeRange]);

  // Format data for charts (last 7 days with proper day labels)
  const getWeeklyChartData = () => {
    const weekData = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayData = exerciseData.find(entry => entry.date === dateStr);
      const dayName = i === 0 ? 'Today' : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()] || 'Day';
      
      weekData.push({
        day: dayName,
        steps: dayData?.steps || 0,
        calories: dayData?.calories_burned || 0,
        duration: dayData?.duration_minutes || 0,
      });
    }
    
    return weekData;
  };

  // Listen for exercise updated events from voice tools
  useEffect(() => {
    const handleUpdate = () => {
      console.info('[Exercise] Refreshing data due to voice tool update');
      // Trigger data refetch by updating a dependency
      setIsLoading(true);
      const fetchData = async () => {
        if (!user?.id) return;
        
        const daysBack = timeRange === '7d' ? 7 : 30;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysBack);

        const { data, error: queryError } = await supabase
          .from('exercise_logs')
          .select('*')
          .eq('user_id', user.id)
          .gte('created_at', startDate.toISOString())
          .order('created_at', { ascending: true });

        if (!queryError && data) {
          // Process the data same as in the main effect
          const groupedData: Record<string, ExerciseEntry> = {};
          const today = new Date().toISOString().split('T')[0];

          data.forEach((entry) => {
            const date = new Date(entry.created_at).toISOString().split('T')[0];
            
            if (!groupedData[date]) {
              groupedData[date] = {
                date,
                steps: 0,
                duration_minutes: 0,
                calories_burned: 0,
                activity_type: entry.activity_type,
                intensity_level: entry.intensity_level || 'moderate'
              };
            }

            groupedData[date].steps += entry.steps || 0;
            groupedData[date].duration_minutes += entry.duration_minutes || 0;
            groupedData[date].calories_burned += entry.calories_burned || 0;
          });

          const exerciseEntries = Object.values(groupedData);
          setExerciseData(exerciseEntries);

          // Calculate summary statistics
          const totalSteps = exerciseEntries.reduce((sum, entry) => sum + entry.steps, 0);
          const totalDuration = exerciseEntries.reduce((sum, entry) => sum + entry.duration_minutes, 0);
          const totalCalories = exerciseEntries.reduce((sum, entry) => sum + entry.calories_burned, 0);

          const todayData = groupedData[today];
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
        }
        setIsLoading(false);
      };
      
      fetchData();
    };
    
    window.addEventListener('exercise:updated', handleUpdate);
    return () => window.removeEventListener('exercise:updated', handleUpdate);
  }, [user?.id, timeRange]);

  return {
    exerciseData,
    summary,
    weeklyChartData: getWeeklyChartData(),
    isLoading,
    error,
  };
};
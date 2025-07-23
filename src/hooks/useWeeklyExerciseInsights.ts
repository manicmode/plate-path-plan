import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { useToast } from '@/hooks/use-toast';

export interface WeeklyExerciseInsight {
  id: string;
  user_id: string;
  week_start_date: string;
  week_end_date: string;
  workouts_completed: number;
  days_skipped: number;
  total_duration_minutes: number;
  total_calories_burned: number;
  most_frequent_muscle_groups: string[];
  missed_target_areas: string[];
  volume_trend: string | null;
  motivational_headline: string;
  progress_message: string;
  suggestion_tip: string;
  created_at: string;
  updated_at: string;
}

export const useWeeklyExerciseInsights = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [insights, setInsights] = useState<WeeklyExerciseInsight[]>([]);
  const [latestInsight, setLatestInsight] = useState<WeeklyExerciseInsight | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch weekly insights from database
  const fetchInsights = useCallback(async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('weekly_exercise_insights')
        .select('*')
        .eq('user_id', user.id)
        .order('week_start_date', { ascending: false })
        .limit(12); // Get last 12 weeks

      if (fetchError) {
        console.error('Error fetching weekly insights:', fetchError);
        setError(fetchError.message);
        return;
      }

      setInsights(data || []);
      setLatestInsight(data?.[0] || null);

    } catch (err) {
      console.error('Error in fetchInsights:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Generate new weekly insight (manual trigger)
  const generateWeeklyInsight = useCallback(async () => {
    if (!user?.id) return;

    try {
      setIsGenerating(true);
      setError(null);

      const { data, error: generateError } = await supabase.functions.invoke(
        'analyze-weekly-exercise-progress',
        {
          body: { 
            user_id: user.id,
            manual_trigger: true
          }
        }
      );

      if (generateError) {
        console.error('Error generating weekly insight:', generateError);
        setError(generateError.message);
        toast({
          title: "Generation Failed",
          description: "Could not generate weekly insight. Please try again.",
          variant: "destructive",
        });
        return;
      }

      if (data?.success) {
        toast({
          title: "Weekly Insight Generated! 📊",
          description: "Your latest exercise analysis is ready.",
        });
        
        // Refresh insights to get the new data
        await fetchInsights();
      }

    } catch (err) {
      console.error('Error in generateWeeklyInsight:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      toast({
        title: "Generation Failed",
        description: "Could not generate weekly insight. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  }, [user?.id, fetchInsights, toast]);

  // Check if current week needs analysis
  const getCurrentWeekStatus = useCallback(() => {
    if (!latestInsight) return { needsAnalysis: true, isCurrentWeek: false };

    const now = new Date();
    const currentDay = now.getDay();
    const daysToSubtract = currentDay === 0 ? 6 : currentDay - 1;
    
    const currentWeekStart = new Date(now);
    currentWeekStart.setDate(now.getDate() - daysToSubtract);
    currentWeekStart.setHours(0, 0, 0, 0);

    const insightWeekStart = new Date(latestInsight.week_start_date);
    
    const isCurrentWeek = insightWeekStart.getTime() === currentWeekStart.getTime();
    const needsAnalysis = !isCurrentWeek;

    return { needsAnalysis, isCurrentWeek };
  }, [latestInsight]);

  // Auto-generate insight if needed (only once per week)
  const checkAndGenerateInsight = useCallback(async () => {
    const { needsAnalysis } = getCurrentWeekStatus();
    
    if (needsAnalysis && !isGenerating) {
      // Only auto-generate if it's Monday and we don't have this week's insight
      const now = new Date();
      const isMonday = now.getDay() === 1;
      
      if (isMonday) {
        console.log('Auto-generating weekly exercise insight for new week');
        await generateWeeklyInsight();
      }
    }
  }, [getCurrentWeekStatus, isGenerating, generateWeeklyInsight]);

  // Fetch insights on mount and user change
  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  // Check for auto-generation on mount
  useEffect(() => {
    if (!isLoading && user?.id) {
      checkAndGenerateInsight();
    }
  }, [isLoading, user?.id, checkAndGenerateInsight]);

  // Get formatted date range for display
  const getWeekDateRange = useCallback((startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const formatOptions: Intl.DateTimeFormatOptions = { 
      month: 'short', 
      day: 'numeric' 
    };
    
    const startFormatted = start.toLocaleDateString('en-US', formatOptions);
    const endFormatted = end.toLocaleDateString('en-US', formatOptions);
    
    return `${startFormatted} - ${endFormatted}`;
  }, []);

  // Get progress comparison with previous week
  const getProgressComparison = useCallback((currentInsight: WeeklyExerciseInsight) => {
    const currentIndex = insights.findIndex(insight => insight.id === currentInsight.id);
    const previousInsight = insights[currentIndex + 1];
    
    if (!previousInsight) return null;

    const workoutChange = currentInsight.workouts_completed - previousInsight.workouts_completed;
    const durationChange = currentInsight.total_duration_minutes - previousInsight.total_duration_minutes;

    return {
      workoutChange,
      durationChange,
      previousWeek: previousInsight
    };
  }, [insights]);

  return {
    insights,
    latestInsight,
    isLoading,
    isGenerating,
    error,
    generateWeeklyInsight,
    fetchInsights,
    getCurrentWeekStatus,
    getWeekDateRange,
    getProgressComparison,
  };
};
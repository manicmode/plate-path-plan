import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';

export interface WorkoutTrends {
  total_weeks_analyzed: number;
  avg_weekly_workouts: number;
  overall_completion_rate: number;
  overall_skip_rate: number;
  trend_direction: string;
  consistency_rating: string;
  top_exercise_categories: string[];
}

export interface WorkoutForecast {
  forecast_week: number;
  predicted_workouts: number;
  predicted_completion_rate: number;
  predicted_skipped_sets: number;
  confidence_score: number;
  trend_direction: string;
}

export interface ForecastSummary {
  text: string;
  emoji: string;
  confidence: string;
  highlights: string[];
}

export interface WorkoutForecastData {
  trends: WorkoutTrends;
  forecast: WorkoutForecast[];
  summary: ForecastSummary;
}

export function useWorkoutForecast() {
  const { user } = useAuth();
  const [forecastData, setForecastData] = useState<WorkoutForecastData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchForecast = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: forecastError } = await supabase.functions.invoke('ai-workout-forecast');

      if (forecastError) throw forecastError;

      setForecastData(data);
    } catch (err) {
      console.error('Error fetching workout forecast:', err);
      setError('Failed to generate workout forecast');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForecast();
  }, [user]);

  return {
    forecastData,
    loading,
    error,
    refetch: fetchForecast
  };
}
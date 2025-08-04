import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';

export interface MuscleGroupTrend {
  user_id: string;
  muscle_group: string;
  week_start: string;
  total_completed_sets: number;
  total_planned_sets: number;
  total_skipped_sets: number;
  completion_rate: number;
  skip_rate: number;
  workout_sessions: number;
  unique_exercises: number;
  most_common_exercises: string[];
  completion_rate_change: number;
  sets_change: number;
  consistency_badge: 'excellent' | 'good' | 'fair' | 'needs_work';
  trend_direction: 'improving' | 'declining' | 'stable';
}

export interface MuscleGroupSummary {
  muscleGroup: string;
  avgCompletion: number;
  totalSets: number;
  recentTrend: number;
  consistency: string;
  trendDirection: string;
}

export interface MuscleGroupTrendData {
  aiInsight: string;
  muscleGroupSummary: MuscleGroupSummary[];
  totalMuscleGroups: number;
  generatedAt: string;
}

export function useMuscleGroupTrends() {
  const { user } = useAuth();
  const [trendData, setTrendData] = useState<MuscleGroupTrendData | null>(null);
  const [rawTrends, setRawTrends] = useState<MuscleGroupTrend[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTrends = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      // Fetch raw trends data for charting
      const { data: trendsData, error: trendsError } = await supabase
        .from('muscle_group_trends')
        .select('*')
        .eq('user_id', user.id)
        .gte('week_start', new Date(Date.now() - 8 * 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('week_start', { ascending: false });

      if (trendsError) throw trendsError;

      setRawTrends((trendsData || []) as MuscleGroupTrend[]);

      // Get AI insights
      const { data: aiData, error: aiError } = await supabase.functions.invoke('ai-muscle-trend-feedback');

      if (aiError) throw aiError;

      setTrendData(aiData);
    } catch (err) {
      console.error('Error fetching muscle group trends:', err);
      setError('Failed to load muscle group trends');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrends();
  }, [user]);

  // Group raw trends by muscle group for charting
  const groupedTrends = rawTrends.reduce((acc, trend) => {
    if (!acc[trend.muscle_group]) {
      acc[trend.muscle_group] = [];
    }
    acc[trend.muscle_group].push(trend);
    return acc;
  }, {} as Record<string, MuscleGroupTrend[]>);

  return {
    trendData,
    rawTrends,
    groupedTrends,
    loading,
    error,
    refetch: fetchTrends
  };
}
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SkipAnalysis {
  hasAdaptations: boolean;
  summary: string;
  highSkipExercises: string[];
  totalSkippedSets: number;
  totalWorkouts: number;
}

export function useSkipAdaptations() {
  const [skipAnalysis, setSkipAnalysis] = useState<SkipAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSkipAnalysis();
  }, []);

  const loadSkipAnalysis = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get workout logs from the last 7 days
      const { data: workoutLogs, error: logsError } = await supabase
        .from('workout_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('completed_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('completed_at', { ascending: false });

      if (logsError) {
        console.error('Error loading workout logs:', logsError);
        return;
      }

      // Get skipping analysis from the view
      const { data: skippingData, error: skipError } = await supabase
        .from('workout_skipping_analysis')
        .select('*')
        .eq('user_id', user.id)
        .order('workout_week', { ascending: false })
        .limit(4); // Last 4 weeks

      if (skipError) {
        console.error('Error loading skipping analysis:', skipError);
        return;
      }

      if (!workoutLogs || workoutLogs.length < 3) {
        // Not enough data for analysis
        setSkipAnalysis({
          hasAdaptations: false,
          summary: 'Not enough workout history for skip analysis',
          highSkipExercises: [],
          totalSkippedSets: 0,
          totalWorkouts: workoutLogs?.length || 0
        });
        return;
      }

      const totalSkippedSets = workoutLogs.reduce((sum, log) => sum + (log.skipped_sets || 0), 0);
      const totalWorkouts = workoutLogs.length;
      const avgSkippedPerWorkout = totalSkippedSets / totalWorkouts;

      // Identify high skip exercises
      const exerciseSkipData = workoutLogs.reduce((acc, log) => {
        if (log.skipped_sets > 0) {
          if (!acc[log.exercise_name]) {
            acc[log.exercise_name] = { skipped: 0, total: 0 };
          }
          acc[log.exercise_name].skipped += log.skipped_sets;
          acc[log.exercise_name].total += 1;
        }
        return acc;
      }, {} as {[key: string]: {skipped: number, total: number}});

      const highSkipExercises = Object.entries(exerciseSkipData)
        .filter(([_, data]) => data.skipped / data.total > 1) // More than 1 skip per workout on average
        .map(([exercise, _]) => exercise);

      const hasAdaptations = avgSkippedPerWorkout > 0.5 || highSkipExercises.length > 0;

      let summary = '';
      if (hasAdaptations) {
        if (highSkipExercises.length > 0) {
          summary = `Reduced difficulty for frequently skipped exercises: ${highSkipExercises.slice(0, 2).join(', ')}${highSkipExercises.length > 2 ? ` and ${highSkipExercises.length - 2} others` : ''}. Easier alternatives and shorter sets provided.`;
        } else {
          summary = `Detected ${totalSkippedSets} skipped sets across ${totalWorkouts} workouts. Adjusted workout intensity to improve completion rates.`;
        }
      }

      setSkipAnalysis({
        hasAdaptations,
        summary,
        highSkipExercises,
        totalSkippedSets,
        totalWorkouts
      });

    } catch (error) {
      console.error('Error loading skip analysis:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    skipAnalysis,
    isLoading,
    refreshAnalysis: loadSkipAnalysis
  };
}
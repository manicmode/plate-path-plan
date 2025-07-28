import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { toast } from '@/hooks/use-toast';

export interface WorkoutCompletionData {
  id?: string;
  workoutId?: string;
  workoutType: 'ai_routine' | 'manual' | 'pre_made';
  durationMinutes: number;
  exercisesCount: number;
  setsCount: number;
  musclesWorked: string[];
  difficultyFeedback?: 'too_easy' | 'just_right' | 'too_hard';
  journalEntry?: string;
  motivationalMessage?: string;
  completedAt?: string;
  workoutData?: any;
}

export const useWorkoutCompletions = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const getWorkoutCompletions = async (limit = 10): Promise<WorkoutCompletionData[]> => {
    if (!user?.id) return [];

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('workout_completions')
        .select('*')
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data.map(item => ({
        id: item.id,
        workoutId: item.workout_id,
        workoutType: item.workout_type as 'ai_routine' | 'manual' | 'pre_made',
        durationMinutes: item.duration_minutes,
        exercisesCount: item.exercises_count,
        setsCount: item.sets_count,
        musclesWorked: item.muscles_worked,
        difficultyFeedback: item.difficulty_feedback as 'too_easy' | 'just_right' | 'too_hard',
        journalEntry: item.journal_entry,
        motivationalMessage: item.motivational_message,
        completedAt: item.completed_at,
        workoutData: item.workout_data
      }));
    } catch (error) {
      console.error('Error fetching workout completions:', error);
      toast({
        title: "Error",
        description: "Failed to fetch workout history.",
        variant: "destructive"
      });
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const saveWorkoutCompletion = async (data: Omit<WorkoutCompletionData, 'id' | 'completedAt'>): Promise<boolean> => {
    if (!user?.id) return false;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('workout_completions')
        .insert({
          user_id: user.id,
          workout_id: data.workoutId,
          workout_type: data.workoutType,
          duration_minutes: data.durationMinutes,
          exercises_count: data.exercisesCount,
          sets_count: data.setsCount,
          muscles_worked: data.musclesWorked,
          difficulty_feedback: data.difficultyFeedback,
          journal_entry: data.journalEntry,
          motivational_message: data.motivationalMessage,
          workout_data: data.workoutData || {}
        });

      if (error) throw error;

      toast({
        title: "🎉 Workout Saved!",
        description: "Your workout completion has been recorded.",
      });

      return true;
    } catch (error) {
      console.error('Error saving workout completion:', error);
      toast({
        title: "Error",
        description: "Failed to save workout completion.",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const getWeeklyStats = async () => {
    if (!user?.id) return null;

    setIsLoading(true);
    try {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const { data, error } = await supabase
        .from('workout_completions')
        .select('duration_minutes, exercises_count, sets_count, completed_at')
        .eq('user_id', user.id)
        .gte('completed_at', weekAgo.toISOString());

      if (error) throw error;

      const totalWorkouts = data.length;
      const totalMinutes = data.reduce((sum, workout) => sum + workout.duration_minutes, 0);
      const totalExercises = data.reduce((sum, workout) => sum + workout.exercises_count, 0);
      const totalSets = data.reduce((sum, workout) => sum + workout.sets_count, 0);
      const avgDuration = totalWorkouts > 0 ? Math.round(totalMinutes / totalWorkouts) : 0;

      return {
        totalWorkouts,
        totalMinutes,
        totalExercises,
        totalSets,
        avgDuration
      };
    } catch (error) {
      console.error('Error fetching weekly stats:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    getWorkoutCompletions,
    saveWorkoutCompletion,
    getWeeklyStats,
    isLoading
  };
};
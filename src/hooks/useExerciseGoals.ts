import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { toast } from '@/hooks/use-toast';

export interface ExerciseGoal {
  id: string;
  userId: string;
  weeklyTargetMinutes: number;
  sessionsPerWeekTarget: number;
  aiAdjusted: boolean;
  lastAdjustedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export const useExerciseGoals = () => {
  const { user } = useAuth();
  const [goal, setGoal] = useState<ExerciseGoal | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGoal = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('exercise_goals')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (data) {
        setGoal({
          id: data.id,
          userId: data.user_id,
          weeklyTargetMinutes: data.weekly_target_minutes,
          sessionsPerWeekTarget: data.sessions_per_week_target,
          aiAdjusted: data.ai_adjusted,
          lastAdjustedAt: data.last_adjusted_at,
          createdAt: data.created_at,
          updatedAt: data.updated_at
        });
      } else {
        // No goal exists, create default
        await createDefaultGoal();
      }
    } catch (err) {
      console.error('Error fetching exercise goal:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch exercise goal');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  const createDefaultGoal = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error: createError } = await supabase
        .from('exercise_goals')
        .insert({
          user_id: user.id,
          weekly_target_minutes: 120, // Default 2 hours per week
          sessions_per_week_target: 3, // Default 3 sessions per week
          ai_adjusted: false
        })
        .select()
        .single();

      if (createError) throw createError;

      setGoal({
        id: data.id,
        userId: data.user_id,
        weeklyTargetMinutes: data.weekly_target_minutes,
        sessionsPerWeekTarget: data.sessions_per_week_target,
        aiAdjusted: data.ai_adjusted,
        lastAdjustedAt: data.last_adjusted_at,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      });

      toast({
        title: "🎯 Goals Set!",
        description: "Your weekly workout targets have been established."
      });
    } catch (err) {
      console.error('Error creating default goal:', err);
      setError(err instanceof Error ? err.message : 'Failed to create default goal');
    }
  }, [user?.id]);

  const updateGoal = useCallback(async (updates: Partial<Pick<ExerciseGoal, 'weeklyTargetMinutes' | 'sessionsPerWeekTarget'>>) => {
    if (!user?.id || !goal) return false;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: updateError } = await supabase
        .from('exercise_goals')
        .update({
          weekly_target_minutes: updates.weeklyTargetMinutes,
          sessions_per_week_target: updates.sessionsPerWeekTarget,
          last_adjusted_at: new Date().toISOString()
        })
        .eq('id', goal.id)
        .select()
        .single();

      if (updateError) throw updateError;

      setGoal({
        id: data.id,
        userId: data.user_id,
        weeklyTargetMinutes: data.weekly_target_minutes,
        sessionsPerWeekTarget: data.sessions_per_week_target,
        aiAdjusted: data.ai_adjusted,
        lastAdjustedAt: data.last_adjusted_at,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      });

      toast({
        title: "✅ Goals Updated!",
        description: "Your weekly workout targets have been adjusted."
      });

      return true;
    } catch (err) {
      console.error('Error updating exercise goal:', err);
      setError(err instanceof Error ? err.message : 'Failed to update goal');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, goal]);

  const resetToDefaults = useCallback(async () => {
    return await updateGoal({
      weeklyTargetMinutes: 120,
      sessionsPerWeekTarget: 3
    });
  }, [updateGoal]);

  const markAsAIAdjusted = useCallback(async () => {
    if (!user?.id || !goal) return false;

    try {
      const { error: updateError } = await supabase
        .from('exercise_goals')
        .update({
          ai_adjusted: true,
          last_adjusted_at: new Date().toISOString()
        })
        .eq('id', goal.id);

      if (updateError) throw updateError;

      setGoal(prev => prev ? { ...prev, aiAdjusted: true, lastAdjustedAt: new Date().toISOString() } : null);
      return true;
    } catch (err) {
      console.error('Error marking goal as AI adjusted:', err);
      return false;
    }
  }, [user?.id, goal]);

  // Auto-fetch goal when user changes
  useEffect(() => {
    fetchGoal();
  }, [fetchGoal]);

  return {
    goal,
    isLoading,
    error,
    updateGoal,
    resetToDefaults,
    markAsAIAdjusted,
    refetchGoal: fetchGoal
  };
};
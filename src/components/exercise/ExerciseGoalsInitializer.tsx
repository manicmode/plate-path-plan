import React, { useEffect } from 'react';
import { useExerciseGoals } from '@/hooks/useExerciseGoals';

/**
 * This component ensures that exercise goals are initialized for new users
 * It runs silently in the background when the exercise section is accessed
 */
export const ExerciseGoalsInitializer = () => {
  const { goal, isLoading } = useExerciseGoals();

  useEffect(() => {
    // The hook automatically creates default goals if none exist
    // This component just ensures the hook runs when the exercise section is visited
    if (!isLoading && goal) {
      console.log('Exercise goals initialized:', {
        weeklyTarget: goal.weeklyTargetMinutes,
        sessionsTarget: goal.sessionsPerWeekTarget,
        aiAdjusted: goal.aiAdjusted
      });
    }
  }, [goal, isLoading]);

  // This component renders nothing - it just ensures goal initialization
  return null;
};
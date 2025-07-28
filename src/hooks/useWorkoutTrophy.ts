import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';

export interface WorkoutStreak {
  currentStreak: number;
  longestStreak: number;
  lastWorkoutDate: string | null;
  totalWorkouts: number;
}

export interface MonthlyAward {
  id?: string;
  month: number;
  year: number;
  awardLevel: 'gold' | 'silver' | 'bronze' | 'none';
  workoutCount: number;
  createdAt?: string;
}

export interface WorkoutTrophyData {
  currentMonthAward: MonthlyAward;
  streak: WorkoutStreak;
  isLoading: boolean;
  error: string | null;
}

const getAwardLevel = (workoutCount: number): 'gold' | 'silver' | 'bronze' | 'none' => {
  if (workoutCount >= 16) return 'gold';
  if (workoutCount >= 12) return 'silver';
  if (workoutCount >= 8) return 'bronze';
  return 'none';
};

const getAwardConfig = (level: 'gold' | 'silver' | 'bronze' | 'none') => {
  switch (level) {
    case 'gold':
      return {
        emoji: '🥇',
        title: 'Gold Achiever',
        gradient: 'from-yellow-400 to-yellow-600',
        textColor: 'text-yellow-700',
        bgColor: 'bg-yellow-50 dark:bg-yellow-950/20',
        borderColor: 'border-yellow-300'
      };
    case 'silver':
      return {
        emoji: '🥈',
        title: 'Silver Champion',
        gradient: 'from-gray-400 to-gray-600',
        textColor: 'text-gray-700',
        bgColor: 'bg-gray-50 dark:bg-gray-950/20',
        borderColor: 'border-gray-300'
      };
    case 'bronze':
      return {
        emoji: '🥉',
        title: 'Bronze Warrior',
        gradient: 'from-orange-400 to-orange-600',
        textColor: 'text-orange-700',
        bgColor: 'bg-orange-50 dark:bg-orange-950/20',
        borderColor: 'border-orange-300'
      };
    default:
      return {
        emoji: '💪',
        title: 'Keep Going!',
        gradient: 'from-blue-400 to-blue-600',
        textColor: 'text-blue-700',
        bgColor: 'bg-blue-50 dark:bg-blue-950/20',
        borderColor: 'border-blue-300'
      };
  }
};

export const useWorkoutTrophy = (): WorkoutTrophyData => {
  const { user } = useAuth();
  const [currentMonthAward, setCurrentMonthAward] = useState<MonthlyAward>({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    awardLevel: 'none',
    workoutCount: 0
  });
  const [streak, setStreak] = useState<WorkoutStreak>({
    currentStreak: 0,
    longestStreak: 0,
    lastWorkoutDate: null,
    totalWorkouts: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const calculateStreak = useCallback((workouts: any[]): WorkoutStreak => {
    if (workouts.length === 0) {
      return {
        currentStreak: 0,
        longestStreak: 0,
        lastWorkoutDate: null,
        totalWorkouts: 0
      };
    }

    // Sort workouts by completion date (newest first)
    const sortedWorkouts = workouts.sort((a, b) => 
      new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime()
    );

    // Get unique workout dates (remove duplicates on same day)
    const uniqueDates = Array.from(new Set(
      sortedWorkouts.map(w => new Date(w.completed_at).toDateString())
    )).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calculate current streak
    for (let i = 0; i < uniqueDates.length; i++) {
      const workoutDate = new Date(uniqueDates[i]);
      workoutDate.setHours(0, 0, 0, 0);
      
      const daysDiff = Math.floor((today.getTime() - workoutDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (i === 0 && daysDiff <= 1) {
        // First workout is today or yesterday, start streak
        currentStreak = 1;
        tempStreak = 1;
      } else if (currentStreak > 0) {
        const prevWorkoutDate = new Date(uniqueDates[i - 1]);
        prevWorkoutDate.setHours(0, 0, 0, 0);
        const consecutiveDiff = Math.floor((prevWorkoutDate.getTime() - workoutDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (consecutiveDiff === 1) {
          // Consecutive day
          currentStreak++;
          tempStreak++;
        } else {
          // Streak broken
          break;
        }
      }
    }

    // Calculate longest streak from all workouts
    tempStreak = 0;
    for (let i = 0; i < uniqueDates.length; i++) {
      if (i === 0) {
        tempStreak = 1;
      } else {
        const currentDate = new Date(uniqueDates[i]);
        const prevDate = new Date(uniqueDates[i - 1]);
        const daysDiff = Math.floor((prevDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysDiff === 1) {
          tempStreak++;
        } else {
          longestStreak = Math.max(longestStreak, tempStreak);
          tempStreak = 1;
        }
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak);

    return {
      currentStreak,
      longestStreak,
      lastWorkoutDate: sortedWorkouts[0]?.completed_at || null,
      totalWorkouts: workouts.length
    };
  }, []);

  const fetchWorkoutData = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();

      // Get current month's workout completions
      const startOfMonth = new Date(currentYear, currentMonth - 1, 1);
      const endOfMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59);

      const { data: monthlyWorkouts, error: monthlyError } = await supabase
        .from('workout_completions')
        .select('completed_at, duration_minutes')
        .eq('user_id', user.id)
        .gte('completed_at', startOfMonth.toISOString())
        .lte('completed_at', endOfMonth.toISOString());

      if (monthlyError) throw monthlyError;

      const monthlyCount = monthlyWorkouts?.length || 0;
      const awardLevel = getAwardLevel(monthlyCount);

      // Get or create monthly award record
      const { data: existingAward, error: awardError } = await supabase
        .from('monthly_workout_awards')
        .select('*')
        .eq('user_id', user.id)
        .eq('month', currentMonth)
        .eq('year', currentYear)
        .maybeSingle();

      if (awardError && awardError.code !== 'PGRST116') throw awardError;

      let currentAward: MonthlyAward;

      if (existingAward) {
        // Update existing record if workout count changed
        if (existingAward.workout_count !== monthlyCount || existingAward.award_level !== awardLevel) {
          const { data: updatedAward, error: updateError } = await supabase
            .from('monthly_workout_awards')
            .update({
              workout_count: monthlyCount,
              award_level: awardLevel,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingAward.id)
            .select()
            .single();

          if (updateError) throw updateError;
          currentAward = {
            id: updatedAward.id,
            month: updatedAward.month,
            year: updatedAward.year,
            awardLevel: updatedAward.award_level as any,
            workoutCount: updatedAward.workout_count,
            createdAt: updatedAward.created_at
          };
        } else {
          currentAward = {
            id: existingAward.id,
            month: existingAward.month,
            year: existingAward.year,
            awardLevel: existingAward.award_level as any,
            workoutCount: existingAward.workout_count,
            createdAt: existingAward.created_at
          };
        }
      } else {
        // Create new award record
        const { data: newAward, error: createError } = await supabase
          .from('monthly_workout_awards')
          .insert({
            user_id: user.id,
            month: currentMonth,
            year: currentYear,
            award_level: awardLevel,
            workout_count: monthlyCount
          })
          .select()
          .single();

        if (createError) throw createError;
        currentAward = {
          id: newAward.id,
          month: newAward.month,
          year: newAward.year,
          awardLevel: newAward.award_level as any,
          workoutCount: newAward.workout_count,
          createdAt: newAward.created_at
        };
      }

      setCurrentMonthAward(currentAward);

      // Get all workouts for streak calculation
      const { data: allWorkouts, error: allWorkoutsError } = await supabase
        .from('workout_completions')
        .select('completed_at, duration_minutes')
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false });

      if (allWorkoutsError) throw allWorkoutsError;

      const streakData = calculateStreak(allWorkouts || []);
      setStreak(streakData);

    } catch (err) {
      console.error('Error fetching workout trophy data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch workout data');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, calculateStreak]);

  useEffect(() => {
    fetchWorkoutData();
  }, [fetchWorkoutData]);

  return {
    currentMonthAward,
    streak,
    isLoading,
    error
  };
};

export { getAwardConfig };
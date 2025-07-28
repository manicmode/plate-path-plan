import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';

export interface ExerciseMonthlyAward {
  id: string;
  month: number;
  year: number;
  awardLevel: 'gold' | 'silver' | 'bronze' | 'none';
  workoutCount: number;
  createdAt: string;
  isPersonalBest?: boolean;
}

export const useExerciseHallOfFame = () => {
  const { user } = useAuth();
  const [monthlyAwards, setMonthlyAwards] = useState<ExerciseMonthlyAward[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchExerciseHallOfFame = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch all monthly workout awards for the user
      const { data: awards, error: awardsError } = await supabase
        .from('monthly_workout_awards')
        .select('*')
        .eq('user_id', user.id)
        .order('year', { ascending: false })
        .order('month', { ascending: false });

      if (awardsError) throw awardsError;

      if (awards && awards.length > 0) {
        // Find personal best (highest workout count)
        const maxWorkoutCount = Math.max(...awards.map(a => a.workout_count));
        
        const formattedAwards: ExerciseMonthlyAward[] = awards.map(award => ({
          id: award.id,
          month: award.month,
          year: award.year,
          awardLevel: award.award_level as 'gold' | 'silver' | 'bronze' | 'none',
          workoutCount: award.workout_count,
          createdAt: award.created_at,
          isPersonalBest: award.workout_count === maxWorkoutCount
        }));

        setMonthlyAwards(formattedAwards);
      } else {
        setMonthlyAwards([]);
      }
    } catch (err) {
      console.error('Error fetching exercise hall of fame:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch exercise awards');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchExerciseHallOfFame();
  }, [fetchExerciseHallOfFame]);

  return {
    monthlyAwards,
    isLoading,
    error,
    refetch: fetchExerciseHallOfFame
  };
};
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';

export interface PodiumWinner {
  userId: string;
  username: string;
  displayName: string;
  finalScore: number;
  finalStreak: number;
  completionDate: string;
  podiumPosition: number;
  totalInteractions: number;
}

export interface CompletedChallenge {
  challengeId: string;
  challengeName: string;
  participantCount: number;
  completionDate: string;
}

export const useTrophyPodium = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  const getPodiumWinners = useCallback(async (
    challengeId: string, 
    monthYear?: Date
  ): Promise<PodiumWinner[]> => {
    if (!user) return [];

    try {
      setIsLoading(true);
      const targetDate = monthYear || new Date();
      
      const { data, error } = await supabase
        .rpc('get_challenge_podium_winners', {
          challenge_id_param: challengeId,
          month_year: targetDate.toISOString().split('T')[0]
        });

      if (error) throw error;

      return (data || []).map((winner: any) => ({
        userId: winner.user_id,
        username: winner.username,
        displayName: winner.display_name,
        finalScore: winner.final_score,
        finalStreak: winner.final_streak,
        completionDate: winner.completion_date,
        podiumPosition: winner.podium_position,
        totalInteractions: winner.total_interactions,
      }));
    } catch (error) {
      console.error('Error fetching podium winners:', error);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const getCompletedChallenges = useCallback(async (
    monthYear?: Date
  ): Promise<CompletedChallenge[]> => {
    if (!user) return [];

    try {
      setIsLoading(true);
      const targetDate = monthYear || new Date();
      
      const { data, error } = await supabase
        .rpc('get_completed_challenges_for_month', {
          target_month: targetDate.toISOString().split('T')[0]
        });

      if (error) throw error;

      return (data || []).map((challenge: any) => ({
        challengeId: challenge.challenge_id,
        challengeName: challenge.challenge_name,
        participantCount: challenge.participant_count,
        completionDate: challenge.completion_date,
      }));
    } catch (error) {
      console.error('Error fetching completed challenges:', error);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Check if it's end of month and we should show podium
  const shouldShowMonthlyPodium = useCallback(() => {
    const now = new Date();
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const daysUntilEndOfMonth = lastDayOfMonth.getDate() - now.getDate();
    
    // Show podium in the last 3 days of the month or first 3 days of next month
    return daysUntilEndOfMonth <= 3 || now.getDate() <= 3;
  }, []);

  // Get the target month for podium display
  const getPodiumMonth = useCallback(() => {
    const now = new Date();
    // If we're in the first 3 days of the month, show last month's results
    if (now.getDate() <= 3) {
      return new Date(now.getFullYear(), now.getMonth() - 1, 1);
    }
    // Otherwise show current month
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }, []);

  return {
    getPodiumWinners,
    getCompletedChallenges,
    shouldShowMonthlyPodium,
    getPodiumMonth,
    isLoading
  };
};

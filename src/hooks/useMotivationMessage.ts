import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';

interface MotivationResponse {
  status: string;
  message: string;
  category: 'onTrack' | 'almostThere' | 'behind';
  completion: {
    totalMinutesThisWeek: number;
    sessionsThisWeek: number;
    goalMinutes: number;
    goalSessions: number;
    completionPercentage: number;
  };
}

export const useMotivationMessage = () => {
  const { user } = useAuth();
  const [motivationData, setMotivationData] = useState<MotivationResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMotivation = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: functionError } = await supabase.functions.invoke(
        'generate-exercise-motivation',
        {
          body: { user_id: user.id }
        }
      );

      if (functionError) {
        throw functionError;
      }

      if (data?.status === 'success') {
        setMotivationData(data as MotivationResponse);
      } else {
        throw new Error(data?.error || 'Failed to generate motivation message');
      }
    } catch (err) {
      console.error('Error fetching motivation:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch motivation');
      // Set fallback message
      setMotivationData({
        status: 'success',
        message: "You've got this! Every step forward is progress! 💪",
        category: 'behind',
        completion: {
          totalMinutesThisWeek: 0,
          sessionsThisWeek: 0,
          goalMinutes: 120,
          goalSessions: 3,
          completionPercentage: 0
        }
      });
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Fetch motivation on mount and when user changes
  useEffect(() => {
    fetchMotivation();
  }, [fetchMotivation]);

  // Auto-refresh motivation when week changes (Monday at midnight)
  useEffect(() => {
    const now = new Date();
    const nextMonday = new Date(now);
    const dayOfWeek = now.getDay();
    const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek; // 0 = Sunday
    
    nextMonday.setDate(now.getDate() + daysUntilMonday);
    nextMonday.setHours(0, 0, 0, 0);
    
    const timeUntilNextMonday = nextMonday.getTime() - now.getTime();
    
    const timer = setTimeout(() => {
      fetchMotivation();
      // Set up weekly interval after the first trigger
      const weeklyInterval = setInterval(fetchMotivation, 7 * 24 * 60 * 60 * 1000);
      return () => clearInterval(weeklyInterval);
    }, timeUntilNextMonday);

    return () => clearTimeout(timer);
  }, [fetchMotivation]);

  const refreshMotivation = useCallback(() => {
    fetchMotivation();
  }, [fetchMotivation]);

  return {
    motivationData,
    isLoading,
    error,
    refreshMotivation
  };
};
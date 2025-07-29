import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { useToast } from '@/hooks/use-toast';

export interface UserLevel {
  user_id: string;
  level: number;
  current_xp: number;
  xp_to_next_level: number;
  last_leveled_up_at?: string;
}

export interface WorkoutXPResult {
  success: boolean;
  xp_earned: number;
  base_xp: number;
  bonus_xp: number;
  reason: string;
  current_level: number;
  current_xp: number;
  xp_to_next_level: number;
  leveled_up: boolean;
  previous_level: number;
  daily_xp_earned: number;
  daily_xp_limit: number;
}

export function useXP() {
  const [userLevel, setUserLevel] = useState<UserLevel | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch current user XP and level
  const getCurrentXP = async (): Promise<UserLevel | null> => {
    if (!user?.id) {
      setLoading(false);
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('user_levels')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        // If no level record exists, create one
        if (error.code === 'PGRST116') {
          const { data: newLevel, error: insertError } = await supabase
            .from('user_levels')
            .insert([{
              user_id: user.id,
              level: 1,
              current_xp: 0,
              xp_to_next_level: 100
            }])
            .select()
            .single();

          if (insertError) {
            console.error('Error creating user level:', insertError);
            return null;
          }

          setUserLevel(newLevel);
          return newLevel;
        } else {
          console.error('Error fetching user level:', error);
          return null;
        }
      }

      setUserLevel(data);
      return data;
    } catch (error) {
      console.error('Error in getCurrentXP:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Log workout XP
  const logWorkoutXP = async (
    routine_id: string,
    intensity: 'low' | 'medium' | 'high',
    duration_minutes?: number,
    difficulty_multiplier?: number
  ): Promise<WorkoutXPResult | null> => {
    if (!user?.id) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to earn XP for workouts.",
        variant: "destructive",
      });
      return null;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('log-workout-xp', {
        body: {
          routine_id,
          intensity_level: intensity,
          duration_minutes,
          difficulty_multiplier
        }
      });

      if (error) {
        console.error('Error logging workout XP:', error);
        
        // Handle specific error cases
        if (error.message?.includes('Daily XP limit reached')) {
          toast({
            title: "Daily XP Limit Reached",
            description: "You've earned the maximum XP for today. Come back tomorrow to earn more!",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Error",
            description: "Failed to log workout XP. Please try again.",
            variant: "destructive",
          });
        }
        return null;
      }

      const result: WorkoutXPResult = data;

      // Update local state with new level info
      const updatedLevel: UserLevel = {
        user_id: user.id,
        level: result.current_level,
        current_xp: result.current_xp,
        xp_to_next_level: result.xp_to_next_level,
      };
      setUserLevel(updatedLevel);

      // Show appropriate toast messages
      if (result.leveled_up) {
        toast({
          title: "🎉 Level Up!",
          description: `Congratulations! You've reached level ${result.current_level}! You earned ${result.xp_earned} XP from this workout.`,
        });
      } else {
        const nextLevelProgress = ((result.current_xp / (result.current_xp + result.xp_to_next_level)) * 100).toFixed(0);
        toast({
          title: "🔥 XP Earned!",
          description: `+${result.xp_earned} XP! Level ${result.current_level} (${nextLevelProgress}% to next level)`,
        });
      }

      return result;
    } catch (error) {
      console.error('Error in logWorkoutXP:', error);
      toast({
        title: "Error",
        description: "Failed to log workout XP. Please try again.",
        variant: "destructive",
      });
      return null;
    } finally {
      setSubmitting(false);
    }
  };

  // Get XP progress percentage for current level
  const getXPProgress = (): number => {
    if (!userLevel) return 0;
    const totalXPForLevel = userLevel.current_xp + userLevel.xp_to_next_level;
    return totalXPForLevel > 0 ? (userLevel.current_xp / totalXPForLevel) * 100 : 0;
  };

  // Get total XP earned by user
  const getTotalXP = (): number => {
    if (!userLevel) return 0;
    // Calculate total XP: (level - 1) * 100 + current_xp
    return (userLevel.level - 1) * 100 + userLevel.current_xp;
  };

  // Get recent XP logs
  const getRecentXPLogs = async (limit: number = 10) => {
    if (!user?.id) return [];

    try {
      const { data, error } = await supabase
        .from('workout_xp_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching XP logs:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getRecentXPLogs:', error);
      return [];
    }
  };

  // Initialize on mount
  useEffect(() => {
    if (user?.id) {
      getCurrentXP();
    } else {
      setUserLevel(null);
      setLoading(false);
    }
  }, [user?.id]);

  return {
    userLevel,
    loading,
    submitting,
    getCurrentXP,
    logWorkoutXP,
    getXPProgress,
    getTotalXP,
    getRecentXPLogs,
  };
}
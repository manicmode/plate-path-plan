import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';

// 🎮 Coach Gamification System
// Hook to track and manage coach interactions for gamification

export type CoachType = 'nutrition' | 'exercise' | 'recovery';
export type InteractionType = 'message' | 'skill_panel' | 'nudge_action';

interface CoachInteractionResult {
  interaction_count: number;
  praise_level: number;
  should_praise: boolean;
  praise_message?: string;
  interaction_type: string;
}

export const useCoachInteractions = () => {
  const { user } = useAuth();
  const [isTracking, setIsTracking] = useState(false);

  const trackInteraction = useCallback(async (
    coachType: CoachType,
    interactionType: InteractionType = 'message'
  ): Promise<CoachInteractionResult | null> => {
    if (!user) return null;

    setIsTracking(true);
    try {
      const { data, error } = await supabase.rpc('track_coach_interaction', {
        p_user_id: user.id,
        p_coach_type: coachType,
        p_interaction_type: interactionType
      });

      if (error) {
        console.error('Error tracking coach interaction:', error);
        return null;
      }

      return data as unknown as CoachInteractionResult;
    } catch (error) {
      console.error('Error tracking coach interaction:', error);
      return null;
    } finally {
      setIsTracking(false);
    }
  }, [user]);

  const getCoachStats = useCallback(async (coachType: CoachType) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('coach_interactions')
        .select('*')
        .eq('user_id', user.id)
        .eq('coach_type', coachType)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('Error fetching coach stats:', error);
        return null;
      }

      return data || {
        interaction_count: 0,
        praise_level: 0,
        last_praised_at: null
      };
    } catch (error) {
      console.error('Error fetching coach stats:', error);
      return null;
    }
  }, [user]);

  const getAllCoachStats = useCallback(async () => {
    if (!user) return {};

    try {
      const { data, error } = await supabase
        .from('coach_interactions')
        .select('*')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching all coach stats:', error);
        return {};
      }

      const stats: Record<CoachType, any> = {
        nutrition: { interaction_count: 0, praise_level: 0, last_praised_at: null },
        exercise: { interaction_count: 0, praise_level: 0, last_praised_at: null },
        recovery: { interaction_count: 0, praise_level: 0, last_praised_at: null }
      };

      data?.forEach(interaction => {
        stats[interaction.coach_type as CoachType] = interaction;
      });

      return stats;
    } catch (error) {
      console.error('Error fetching all coach stats:', error);
      return {};
    }
  }, [user]);

  return {
    trackInteraction,
    getCoachStats,
    getAllCoachStats,
    isTracking
  };
};
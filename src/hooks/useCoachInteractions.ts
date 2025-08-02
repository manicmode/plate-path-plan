import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';

// 🎮 Coach Gamification System - Enhanced
// Hook to track and manage coach interactions for gamification with praise history

export type CoachType = 'nutrition' | 'exercise' | 'recovery';
export type InteractionType = 'message' | 'skill_panel' | 'nudge_action';

interface CoachInteractionResult {
  interaction_count: number;
  praise_level: number;
  should_praise: boolean;
  praise_message?: string;
  interaction_type: string;
}

interface PraiseHistoryItem {
  id: string;
  message: string;
  coachType: CoachType;
  timestamp: Date;
  praise_level: number;
  interaction_count: number;
}

interface CoachBadge {
  id: string;
  name: string;
  title: string;
  description: string;
  icon: string;
  coachType: CoachType;
  requirement: number;
  unlocked: boolean;
  unlockedAt?: Date;
}

export const useCoachInteractions = () => {
  const { user } = useAuth();
  const [isTracking, setIsTracking] = useState(false);
  const [praiseHistory, setPraiseHistory] = useState<Record<CoachType, PraiseHistoryItem[]>>({
    nutrition: [],
    exercise: [],
    recovery: []
  });

  // Load praise history from localStorage on mount
  useEffect(() => {
    if (user) {
      const savedHistory = localStorage.getItem(`praise_history_${user.id}`);
      if (savedHistory) {
        try {
          const parsed = JSON.parse(savedHistory);
          // Convert timestamp strings back to Date objects
          Object.keys(parsed).forEach(coachType => {
            parsed[coachType] = parsed[coachType].map((item: any) => ({
              ...item,
              timestamp: new Date(item.timestamp)
            }));
          });
          setPraiseHistory(parsed);
        } catch (error) {
          console.error('Error loading praise history:', error);
        }
      }
    }
  }, [user]);

  // Save praise history to localStorage whenever it changes
  const savePraiseHistory = useCallback((newHistory: Record<CoachType, PraiseHistoryItem[]>) => {
    if (user) {
      localStorage.setItem(`praise_history_${user.id}`, JSON.stringify(newHistory));
      setPraiseHistory(newHistory);
    }
  }, [user]);

  const addPraiseToHistory = useCallback((
    coachType: CoachType,
    message: string,
    praise_level: number,
    interaction_count: number
  ) => {
    const newPraise: PraiseHistoryItem = {
      id: `${Date.now()}_${Math.random()}`,
      message,
      coachType,
      timestamp: new Date(),
      praise_level,
      interaction_count
    };

    const newHistory = {
      ...praiseHistory,
      [coachType]: [newPraise, ...praiseHistory[coachType]].slice(0, 50) // Keep last 50 praise messages
    };

    savePraiseHistory(newHistory);
  }, [praiseHistory, savePraiseHistory]);

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

      const result = data as unknown as CoachInteractionResult;

      // If we got a praise message, add it to history
      if (result?.should_praise && result?.praise_message) {
        addPraiseToHistory(
          coachType,
          result.praise_message,
          result.praise_level,
          result.interaction_count
        );
      }

      return result;
    } catch (error) {
      console.error('Error tracking coach interaction:', error);
      return null;
    } finally {
      setIsTracking(false);
    }
  }, [user, addPraiseToHistory]);

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

  const getPraiseHistory = useCallback((coachType: CoachType) => {
    return praiseHistory[coachType] || [];
  }, [praiseHistory]);

  const getAllPraiseHistory = useCallback(() => {
    return praiseHistory;
  }, [praiseHistory]);

  const getTotalPraiseCount = useCallback((coachType?: CoachType) => {
    if (coachType) {
      return praiseHistory[coachType]?.length || 0;
    }
    return Object.values(praiseHistory).reduce((total, history) => total + history.length, 0);
  }, [praiseHistory]);

  const clearPraiseHistory = useCallback((coachType?: CoachType) => {
    if (coachType) {
      const newHistory = {
        ...praiseHistory,
        [coachType]: []
      };
      savePraiseHistory(newHistory);
    } else {
      savePraiseHistory({
        nutrition: [],
        exercise: [],
        recovery: []
      });
    }
  }, [praiseHistory, savePraiseHistory]);

  // Placeholder badge system - ready for future implementation
  const getAvailableBadges = useCallback((coachType: CoachType): CoachBadge[] => {
    const badges: Record<CoachType, CoachBadge[]> = {
      nutrition: [
        {
          id: 'nutritionist_apprentice',
          name: 'nutritionist_apprentice',
          title: 'Nutritionist Apprentice',
          description: 'Have 5 meaningful conversations with your nutrition coach',
          icon: '🌱',
          coachType: 'nutrition',
          requirement: 5,
          unlocked: false
        },
        {
          id: 'mindful_eater',
          name: 'mindful_eater',
          title: 'Mindful Eater',
          description: 'Receive 10 praise messages from your nutrition coach',
          icon: '🧘‍♀️',
          coachType: 'nutrition',
          requirement: 10,
          unlocked: false
        },
        {
          id: 'nutrition_master',
          name: 'nutrition_master',
          title: 'Nutrition Master',
          description: 'Build a strong bond with your nutrition coach (25 praises)',
          icon: '🏆',
          coachType: 'nutrition',
          requirement: 25,
          unlocked: false
        }
      ],
      exercise: [
        {
          id: 'iron_beginner',
          name: 'iron_beginner',
          title: 'Iron Beginner',
          description: 'Start your fitness journey with 5 coach interactions',
          icon: '💪',
          coachType: 'exercise',
          requirement: 5,
          unlocked: false
        },
        {
          id: 'disciplined_mind',
          name: 'disciplined_mind',
          title: 'Disciplined Mind',
          description: 'Show consistency with 10 workout coaching sessions',
          icon: '🧠',
          coachType: 'exercise',
          requirement: 10,
          unlocked: false
        },
        {
          id: 'iron_body',
          name: 'iron_body',
          title: 'Iron Body',
          description: 'Achieve mastery with 25 fitness coaching milestones',
          icon: '🔥',
          coachType: 'exercise',
          requirement: 25,
          unlocked: false
        }
      ],
      recovery: [
        {
          id: 'zen_seeker',
          name: 'zen_seeker',
          title: 'Zen Seeker',
          description: 'Begin your recovery journey with 5 peaceful sessions',
          icon: '🌙',
          coachType: 'recovery',
          requirement: 5,
          unlocked: false
        },
        {
          id: 'recovery_whisperer',
          name: 'recovery_whisperer',
          title: 'Recovery Whisperer',
          description: 'Master the art of rest with 10 recovery coaching sessions',
          icon: '✨',
          coachType: 'recovery',
          requirement: 10,
          unlocked: false
        },
        {
          id: 'serene_master',
          name: 'serene_master',
          title: 'Serene Master',
          description: 'Achieve inner peace with 25 recovery milestones',
          icon: '🕯️',
          coachType: 'recovery',
          requirement: 25,
          unlocked: false
        }
      ]
    };

    const coachPraiseCount = getTotalPraiseCount(coachType);
    
    return badges[coachType].map(badge => ({
      ...badge,
      unlocked: coachPraiseCount >= badge.requirement
    }));
  }, [getTotalPraiseCount]);

  const getUnlockedBadges = useCallback((coachType?: CoachType) => {
    if (coachType) {
      return getAvailableBadges(coachType).filter(badge => badge.unlocked);
    }
    
    const allBadges: CoachBadge[] = [];
    (['nutrition', 'exercise', 'recovery'] as CoachType[]).forEach(type => {
      allBadges.push(...getAvailableBadges(type));
    });
    
    return allBadges.filter(badge => badge.unlocked);
  }, [getAvailableBadges]);

  return {
    trackInteraction,
    getCoachStats,
    getAllCoachStats,
    isTracking,
    // 🎮 Enhanced Praise System
    getPraiseHistory,
    getAllPraiseHistory,
    getTotalPraiseCount,
    clearPraiseHistory,
    // 🏆 Badge System (Placeholder)
    getAvailableBadges,
    getUnlockedBadges
  };
};
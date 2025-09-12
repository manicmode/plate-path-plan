import { useAuth } from '@/contexts/auth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useXPSystem = () => {
  const { user } = useAuth();

  // Try to get level check function, but don't require it
  let triggerLevelCheck: (() => Promise<void>) | undefined;
  try {
    const { useLevelUp } = require('@/contexts/LevelUpContext');
    const levelUpContext = useLevelUp();
    triggerLevelCheck = levelUpContext.triggerLevelCheck;
  } catch {
    // LevelUpProvider not available, continue without level checking
    triggerLevelCheck = undefined;
  }

  const awardUserXP = async (
    activityType: 'nutrition' | 'hydration' | 'supplement' | 'recovery',
    amount: number,
    reason: string,
    activityId?: string,
    bonusXP: number = 0
  ) => {
    if (!user?.id) {
      console.warn('Cannot award XP: User not authenticated');
      return false;
    }

    try {
      
      // Route nutrition-related awards through the canonical wrapper to enforce base_xp & cooldowns
      if (activityType === 'nutrition' || activityType === 'hydration' || activityType === 'supplement') {
        // TEMP one-time debug (remove after test)
        const { error } = await supabase.functions.invoke('award-nutrition-xp', {
          body: {
            activityType: activityType,
            activityId: activityId || null
          }
        });

        if (error) {
          console.error('Nutrition XP Award Error (routed):', error);
          return false;
        }

        // Trigger level check for potential level-up (if available)
        if (triggerLevelCheck) {
          await triggerLevelCheck();
        }
        return true;
      }
      
      const { error } = await supabase.rpc('add_user_xp', {
        p_user_id: user.id,
        p_activity_type: activityType,
        p_base_xp: amount,
        p_activity_id: activityId || null,
        p_bonus_xp: bonusXP,
        p_reason: reason
      });

      if (error) {
        console.error('XP Award Error:', error);
        return false;
      }

      // Show XP notification
      const totalXP = amount + bonusXP;
      const bonusText = bonusXP > 0 ? ` (+${bonusXP} bonus)` : '';
      
      toast.success(`+${totalXP} XP${bonusText}`, {
        description: reason,
        duration: 3000,
      });

      // Trigger level check for potential level-up (if available)
      if (triggerLevelCheck) {
        await triggerLevelCheck();
      }

      return true;
    } catch (error) {
      console.error('Failed to award XP:', error);
      return false;
    }
  };

  const awardNutritionXP = async (
    activityType: 'nutrition' | 'hydration' | 'supplement',
    activityId?: string
  ) => {
    if (!user?.id) return false;

    try {
      // TEMP one-time debug (remove after test)
      
      const { error } = await supabase.functions.invoke('award-nutrition-xp', {
        body: {
          activityType: activityType,
          activityId: activityId || null
        }
      });

      if (error) {
        console.error('Nutrition XP Award Error:', error);
        return false;
      }

      // Trigger level check (if available)
      if (triggerLevelCheck) {
        await triggerLevelCheck();
      }
      return true;
    } catch (error) {
      console.error('Failed to award nutrition XP:', error);
      return false;
    }
  };

  const awardRecoveryXP = async (
    recoveryType: 'meditation' | 'yoga' | 'breathing' | 'sleep' | 'stretching' | 'muscle-recovery',
    sessionId: string,
    durationMinutes: number = 0
  ) => {
    if (!user?.id) return false;

    try {
      const { error } = await supabase.rpc('award_recovery_xp', {
        p_user_id: user.id,
        p_recovery_type: recoveryType,
        p_session_id: sessionId,
        p_duration_minutes: durationMinutes
      });

      if (error) {
        console.error('Recovery XP Award Error:', error);
        return false;
      }

      // Trigger level check (if available)
      if (triggerLevelCheck) {
        await triggerLevelCheck();
      }
      return true;
    } catch (error) {
      console.error('Failed to award recovery XP:', error);
      return false;
    }
  };

  return {
    awardUserXP,
    awardNutritionXP,
    awardRecoveryXP
  };
};
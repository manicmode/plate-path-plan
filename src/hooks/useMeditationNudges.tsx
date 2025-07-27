import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface NudgeConditions {
  hasIntenseExercise: boolean;
  hasLowMood: boolean;
  skippedMeditation: boolean;
  daysSinceLastMeditation: number;
}

interface AICoachNudge {
  shouldShow: boolean;
  message: string;
  reason: string;
  conditions: NudgeConditions;
}

export const useMeditationNudges = () => {
  const [nudgePreferences, setNudgePreferences] = useState<any>(null);
  const [userScores, setUserScores] = useState<any>(null);
  const { toast } = useToast();

  // Fetch user's nudge preferences
  const fetchNudgePreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let { data: preferences, error } = await supabase
        .from('meditation_nudge_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code === 'PGRST116') {
        // No preferences found, create default ones
        const { data: newPreferences, error: insertError } = await supabase
          .from('meditation_nudge_preferences')
          .insert({
            user_id: user.id,
            nudges_enabled: true,
            smart_nudges_enabled: true,
            push_notifications_enabled: true
          })
          .select()
          .single();

        if (insertError) {
          console.error('Error creating default preferences:', insertError);
          return;
        }
        preferences = newPreferences;
      }

      setNudgePreferences(preferences);
    } catch (error) {
      console.error('Error fetching nudge preferences:', error);
    }
  };

  // Update nudge preferences
  const updateNudgePreferences = async (updates: Partial<any>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('meditation_nudge_preferences')
        .update(updates)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error updating preferences:', error);
        toast({
          title: "❌ Error",
          description: "Failed to update preferences. Please try again.",
          duration: 3000,
        });
        return;
      }

      setNudgePreferences(prev => ({ ...prev, ...updates }));
      toast({
        title: "✅ Updated",
        description: "Meditation nudge preferences updated successfully.",
        duration: 3000,
      });
    } catch (error) {
      console.error('Error updating nudge preferences:', error);
    }
  };

  // Check if AI coach nudge should be shown
  const checkAICoachNudge = async (): Promise<AICoachNudge> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !nudgePreferences?.smart_nudges_enabled) {
        return {
          shouldShow: false,
          message: '',
          reason: '',
          conditions: {
            hasIntenseExercise: false,
            hasLowMood: false,
            skippedMeditation: false,
            daysSinceLastMeditation: 0
          }
        };
      }

      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const threeDaysAgo = new Date(today);
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      // Check for intense exercise today
      const { data: exerciseData } = await supabase
        .from('exercise_logs')
        .select('intensity_level')
        .eq('user_id', user.id)
        .gte('created_at', today.toISOString().split('T')[0])
        .eq('intensity_level', 'high');

      const hasIntenseExercise = exerciseData && exerciseData.length > 0;

      // Check for low mood entries (2+ in last 3 days)
      const { data: moodData } = await supabase
        .from('mood_logs')
        .select('mood')
        .eq('user_id', user.id)
        .gte('date', threeDaysAgo.toISOString().split('T')[0])
        .lte('mood', 3); // Assuming 1-5 scale, 3 and below is "low"

      const hasLowMood = moodData && moodData.length >= 2;

      // Check meditation streak
      const { data: streakData } = await supabase
        .from('meditation_streaks')
        .select('current_streak, last_completed_date')
        .eq('user_id', user.id)
        .single();

      let daysSinceLastMeditation = 0;
      let skippedMeditation = false;

      if (streakData?.last_completed_date) {
        const lastMeditationDate = new Date(streakData.last_completed_date);
        const timeDiff = today.getTime() - lastMeditationDate.getTime();
        daysSinceLastMeditation = Math.floor(timeDiff / (1000 * 3600 * 24));
        skippedMeditation = daysSinceLastMeditation >= 2;
      } else {
        // Never meditated
        skippedMeditation = true;
        daysSinceLastMeditation = 999;
      }

      const conditions: NudgeConditions = {
        hasIntenseExercise: hasIntenseExercise || false,
        hasLowMood: hasLowMood || false,
        skippedMeditation,
        daysSinceLastMeditation
      };

      // Determine if nudge should be shown and generate message
      let shouldShow = false;
      let message = '';
      let reason = '';

      if (hasLowMood && skippedMeditation) {
        shouldShow = true;
        message = "Hey, I noticed your mood's been low and your mind might need some peace. Want to do a quick meditation now?";
        reason = 'low_mood_and_skipped';
      } else if (hasIntenseExercise && skippedMeditation) {
        shouldShow = true;
        message = "Great workout! Your body's energized, but your mind could use some calm. Ready for a meditation session?";
        reason = 'intense_exercise_and_skipped';
      } else if (skippedMeditation && daysSinceLastMeditation >= 3) {
        shouldShow = true;
        message = "It's been a few days since your last meditation. Your mind deserves a moment of peace. Shall we meditate?";
        reason = 'long_break';
      } else if (hasLowMood) {
        shouldShow = true;
        message = "I sense you might need a moment to center yourself. A short meditation could help lift your spirits.";
        reason = 'low_mood';
      }

      return {
        shouldShow,
        message,
        reason,
        conditions
      };

    } catch (error) {
      console.error('Error checking AI coach nudge:', error);
      return {
        shouldShow: false,
        message: '',
        reason: '',
        conditions: {
          hasIntenseExercise: false,
          hasLowMood: false,
          skippedMeditation: false,
          daysSinceLastMeditation: 0
        }
      };
    }
  };

  // Log nudge interaction
  const logNudgeInteraction = async (
    nudgeType: string,
    reason: string,
    action: 'accepted' | 'dismissed' | 'ignored',
    message: string
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('meditation_nudge_history')
        .insert({
          user_id: user.id,
          nudge_type: nudgeType,
          nudge_reason: reason,
          user_action: action,
          nudge_message: message
        });

      if (error) {
        console.error('Error logging nudge interaction:', error);
      }

      // Update user scores
      await updateUserScores(action === 'accepted');
    } catch (error) {
      console.error('Error in logNudgeInteraction:', error);
    }
  };

  // Update user scores based on nudge interactions
  const updateUserScores = async (accepted: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get or create user scores
      let { data: scores, error } = await supabase
        .from('meditation_user_scores')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code === 'PGRST116') {
        // Create new scores record
        const { data: newScores, error: insertError } = await supabase
          .from('meditation_user_scores')
          .insert({
            user_id: user.id,
            total_nudges_received: 1,
            total_nudges_accepted: accepted ? 1 : 0,
            nudge_acceptance_rate: accepted ? 100 : 0
          })
          .select()
          .single();

        if (insertError) {
          console.error('Error creating user scores:', insertError);
          return;
        }
        scores = newScores;
      } else if (!error && scores) {
        // Update existing scores
        const newTotalReceived = scores.total_nudges_received + 1;
        const newTotalAccepted = scores.total_nudges_accepted + (accepted ? 1 : 0);
        const newAcceptanceRate = (newTotalAccepted / newTotalReceived) * 100;

        const { error: updateError } = await supabase
          .from('meditation_user_scores')
          .update({
            total_nudges_received: newTotalReceived,
            total_nudges_accepted: newTotalAccepted,
            nudge_acceptance_rate: newAcceptanceRate,
            last_calculated_at: new Date().toISOString()
          })
          .eq('user_id', user.id);

        if (updateError) {
          console.error('Error updating user scores:', updateError);
        }
      }
    } catch (error) {
      console.error('Error updating user scores:', error);
    }
  };

  useEffect(() => {
    fetchNudgePreferences();
  }, []);

  return {
    nudgePreferences,
    userScores,
    updateNudgePreferences,
    checkAICoachNudge,
    logNudgeInteraction,
    fetchNudgePreferences
  };
};
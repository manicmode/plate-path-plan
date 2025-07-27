import { useEffect, useCallback } from 'react';
import { useCoachCta } from '@/hooks/useCoachCta';
import { useRecoveryChallenge } from '@/hooks/useRecoveryChallenge';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/integrations/supabase/client';

interface RecoveryChallengeActivity {
  category: 'meditation' | 'breathing' | 'yoga' | 'sleep' | 'thermotherapy';
  sessionId: string;
  completedAt: string;
  duration?: number;
  notes?: string;
}

const CATEGORY_EMOJIS = {
  meditation: '🧘‍♂️',
  breathing: '🫁',
  yoga: '🤸‍♀️',
  sleep: '🌙',
  thermotherapy: '🔥'
};

const CATEGORY_NAMES = {
  meditation: 'Meditation',
  breathing: 'Breathwork',
  yoga: 'Yoga',
  sleep: 'Sleep Prep',
  thermotherapy: 'Thermotherapy'
};

export const useRecoveryChallengeCoach = () => {
  const { sendCoachMessage } = useCoachCta();
  const { activeChallenges } = useRecoveryChallenge();
  const { user } = useAuth();

  // Send welcome message when user joins a recovery challenge
  const sendChallengeJoinMessage = useCallback((challengeTitle: string, category: string) => {
    const emoji = CATEGORY_EMOJIS[category as keyof typeof CATEGORY_EMOJIS] || '🎯';
    const message = `You've started the "${challengeTitle}" challenge! I'll track your progress and cheer you on ${emoji}💪`;
    sendCoachMessage(message);
  }, [sendCoachMessage]);

  // Send progress message when user completes recovery activity
  const sendProgressMessage = useCallback(async (activity: RecoveryChallengeActivity) => {
    if (!user) return;

    // Find relevant challenges for this activity
    const relevantChallenges = activeChallenges.filter(
      challenge => challenge.category === activity.category
    );

    if (relevantChallenges.length === 0) return;

    // Check if we've already sent a progress message today for this category
    const today = new Date().toISOString().split('T')[0];
    const storageKey = `recovery_coach_${activity.category}_${today}`;
    
    if (localStorage.getItem(storageKey)) {
      return; // Already sent message today for this category
    }

    const challenge = relevantChallenges[0]; // Use first relevant challenge
    const emoji = CATEGORY_EMOJIS[activity.category];
    const categoryName = CATEGORY_NAMES[activity.category];
    
    let message = '';
    
    if (challenge.sessionsCompleted === 1) {
      message = `Great start! You've logged your first ${categoryName} session ${emoji} Keep building that streak!`;
    } else if (challenge.streakDays >= 7) {
      message = `Amazing! You're on a ${challenge.streakDays}-day ${categoryName} streak! ${emoji}🔥 You're crushing it!`;
    } else if (challenge.completionPercentage >= 50) {
      message = `You're halfway through your ${categoryName} challenge! ${emoji} ${challenge.sessionsCompleted} sessions completed - keep going!`;
    } else if (challenge.streakDays >= 3) {
      message = `${challenge.streakDays} days in a row! Your ${categoryName} practice is becoming a habit ${emoji}✨`;
    } else {
      message = `Nice work on your ${categoryName} session! You're ${challenge.sessionsCompleted} sessions into your challenge ${emoji}`;
    }

    sendCoachMessage(message);
    
    // Mark that we've sent a message today for this category
    localStorage.setItem(storageKey, 'true');
  }, [activeChallenges, sendCoachMessage, user]);

  // Send encouragement for missed days
  const sendMissedDayMessage = useCallback(async (category: string) => {
    if (!user) return;

    const emoji = CATEGORY_EMOJIS[category as keyof typeof CATEGORY_EMOJIS];
    const categoryName = CATEGORY_NAMES[category as keyof typeof CATEGORY_NAMES];
    
    const messages = [
      `Missed yesterday's ${categoryName}? No worries! Every new day is a fresh start ${emoji}💚`,
      `It's okay to miss a day! Ready to get back to your ${categoryName} practice? ${emoji}⭐`,
      `Yesterday is gone, today is here! How about a gentle ${categoryName} session? ${emoji}🌟`
    ];
    
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    sendCoachMessage(randomMessage);
  }, [sendCoachMessage, user]);

  // Check for missed streaks and send encouragement (run once per day)
  useEffect(() => {
    if (!user || activeChallenges.length === 0) return;

    const checkMissedStreaks = async () => {
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      for (const challenge of activeChallenges) {
        // Check if user had any activity yesterday for this category
        const { data: yesterdayActivity } = await supabase
          .from('recovery_session_logs')
          .select('id')
          .eq('user_id', user.id)
          .eq('category', challenge.category)
          .gte('completed_at', `${yesterdayStr}T00:00:00Z`)
          .lt('completed_at', `${today}T00:00:00Z`)
          .limit(1);

        // If no activity yesterday but they have an active challenge, send encouragement
        if (!yesterdayActivity || yesterdayActivity.length === 0) {
          const missedStorageKey = `recovery_missed_${challenge.category}_${today}`;
          
          if (!localStorage.getItem(missedStorageKey)) {
            setTimeout(() => {
              sendMissedDayMessage(challenge.category);
            }, Math.random() * 10000); // Random delay to avoid spam
            
            localStorage.setItem(missedStorageKey, 'true');
          }
        }
      }
    };

    // Only check once per day
    const lastChecked = localStorage.getItem('recovery_coach_last_check');
    const today = new Date().toISOString().split('T')[0];
    
    if (lastChecked !== today) {
      checkMissedStreaks();
      localStorage.setItem('recovery_coach_last_check', today);
    }
  }, [activeChallenges, user, sendMissedDayMessage]);

  return {
    sendChallengeJoinMessage,
    sendProgressMessage,
    sendMissedDayMessage
  };
};
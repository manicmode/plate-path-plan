import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';

interface CoachContent {
  reminder_line?: string;
  encourage_line?: string;
  recovery_line?: string;
  celebration_line?: string;
}

export function useCoachTone() {
  const { user } = useAuth();
  const [userTone, setUserTone] = useState<string>('gentle');

  useEffect(() => {
    const loadUserTone = async () => {
      if (!user?.id) return;

      try {
        const { data } = await supabase
          .from('habit_user_preferences')
          .select('preferred_tone')
          .eq('user_id', user.id)
          .maybeSingle();

        if (data?.preferred_tone) {
          setUserTone(data.preferred_tone);
        }
      } catch (error) {
        console.error('Error loading user tone:', error);
      }
    };

    loadUserTone();
  }, [user?.id]);

  const getCoachContent = (coachTones: any, type: 'reminder' | 'encourage' | 'recovery' | 'celebration'): string => {
    if (!coachTones || typeof coachTones !== 'object') {
      return '';
    }

    // Try to get content for user's preferred tone
    const preferredContent = coachTones[userTone];
    if (preferredContent && typeof preferredContent === 'object') {
      const content = preferredContent[`${type}_line`];
      if (content) return content;
    }

    // Fallback to 'gentle' tone if user's preferred tone doesn't have the content
    const gentleContent = coachTones['gentle'];
    if (gentleContent && typeof gentleContent === 'object') {
      const content = gentleContent[`${type}_line`];
      if (content) return content;
    }

    // Fallback to any available tone
    for (const tone of Object.keys(coachTones)) {
      const toneContent = coachTones[tone];
      if (toneContent && typeof toneContent === 'object') {
        const content = toneContent[`${type}_line`];
        if (content) return content;
      }
    }

    return '';
  };

  const getAvailableTones = (coachTones: any): string[] => {
    if (!coachTones || typeof coachTones !== 'object') {
      return [];
    }
    return Object.keys(coachTones);
  };

  return {
    userTone,
    getCoachContent,
    getAvailableTones,
    setUserTone // For manual updates
  };
}
import { useEffect, useState, useRef, useCallback } from 'react';
import { useNotification } from '@/contexts/NotificationContext';
import { useAuth } from '@/contexts/auth';

interface MoodSchedulerState {
  showMoodModal: boolean;
  setShowMoodModal: (show: boolean) => void;
}

export const useDailyMoodScheduler = (): MoodSchedulerState => {
  const [showMoodModal, setShowMoodModal] = useState(false);
  const { preferences, addNotification } = useNotification();
  const { user } = useAuth();
  
  // Refs to track state and prevent duplicates
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasShownTodayRef = useRef<string>('');

  const checkIfMoodLoggedToday = useCallback(async (): Promise<boolean> => {
    if (!user) return false;
    
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const today = new Date().toISOString().split('T')[0];
      
      const { data } = await supabase
        .from('mood_logs')
        .select('id')
        .eq('user_id', user.id)
        .eq('date', today)
        .maybeSingle();

      return !!data;
    } catch (error) {
      console.error('Error checking mood log:', error);
      return false;
    }
  }, [user]);

  const triggerMoodNotification = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    const storageKey = `mood_reminder_shown_${today}_${user?.id}`;
    
    // Check if we already showed a notification today
    if (localStorage.getItem(storageKey) || hasShownTodayRef.current === today) {
      console.log('[Toast] Prevented duplicate mood reminder for today');
      return;
    }

    // Show notification based on delivery preference
    if (preferences.deliveryMode === 'toast' || preferences.deliveryMode === 'both') {
      console.log('[Toast] Scheduled mood reminder');
      addNotification({
        title: '💭 Daily reflection reminder',
        body: 'Don\'t forget to log your mood and wellness for today!',
        type: 'mood_reminder',
        action: () => setShowMoodModal(true),
      });
      
      // Mark as shown for today
      localStorage.setItem(storageKey, 'true');
      hasShownTodayRef.current = today;
    }
  }, [preferences.deliveryMode, addNotification, user?.id]);

  useEffect(() => {
    if (!user || !preferences.dailyMoodCheckin) {
      console.log('[Toast] Mood checkin disabled or no user');
      return;
    }

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    const scheduleNotification = async () => {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const currentHour = now.getHours();
      const storageKey = `mood_reminder_shown_${today}_${user.id}`;

      // Check if we already showed notification today
      if (localStorage.getItem(storageKey) || hasShownTodayRef.current === today) {
        console.log('[Toast] Already showed mood reminder today');
        return;
      }

      // Check if user already logged mood today
      const hasLogged = await checkIfMoodLoggedToday();
      if (hasLogged) {
        console.log('[Toast] User already logged mood today');
        return;
      }

      // If it's evening time (after 8:30 PM), show notification immediately
      if (currentHour >= 20) {
        // Check if user is within quiet hours
        const isQuietTime = 
          preferences.quietHoursStart <= preferences.quietHoursEnd
            ? currentHour >= preferences.quietHoursStart || currentHour < preferences.quietHoursEnd
            : currentHour >= preferences.quietHoursStart && currentHour < preferences.quietHoursEnd;

        if (!isQuietTime) {
          console.log('[Toast] Triggering immediate mood reminder (evening)');
          triggerMoodNotification();
        }
      } else {
        // Schedule for 8:30 PM today
        const targetTime = new Date();
        targetTime.setHours(20, 30, 0, 0);
        
        const timeUntilNotification = targetTime.getTime() - now.getTime();
        
        console.log('[Toast] Scheduling mood reminder for', targetTime);
        timeoutRef.current = setTimeout(() => {
          const currentHour = new Date().getHours();
          const isQuietTime = 
            preferences.quietHoursStart <= preferences.quietHoursEnd
              ? currentHour >= preferences.quietHoursStart || currentHour < preferences.quietHoursEnd
              : currentHour >= preferences.quietHoursStart && currentHour < preferences.quietHoursEnd;

          if (!isQuietTime) {
            checkIfMoodLoggedToday().then((hasLogged) => {
              if (!hasLogged) {
                triggerMoodNotification();
              }
            });
          }
        }, timeUntilNotification);
      }
    };

    scheduleNotification();

    // Cleanup function
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [user, preferences.dailyMoodCheckin, preferences.quietHoursStart, preferences.quietHoursEnd, preferences.deliveryMode, addNotification, checkIfMoodLoggedToday, triggerMoodNotification]);

  return {
    showMoodModal,
    setShowMoodModal,
  };
};
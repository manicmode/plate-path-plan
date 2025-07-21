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
  const scheduledTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const startupTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasTriggeredTodayRef = useRef<string | null>(null);
  const isSchedulingRef = useRef(false);

  // Clear all timeouts function
  const clearAllTimeouts = useCallback(() => {
    if (scheduledTimeoutRef.current) {
      clearTimeout(scheduledTimeoutRef.current);
      scheduledTimeoutRef.current = null;
    }
    if (startupTimeoutRef.current) {
      clearTimeout(startupTimeoutRef.current);
      startupTimeoutRef.current = null;
    }
  }, []);

  const checkIfMoodLoggedToday = async (): Promise<boolean> => {
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
  };

  const triggerMoodNotification = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    
    // Prevent duplicate notifications on the same day
    if (hasTriggeredTodayRef.current === today) {
      console.log('[Toast] Prevented duplicate mood reminder for today');
      return;
    }
    
    hasTriggeredTodayRef.current = today;
    console.log('[Toast] Scheduled reminder');
    
    // Show notification based on delivery preference
    if (preferences.deliveryMode === 'toast' || preferences.deliveryMode === 'both') {
      addNotification({
        title: 'Daily reflection reminder',
        body: 'How are you feeling today? Log your mood and wellness.',
        type: 'mood_checkin',
        action: () => setShowMoodModal(true),
      });
    }
  }, [addNotification, preferences.deliveryMode]);

  useEffect(() => {
    // Clear any existing timeouts first
    clearAllTimeouts();
    
    if (!user || !preferences.dailyMoodCheckin || isSchedulingRef.current) {
      return;
    }

    isSchedulingRef.current = true;

    const scheduleNotification = () => {
      const now = new Date();
      const targetTime = new Date();
      targetTime.setHours(20, 30, 0, 0); // 8:30 PM

      // If it's past 8:30 PM today, schedule for tomorrow
      if (now > targetTime) {
        targetTime.setDate(targetTime.getDate() + 1);
      }

      const timeUntilNotification = targetTime.getTime() - now.getTime();

      // Schedule the notification
      scheduledTimeoutRef.current = setTimeout(() => {
        // Check if user is within quiet hours
        const currentHour = new Date().getHours();
        const isQuietTime = 
          preferences.quietHoursStart <= preferences.quietHoursEnd
            ? currentHour >= preferences.quietHoursStart || currentHour < preferences.quietHoursEnd
            : currentHour >= preferences.quietHoursStart && currentHour < preferences.quietHoursEnd;

        if (!isQuietTime) {
          // Check if user has already logged mood today
          checkIfMoodLoggedToday().then((hasLogged) => {
            if (!hasLogged) {
              triggerMoodNotification();
            }
          });
        }
        isSchedulingRef.current = false;
      }, timeUntilNotification);
    };

    scheduleNotification();

    // Clean up timeout on unmount or when dependencies change
    return () => {
      clearAllTimeouts();
      isSchedulingRef.current = false;
    };
  }, [user, preferences.dailyMoodCheckin, preferences.quietHoursStart, preferences.quietHoursEnd, preferences.deliveryMode, triggerMoodNotification, clearAllTimeouts]);

  // Also check if we should show the modal on app startup (for missed notifications)
  useEffect(() => {
    if (!user || !preferences.dailyMoodCheckin) {
      return;
    }

    const checkMissedMoodLog = async () => {
      try {
        const { supabase } = await import('@/integrations/supabase/client');
        const today = new Date().toISOString().split('T')[0];
        const now = new Date();
        const currentHour = now.getHours();

        // Only check if it's after 8:30 PM and before midnight
        if (currentHour >= 20 && currentHour < 24) {
          const { data } = await supabase
            .from('mood_logs')
            .select('id')
            .eq('user_id', user.id)
            .eq('date', today)
            .maybeSingle();

          // If no mood log for today, show a gentle reminder
          if (!data) {
            startupTimeoutRef.current = setTimeout(() => {
              triggerMoodNotification();
            }, 2000); // Small delay to avoid overwhelming on startup
          }
        }
      } catch (error) {
        console.error('Error checking missed mood log:', error);
      }
    };

    checkMissedMoodLog();

    return () => {
      if (startupTimeoutRef.current) {
        clearTimeout(startupTimeoutRef.current);
        startupTimeoutRef.current = null;
      }
    };
  }, [user, preferences.dailyMoodCheckin, triggerMoodNotification]);

  return {
    showMoodModal,
    setShowMoodModal,
  };
};
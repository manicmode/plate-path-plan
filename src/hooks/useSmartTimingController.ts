import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface TimingState {
  hasLoggedToday: boolean;
  hasActiveStreak: boolean;
  isAppIdle: boolean;
  isOnValidPage: boolean;
  recentDismissalTime: number | null;
  lastLogTime: number | null;
}

interface LogActivity {
  nutrition: boolean;
  hydration: boolean;
  supplements: boolean;
}

export const useSmartTimingController = () => {
  const [timingState, setTimingState] = useState<TimingState>({
    hasLoggedToday: false,
    hasActiveStreak: false,
    isAppIdle: false,
    isOnValidPage: false,
    recentDismissalTime: null,
    lastLogTime: null,
  });

  const location = useLocation();
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const logCheckTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Check if user has logged today
  const checkTodayLogs = async (): Promise<LogActivity> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { nutrition: false, hydration: false, supplements: false };

      const today = new Date().toISOString().split('T')[0];
      
      // Check all three log types
      const [nutritionLogs, hydrationLogs, supplementLogs] = await Promise.all([
        supabase
          .from('nutrition_logs')
          .select('id')
          .eq('user_id', user.id)
          .gte('created_at', today)
          .limit(1),
        supabase
          .from('hydration_logs')
          .select('id')
          .eq('user_id', user.id)
          .gte('created_at', today)
          .limit(1),
        supabase
          .from('supplement_logs')
          .select('id')
          .eq('user_id', user.id)
          .gte('created_at', today)
          .limit(1)
      ]);

      return {
        nutrition: (nutritionLogs.data?.length || 0) > 0,
        hydration: (hydrationLogs.data?.length || 0) > 0,
        supplements: (supplementLogs.data?.length || 0) > 0,
      };
    } catch (error) {
      console.error('Error checking today logs:', error);
      return { nutrition: false, hydration: false, supplements: false };
    }
  };

  // Check if user has a 3+ day streak in any top tracker
  const checkActiveStreak = async (): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('current_nutrition_streak, current_hydration_streak, current_supplement_streak')
        .eq('user_id', user.id)
        .single();

      if (!profile) return false;

      const streaks = [
        profile.current_nutrition_streak || 0,
        profile.current_hydration_streak || 0,
        profile.current_supplement_streak || 0,
      ];

      return streaks.some(streak => streak >= 3);
    } catch (error) {
      console.error('Error checking streaks:', error);
      return false;
    }
  };

  // Track user activity for idle detection
  const resetIdleTimer = () => {
    lastActivityRef.current = Date.now();
    setTimingState(prev => ({ ...prev, isAppIdle: false }));
    
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }
    
    idleTimerRef.current = setTimeout(() => {
      setTimingState(prev => ({ ...prev, isAppIdle: true }));
    }, 10000); // 10 seconds
  };

  // Check if current page is valid for prompts
  const updateValidPage = () => {
    const validPages = ['/', '/home', '/progress-calories', '/progress-hydration', '/progress-protein', '/progress-carbs', '/progress-fat', '/progress-supplements'];
    const isValid = validPages.includes(location.pathname);
    setTimingState(prev => ({ ...prev, isOnValidPage: isValid }));
  };

  // Register a log completion (called from logging components)
  const registerLogCompletion = (logType: 'nutrition' | 'hydration' | 'supplement') => {
    const now = Date.now();
    setTimingState(prev => ({ 
      ...prev, 
      lastLogTime: now,
      hasLoggedToday: true // Update immediately for better UX
    }));

    // Refresh today's logs check after a short delay
    setTimeout(async () => {
      const todayLogs = await checkTodayLogs();
      const hasAnyLog = todayLogs.nutrition || todayLogs.hydration || todayLogs.supplements;
      setTimingState(prev => ({ ...prev, hasLoggedToday: hasAnyLog }));
    }, 1000);
  };

  // Register popup/modal dismissal
  const registerDismissal = () => {
    setTimingState(prev => ({ ...prev, recentDismissalTime: Date.now() }));
  };

  // Check if enough time has passed since log completion (5 seconds)
  const canShowAfterLog = (): boolean => {
    if (!timingState.lastLogTime) return true; // No recent log, can show
    return Date.now() - timingState.lastLogTime >= 5000; // 5 seconds
  };

  // Check if enough time has passed since last dismissal (30 seconds)
  const canShowAfterDismissal = (): boolean => {
    if (!timingState.recentDismissalTime) return true; // No recent dismissal, can show
    return Date.now() - timingState.recentDismissalTime >= 30000; // 30 seconds
  };

  // Main function to determine if team-up prompt should be shown
  const shouldShowTeamUpPrompt = (): boolean => {
    return (
      timingState.hasLoggedToday && // Must have logged today
      timingState.hasActiveStreak && // Must have 3+ day streak
      timingState.isAppIdle && // App must be idle for 10+ seconds
      timingState.isOnValidPage && // Must be on home/progress page
      canShowAfterLog() && // 5 seconds after log completion
      canShowAfterDismissal() // 30 seconds after last dismissal
    );
  };

  // Initialize and update timing state
  useEffect(() => {
    const updateTimingState = async () => {
      const todayLogs = await checkTodayLogs();
      const hasActiveStreak = await checkActiveStreak();
      const hasAnyLog = todayLogs.nutrition || todayLogs.hydration || todayLogs.supplements;

      setTimingState(prev => ({
        ...prev,
        hasLoggedToday: hasAnyLog,
        hasActiveStreak,
      }));
    };

    updateTimingState();
    updateValidPage();

    // Check logs periodically
    const interval = setInterval(updateTimingState, 60000); // Check every minute

    return () => {
      clearInterval(interval);
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
      if (logCheckTimerRef.current) {
        clearTimeout(logCheckTimerRef.current);
      }
    };
  }, []);

  // Update valid page when location changes
  useEffect(() => {
    updateValidPage();
  }, [location.pathname]);

  // Set up activity listeners
  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      document.addEventListener(event, resetIdleTimer, true);
    });

    // Initial setup
    resetIdleTimer();

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, resetIdleTimer, true);
      });
    };
  }, []);

  return {
    timingState,
    shouldShowTeamUpPrompt,
    registerLogCompletion,
    registerDismissal,
    canShowAfterLog,
    canShowAfterDismissal,
  };
};
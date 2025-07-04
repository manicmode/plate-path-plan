import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { toast } from 'sonner';
import { useNutrition } from './NutritionContext';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';

export interface NotificationPreferences {
  reminders: boolean;
  milestones: boolean;
  progressSuggestions: boolean;
  smartTips: boolean;
  overlimitAlerts: boolean;
  encouragement: boolean;
  reEngagement: boolean;
  // New Smart Coach notifications
  mealReminders: boolean;
  hydrationNudges: boolean;
  consistencyPraise: boolean;
  coachCheckins: boolean;
  progressReflection: boolean;
  frequency: 'normal' | 'low';
  quietHoursStart: number;
  quietHoursEnd: number;
  deliveryMode: 'toast' | 'push' | 'both';
  pushEnabled: boolean;
}

export interface NotificationHistory {
  lastReminderSent: string | null;
  lastMilestoneCelebrated: string | null;
  lastProgressSuggestion: string | null;
  lastSmartTip: string | null;
  lastOverlimitAlert: string | null;
  lastEncouragement: string | null;
  lastReEngagement: string | null;
  // New Smart Coach history
  lastMealReminder: string | null;
  lastHydrationNudge: string | null;
  lastConsistencyPraise: string | null;
  lastCoachCheckin: string | null;
  lastProgressReflection: string | null;
  milestonesAchieved: string[];
  consecutiveDays: number;
  lastAppOpen: string;
  lastCoachInteraction: string | null;
}

export interface BehaviorData {
  lastFoodLog: string | null;
  lastHydrationLog: string | null;
  lastSupplementLog: string | null;
  dailyCompletionRate: number;
  weeklyPattern: { [key: string]: number };
  averageGoalCompletion: { [key: string]: number };
  todayMealCount: number;
  todayHydrationCount: number;
}

interface NotificationContextType {
  preferences: NotificationPreferences;
  history: NotificationHistory;
  behaviorData: BehaviorData;
  updatePreferences: (prefs: Partial<NotificationPreferences>) => void;
  checkNotifications: () => void;
  dismissNotification: (type: string) => void;
  requestPushPermission: () => Promise<boolean>;
  isAppActive: boolean;
  recordCoachInteraction: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

const defaultPreferences: NotificationPreferences = {
  reminders: true,
  milestones: true,
  progressSuggestions: true,
  smartTips: true,
  overlimitAlerts: true,
  encouragement: true,
  reEngagement: true,
  // New Smart Coach notifications - enabled by default
  mealReminders: true,
  hydrationNudges: true,
  consistencyPraise: true,
  coachCheckins: true,
  progressReflection: true,
  frequency: 'normal',
  quietHoursStart: 22,
  quietHoursEnd: 7,
  deliveryMode: 'both',
  pushEnabled: false,
};

const defaultHistory: NotificationHistory = {
  lastReminderSent: null,
  lastMilestoneCelebrated: null,
  lastProgressSuggestion: null,
  lastSmartTip: null,
  lastOverlimitAlert: null,
  lastEncouragement: null,
  lastReEngagement: null,
  // New Smart Coach history
  lastMealReminder: null,
  lastHydrationNudge: null,
  lastConsistencyPraise: null,
  lastCoachCheckin: null,
  lastProgressReflection: null,
  milestonesAchieved: [],
  consecutiveDays: 0,
  lastAppOpen: new Date().toISOString(),
  lastCoachInteraction: null,
};

const defaultBehaviorData: BehaviorData = {
  lastFoodLog: null,
  lastHydrationLog: null,
  lastSupplementLog: null,
  dailyCompletionRate: 0,
  weeklyPattern: {},
  averageGoalCompletion: {},
  todayMealCount: 0,
  todayHydrationCount: 0,
};

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const { currentDay, getTodaysProgress } = useNutrition();
  const { user } = useAuth();
  
  const [preferences, setPreferences] = useState<NotificationPreferences>(() => {
    const saved = localStorage.getItem('notification_preferences');
    return saved ? { ...defaultPreferences, ...JSON.parse(saved) } : defaultPreferences;
  });

  const [history, setHistory] = useState<NotificationHistory>(() => {
    const saved = localStorage.getItem('notification_history');
    return saved ? { ...defaultHistory, ...JSON.parse(saved) } : defaultHistory;
  });

  const [behaviorData, setBehaviorData] = useState<BehaviorData>(() => {
    const saved = localStorage.getItem('behavior_data');
    return saved ? JSON.parse(saved) : defaultBehaviorData;
  });

  const [isAppActive, setIsAppActive] = useState(true);

  // Track app visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsAppActive(!document.hidden);
    };

    const handleFocus = () => setIsAppActive(true);
    const handleBlur = () => setIsAppActive(false);

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  // Update app open timestamp - FIXED: Only run once on mount
  useEffect(() => {
    const updateLastAppOpen = () => {
      setHistory(prevHistory => {
        const newHistory = { ...prevHistory, lastAppOpen: new Date().toISOString() };
        localStorage.setItem('notification_history', JSON.stringify(newHistory));
        return newHistory;
      });
    };
    
    updateLastAppOpen();
  }, []); // Empty dependency array - only run once

  // Update behavior data based on current nutrition data - FIXED: Proper dependencies
  useEffect(() => {
    const today = new Date().toDateString();
    
    // Update last log timestamps and today's counts
    const todayFoods = currentDay.foods.filter(f => 
      new Date(f.timestamp).toDateString() === today
    );
    const todayHydration = currentDay.hydration.filter(h => 
      new Date(h.timestamp).toDateString() === today
    );

    const newBehaviorData = { ...behaviorData };
    newBehaviorData.todayMealCount = todayFoods.length;
    newBehaviorData.todayHydrationCount = todayHydration.length;

    if (todayFoods.length > 0) {
      const lastFood = todayFoods[todayFoods.length - 1];
      newBehaviorData.lastFoodLog = lastFood.timestamp.toISOString();
    }

    if (todayHydration.length > 0) {
      const lastHydration = todayHydration[todayHydration.length - 1];
      newBehaviorData.lastHydrationLog = lastHydration.timestamp.toISOString();
    }

    if (currentDay.supplements.length > 0) {
      const lastSupplement = currentDay.supplements[currentDay.supplements.length - 1];
      newBehaviorData.lastSupplementLog = lastSupplement.timestamp.toISOString();
    }

    // Calculate daily completion rate
    const progress = getTodaysProgress();
    const targets = {
      calories: user?.targetCalories || 2000,
      protein: user?.targetProtein || 150,
      hydration: 2000, // ml
      supplements: 3,
    };

    const completionRates = [
      Math.min(progress.calories / targets.calories, 1),
      Math.min(progress.protein / targets.protein, 1),
      Math.min(progress.hydration / targets.hydration, 1),
      Math.min(progress.supplements / targets.supplements, 1),
    ];

    newBehaviorData.dailyCompletionRate = completionRates.reduce((a, b) => a + b, 0) / completionRates.length;

    // Only update if data has changed
    if (JSON.stringify(newBehaviorData) !== JSON.stringify(behaviorData)) {
      setBehaviorData(newBehaviorData);
      localStorage.setItem('behavior_data', JSON.stringify(newBehaviorData));
    }
  }, [currentDay.foods.length, currentDay.hydration.length, currentDay.supplements.length, user?.targetCalories, user?.targetProtein, user?.targetCarbs, user?.targetFat]); // Specific dependencies

  const updatePreferences = useCallback((prefs: Partial<NotificationPreferences>) => {
    setPreferences(prevPrefs => {
      const newPreferences = { ...prevPrefs, ...prefs };
      localStorage.setItem('notification_preferences', JSON.stringify(newPreferences));
      return newPreferences;
    });
  }, []);

  const recordCoachInteraction = useCallback(() => {
    setHistory(prevHistory => {
      const newHistory = { ...prevHistory, lastCoachInteraction: new Date().toISOString() };
      localStorage.setItem('notification_history', JSON.stringify(newHistory));
      return newHistory;
    });
  }, []);

  const requestPushPermission = useCallback(async (): Promise<boolean> => {
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        updatePreferences({ pushEnabled: true });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error requesting push permission:', error);
      return false;
    }
  }, [updatePreferences]);

  const sendNotification = useCallback(async (title: string, body: string, type: string) => {
    const shouldUsePush = !isAppActive && preferences.pushEnabled && 
      (preferences.deliveryMode === 'push' || preferences.deliveryMode === 'both');
    
    const shouldUseToast = isAppActive && 
      (preferences.deliveryMode === 'toast' || preferences.deliveryMode === 'both');

    if (shouldUseToast) {
      if (type === 'milestone' || type === 'encouragement') {
        toast.success(title, { description: body });
      } else if (type === 'reminder' || type === 'reEngagement') {
        toast.info(title, { description: body });
      } else {
        toast(title, { description: body });
      }
    }

    if (shouldUsePush) {
      const token = localStorage.getItem('fcm_token');
      if (token) {
        try {
          await supabase.functions.invoke('send-push-notification', {
            body: {
              token,
              title,
              body,
              data: { type, timestamp: new Date().toISOString() }
            }
          });
          console.log('Push notification sent successfully');
        } catch (error) {
          console.error('Failed to send push notification:', error);
          if (isAppActive) {
            toast.error('Failed to send push notification');
          }
        }
      }
    }
  }, [isAppActive, preferences.pushEnabled, preferences.deliveryMode]);

  const isQuietHours = useCallback(() => {
    const now = new Date();
    const hour = now.getHours();
    const { quietHoursStart, quietHoursEnd } = preferences;
    
    if (quietHoursStart > quietHoursEnd) {
      return hour >= quietHoursStart || hour < quietHoursEnd;
    } else {
      return hour >= quietHoursStart && hour < quietHoursEnd;
    }
  }, [preferences.quietHoursStart, preferences.quietHoursEnd]);

  const shouldSendNotification = useCallback((type: keyof NotificationPreferences, lastSent: string | null, cooldownHours: number) => {
    if (!preferences[type] || isQuietHours()) return false;
    
    if (!lastSent) return true;
    
    const lastSentTime = new Date(lastSent);
    const now = new Date();
    const hoursSinceLastSent = (now.getTime() - lastSentTime.getTime()) / (1000 * 60 * 60);
    
    const multiplier = preferences.frequency === 'low' ? 2 : 1;
    return hoursSinceLastSent >= (cooldownHours * multiplier);
  }, [preferences, isQuietHours]);

  const getHoursSince = useCallback((timestamp: string | null) => {
    if (!timestamp) return Infinity;
    const then = new Date(timestamp);
    const now = new Date();
    return (now.getTime() - then.getTime()) / (1000 * 60 * 60);
  }, []);

  const checkNotifications = useCallback(() => {
    const now = new Date();
    const hour = now.getHours();

    setHistory(prevHistory => {
      const newHistory = { ...prevHistory };
      let hasChanges = false;

      // Smart Coach Notifications - simplified to prevent loops
      if (preferences.mealReminders) {
        const userName = user?.name || 'superstar';
        
        if (hour === 12 && behaviorData.todayMealCount === 0 && 
            shouldSendNotification('mealReminders', prevHistory.lastMealReminder, 6)) {
          sendNotification(
            "🥗 Meal Reminder", 
            `Hey ${userName}, don't forget to log your breakfast and start the day strong!`, 
            "meal-reminder"
          );
          newHistory.lastMealReminder = now.toISOString();
          hasChanges = true;
        }
        
        if (hour === 18 && behaviorData.todayMealCount === 0 && 
            shouldSendNotification('mealReminders', prevHistory.lastMealReminder, 2)) {
          sendNotification(
            "🌇 Evening Check-in", 
            "The day's almost over! Tap here and log what you've had today 💪", 
            "meal-reminder"
          );
          newHistory.lastMealReminder = now.toISOString();
          hasChanges = true;
        }
      }

      // Only update if there are actual changes
      if (hasChanges) {
        localStorage.setItem('notification_history', JSON.stringify(newHistory));
        return newHistory;
      }
      return prevHistory;
    });
  }, [preferences, behaviorData, user, sendNotification, shouldSendNotification]);

  const dismissNotification = useCallback((type: string) => {
    console.log(`Notification dismissed: ${type}`);
  }, []);

  // Check notifications periodically - FIXED: Proper dependencies and debouncing
  useEffect(() => {
    // Debounce notification checks to prevent rapid firing
    const timeoutId = setTimeout(() => {
      checkNotifications();
    }, 1000);

    const interval = setInterval(checkNotifications, 30 * 60 * 1000); // Every 30 minutes
    
    return () => {
      clearTimeout(timeoutId);
      clearInterval(interval);
    };
  }, [checkNotifications]); // Only depend on the memoized checkNotifications

  return (
    <NotificationContext.Provider
      value={{
        preferences,
        history,
        behaviorData,
        updatePreferences,
        checkNotifications,
        dismissNotification,
        requestPushPermission,
        isAppActive,
        recordCoachInteraction,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

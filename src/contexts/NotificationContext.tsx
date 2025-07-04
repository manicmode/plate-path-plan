import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import { useNutrition } from './NutritionContext';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { safeGetJSON, safeSetJSON } from '@/lib/safeStorage';

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

// Safe storage operations using the new safe storage wrapper
const safeLocalStorageGet = (key: string, defaultValue: any) => {
  return safeGetJSON(key, defaultValue);
};

const safeLocalStorageSet = (key: string, value: any) => {
  safeSetJSON(key, value);
};

// Mobile device detection
const isMobileDevice = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  console.log('NotificationProvider initializing...');
  
  const { currentDay, getTodaysProgress } = useNutrition();
  const { user } = useAuth();
  
  // Use refs to prevent unnecessary re-renders
  const initializationRef = useRef(false);
  const lastUpdateRef = useRef<string>('');
  
  const [preferences, setPreferences] = useState<NotificationPreferences>(() => {
    return safeLocalStorageGet('notification_preferences', defaultPreferences);
  });

  const [history, setHistory] = useState<NotificationHistory>(() => {
    return safeLocalStorageGet('notification_history', defaultHistory);
  });

  const [behaviorData, setBehaviorData] = useState<BehaviorData>(() => {
    return safeLocalStorageGet('behavior_data', defaultBehaviorData);
  });

  const [isAppActive, setIsAppActive] = useState(true);

  // Track app visibility with proper cleanup
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isActive = !document.hidden;
      setIsAppActive(isActive);
      console.log('App visibility changed:', isActive ? 'active' : 'inactive');
    };

    const handleFocus = () => {
      setIsAppActive(true);
      console.log('App focused');
    };
    
    const handleBlur = () => {
      setIsAppActive(false);
      console.log('App blurred');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  // Initialize app open timestamp only once
  useEffect(() => {
    if (!initializationRef.current) {
      initializationRef.current = true;
      const timestamp = new Date().toISOString();
      setHistory(prevHistory => {
        const newHistory = { ...prevHistory, lastAppOpen: timestamp };
        safeLocalStorageSet('notification_history', newHistory);
        return newHistory;
      });
      console.log('NotificationProvider initialized');
    }
  }, []);

  // Simplified memoized calculation to prevent unnecessary re-renders
  const nutritionCounts = useMemo(() => {
    try {
      const today = new Date().toDateString();
      const todayFoods = currentDay?.foods?.filter(f => 
        f?.timestamp && new Date(f.timestamp).toDateString() === today
      ) || [];
      const todayHydration = currentDay?.hydration?.filter(h => 
        h?.timestamp && new Date(h.timestamp).toDateString() === today
      ) || [];

      return {
        mealCount: todayFoods.length,
        hydrationCount: todayHydration.length,
        lastFoodLog: todayFoods.length > 0 ? todayFoods[todayFoods.length - 1].timestamp.toISOString() : null,
        lastHydrationLog: todayHydration.length > 0 ? todayHydration[todayHydration.length - 1].timestamp.toISOString() : null,
        lastSupplementLog: currentDay?.supplements?.length > 0 ? currentDay.supplements[currentDay.supplements.length - 1].timestamp.toISOString() : null,
      };
    } catch (error) {
      console.error('Error calculating nutrition counts:', error);
      return {
        mealCount: 0,
        hydrationCount: 0,
        lastFoodLog: null,
        lastHydrationLog: null,
        lastSupplementLog: null,
      };
    }
  }, [currentDay?.foods?.length, currentDay?.hydration?.length, currentDay?.supplements?.length]);

  // Update behavior data with debouncing and error handling
  useEffect(() => {
    // Create a simple key for current data state
    const currentDataKey = `${nutritionCounts.mealCount}-${nutritionCounts.hydrationCount}`;
    
    // Skip if data hasn't actually changed
    if (lastUpdateRef.current === currentDataKey) {
      return;
    }

    const timeoutId = setTimeout(() => {
      console.log('Updating behavior data...');
      
      try {
        const progress = getTodaysProgress();
        const targets = {
          calories: user?.targetCalories || 2000,
          protein: user?.targetProtein || 150,
          hydration: 2000,
          supplements: 3,
        };

        const completionRates = [
          Math.min(progress.calories / targets.calories, 1),
          Math.min(progress.protein / targets.protein, 1),
          Math.min(progress.hydration / targets.hydration, 1),
          Math.min(progress.supplements / targets.supplements, 1),
        ];

        const newBehaviorData: BehaviorData = {
          lastFoodLog: nutritionCounts.lastFoodLog,
          lastHydrationLog: nutritionCounts.lastHydrationLog,
          lastSupplementLog: nutritionCounts.lastSupplementLog,
          todayMealCount: nutritionCounts.mealCount,
          todayHydrationCount: nutritionCounts.hydrationCount,
          dailyCompletionRate: completionRates.reduce((a, b) => a + b, 0) / completionRates.length,
          weeklyPattern: {},
          averageGoalCompletion: {},
        };

        setBehaviorData(newBehaviorData);
        safeLocalStorageSet('behavior_data', newBehaviorData);
        lastUpdateRef.current = currentDataKey;
        
        console.log('Behavior data updated successfully');
      } catch (error) {
        console.error('Error updating behavior data:', error);
      }
    }, 3000); // Increased debounce time for mobile

    return () => clearTimeout(timeoutId);
  }, [nutritionCounts.mealCount, nutritionCounts.hydrationCount, user?.targetCalories, user?.targetProtein, getTodaysProgress]);

  const updatePreferences = useCallback((prefs: Partial<NotificationPreferences>) => {
    console.log('Updating preferences:', prefs);
    setPreferences(prevPrefs => {
      const newPreferences = { ...prevPrefs, ...prefs };
      safeLocalStorageSet('notification_preferences', newPreferences);
      return newPreferences;
    });
  }, []);

  const recordCoachInteraction = useCallback(() => {
    const timestamp = new Date().toISOString();
    setHistory(prevHistory => {
      const newHistory = { ...prevHistory, lastCoachInteraction: timestamp };
      safeLocalStorageSet('notification_history', newHistory);
      return newHistory;
    });
  }, []);

  const requestPushPermission = useCallback(async (): Promise<boolean> => {
    try {
      if (!('Notification' in window)) {
        console.warn('Notifications not supported');
        return false;
      }
      
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
    try {
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
        try {
          const token = safeLocalStorageGet('fcm_token', null);
          if (token) {
            await supabase.functions.invoke('send-push-notification', {
              body: {
                token,
                title,
                body,
                data: { type, timestamp: new Date().toISOString() }
              }
            });
            console.log('Push notification sent successfully');
          }
        } catch (error) {
          console.error('Failed to send push notification:', error);
        }
      }
    } catch (error) {
      console.error('Error in sendNotification:', error);
    }
  }, [isAppActive, preferences.pushEnabled, preferences.deliveryMode]);

  const isQuietHours = useCallback(() => {
    try {
      const now = new Date();
      const hour = now.getHours();
      const { quietHoursStart, quietHoursEnd } = preferences;
      
      if (quietHoursStart > quietHoursEnd) {
        return hour >= quietHoursStart || hour < quietHoursEnd;
      } else {
        return hour >= quietHoursStart && hour < quietHoursEnd;
      }
    } catch (error) {
      console.error('Error checking quiet hours:', error);
      return false;
    }
  }, [preferences.quietHoursStart, preferences.quietHoursEnd]);

  const shouldSendNotification = useCallback((type: keyof NotificationPreferences, lastSent: string | null, cooldownHours: number) => {
    try {
      if (!preferences[type] || isQuietHours()) return false;
      
      if (!lastSent) return true;
      
      const lastSentTime = new Date(lastSent);
      const now = new Date();
      const hoursSinceLastSent = (now.getTime() - lastSentTime.getTime()) / (1000 * 60 * 60);
      
      const multiplier = preferences.frequency === 'low' ? 2 : 1;
      const mobileMultiplier = isMobileDevice() ? 1.5 : 1; // Reduce frequency on mobile
      
      return hoursSinceLastSent >= (cooldownHours * multiplier * mobileMultiplier);
    } catch (error) {
      console.error('Error checking notification timing:', error);
      return false;
    }
  }, [preferences, isQuietHours]);

  const checkNotifications = useCallback(() => {
    try {
      if (!preferences.mealReminders || !isAppActive) {
        return;
      }

      const now = new Date();
      const hour = now.getHours();
      const userName = user?.name || 'superstar';

      // Only check during specific hours to prevent spam
      if (hour === 12 && behaviorData.todayMealCount === 0 && 
          shouldSendNotification('mealReminders', history.lastMealReminder, 6)) {
        
        sendNotification(
          "🥗 Meal Reminder", 
          `Hey ${userName}, don't forget to log your breakfast and start the day strong!`, 
          "meal-reminder"
        );
        
        setHistory(prevHistory => {
          const newHistory = { ...prevHistory, lastMealReminder: now.toISOString() };
          safeLocalStorageSet('notification_history', newHistory);
          return newHistory;
        });
      } else if (hour === 18 && behaviorData.todayMealCount === 0 && 
                 shouldSendNotification('mealReminders', history.lastMealReminder, 2)) {
        
        sendNotification(
          "🌇 Evening Check-in", 
          "The day's almost over! Tap here and log what you've had today 💪", 
          "meal-reminder"
        );
        
        setHistory(prevHistory => {
          const newHistory = { ...prevHistory, lastMealReminder: now.toISOString() };
          safeLocalStorageSet('notification_history', newHistory);
          return newHistory;
        });
      }
    } catch (error) {
      console.error('Error in checkNotifications:', error);
    }
  }, [preferences.mealReminders, isAppActive, behaviorData.todayMealCount, history.lastMealReminder, user?.name, sendNotification, shouldSendNotification]);

  const dismissNotification = useCallback((type: string) => {
    console.log(`Notification dismissed: ${type}`);
  }, []);

  // Check notifications with proper debouncing and mobile optimization
  useEffect(() => {
    const intervalTime = isMobileDevice() ? 2 * 60 * 60 * 1000 : 60 * 60 * 1000; // 2 hours on mobile, 1 hour on desktop
    
    const timeoutId = setTimeout(() => {
      checkNotifications();
    }, 10000); // Initial delay of 10 seconds

    const interval = setInterval(checkNotifications, intervalTime);
    
    return () => {
      clearTimeout(timeoutId);
      clearInterval(interval);
    };
  }, [checkNotifications]);

  const contextValue = useMemo(() => ({
    preferences,
    history,
    behaviorData,
    updatePreferences,
    checkNotifications,
    dismissNotification,
    requestPushPermission,
    isAppActive,
    recordCoachInteraction,
  }), [
    preferences,
    history,
    behaviorData,
    updatePreferences,
    checkNotifications,
    dismissNotification,
    requestPushPermission,
    isAppActive,
    recordCoachInteraction,
  ]);

  console.log('NotificationProvider rendering with context value');

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
};

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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
  milestonesAchieved: string[];
  consecutiveDays: number;
  lastAppOpen: string;
}

export interface BehaviorData {
  lastFoodLog: string | null;
  lastHydrationLog: string | null;
  lastSupplementLog: string | null;
  dailyCompletionRate: number;
  weeklyPattern: { [key: string]: number };
  averageGoalCompletion: { [key: string]: number };
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
  milestonesAchieved: [],
  consecutiveDays: 0,
  lastAppOpen: new Date().toISOString(),
};

const defaultBehaviorData: BehaviorData = {
  lastFoodLog: null,
  lastHydrationLog: null,
  lastSupplementLog: null,
  dailyCompletionRate: 0,
  weeklyPattern: {},
  averageGoalCompletion: {},
};

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const { currentDay, getTodaysProgress } = useNutrition();
  const { user } = useAuth();
  
  const [preferences, setPreferences] = useState<NotificationPreferences>(() => {
    const saved = localStorage.getItem('notification_preferences');
    return saved ? JSON.parse(saved) : defaultPreferences;
  });

  const [history, setHistory] = useState<NotificationHistory>(() => {
    const saved = localStorage.getItem('notification_history');
    return saved ? JSON.parse(saved) : defaultHistory;
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

  // Update app open timestamp
  useEffect(() => {
    const newHistory = { ...history, lastAppOpen: new Date().toISOString() };
    setHistory(newHistory);
    localStorage.setItem('notification_history', JSON.stringify(newHistory));
  }, []);

  // Update behavior data based on current nutrition data
  useEffect(() => {
    const now = new Date().toISOString();
    const newBehaviorData = { ...behaviorData };

    // Update last log timestamps
    if (currentDay.foods.length > 0) {
      const lastFood = currentDay.foods[currentDay.foods.length - 1];
      newBehaviorData.lastFoodLog = lastFood.timestamp.toISOString();
    }

    if (currentDay.hydration.length > 0) {
      const lastHydration = currentDay.hydration[currentDay.hydration.length - 1];
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

    setBehaviorData(newBehaviorData);
    localStorage.setItem('behavior_data', JSON.stringify(newBehaviorData));
  }, [currentDay, user]);

  const updatePreferences = (prefs: Partial<NotificationPreferences>) => {
    const newPreferences = { ...preferences, ...prefs };
    setPreferences(newPreferences);
    localStorage.setItem('notification_preferences', JSON.stringify(newPreferences));
  };

  const requestPushPermission = async (): Promise<boolean> => {
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        // Here you would initialize Firebase and get FCM token
        const token = localStorage.getItem('fcm_token');
        updatePreferences({ pushEnabled: true });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error requesting push permission:', error);
      return false;
    }
  };

  const sendNotification = async (title: string, body: string, type: string) => {
    const shouldUsePush = !isAppActive && preferences.pushEnabled && 
      (preferences.deliveryMode === 'push' || preferences.deliveryMode === 'both');
    
    const shouldUseToast = isAppActive && 
      (preferences.deliveryMode === 'toast' || preferences.deliveryMode === 'both');

    if (shouldUseToast) {
      // Use existing toast system
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
          // Fallback to toast if push fails and app is active
          if (isAppActive) {
            toast.error('Failed to send push notification');
          }
        }
      }
    }
  };

  const isQuietHours = () => {
    const now = new Date();
    const hour = now.getHours();
    const { quietHoursStart, quietHoursEnd } = preferences;
    
    if (quietHoursStart > quietHoursEnd) {
      // Overnight quiet hours (e.g., 22:00 - 07:00)
      return hour >= quietHoursStart || hour < quietHoursEnd;
    } else {
      // Same day quiet hours
      return hour >= quietHoursStart && hour < quietHoursEnd;
    }
  };

  const shouldSendNotification = (type: keyof NotificationPreferences, lastSent: string | null, cooldownHours: number) => {
    if (!preferences[type] || isQuietHours()) return false;
    
    if (!lastSent) return true;
    
    const lastSentTime = new Date(lastSent);
    const now = new Date();
    const hoursSinceLastSent = (now.getTime() - lastSentTime.getTime()) / (1000 * 60 * 60);
    
    const multiplier = preferences.frequency === 'low' ? 2 : 1;
    return hoursSinceLastSent >= (cooldownHours * multiplier);
  };

  const getHoursSince = (timestamp: string | null) => {
    if (!timestamp) return Infinity;
    const then = new Date(timestamp);
    const now = new Date();
    return (now.getTime() - then.getTime()) / (1000 * 60 * 60);
  };

  const checkNotifications = () => {
    const now = new Date().toISOString();
    const newHistory = { ...history };

    // 1. Reminder Notifications
    if (preferences.reminders && shouldSendNotification('reminders', history.lastReminderSent, 24)) {
      const hoursSinceFood = getHoursSince(behaviorData.lastFoodLog);
      const hoursSinceHydration = getHoursSince(behaviorData.lastHydrationLog);
      const hoursSinceSupplement = getHoursSince(behaviorData.lastSupplementLog);

      if (Math.min(hoursSinceFood, hoursSinceHydration, hoursSinceSupplement) >= 8) {
        const messages = [
          "Don't forget to fuel your body! Log your meals when you're ready 🥗",
          "Your nutrition coach is here! Time for a quick check-in? 🌟",
          "Hey there! Just a gentle reminder to stay on track today 💚",
        ];
        const message = messages[Math.floor(Math.random() * messages.length)];
        sendNotification("Gentle Reminder", message, "reminder");
        newHistory.lastReminderSent = now;
      }
    }

    // 2. Milestone Celebrations
    if (preferences.milestones && shouldSendNotification('milestones', history.lastMilestoneCelebrated, 1)) {
      const streakMilestones = [3, 7, 14, 30, 60, 100];
      const currentStreak = newHistory.consecutiveDays;
      
      for (const milestone of streakMilestones) {
        if (currentStreak >= milestone && !history.milestonesAchieved.includes(`streak_${milestone}`)) {
          const messages = {
            3: "You're on fire! 🔥 3-day streak — your coach is impressed!",
            7: "Amazing! 🎉 One week strong — you're building great habits!",
            14: "Two weeks! 🌟 You're officially a nutrition rockstar!",
            30: "30 days! 🏆 You've transformed into a wellness warrior!",
            60: "Two months! 💎 You're absolutely crushing this journey!",
            100: "100 DAYS! 🎊 You're a legend — this is incredible!"
          };
          const message = messages[milestone as keyof typeof messages];
          sendNotification("Milestone Achieved!", message, "milestone");
          newHistory.milestonesAchieved.push(`streak_${milestone}`);
          newHistory.lastMilestoneCelebrated = now;
          break;
        }
      }
    }

    // 3. Progress Suggestions
    if (preferences.progressSuggestions && shouldSendNotification('progressSuggestions', history.lastProgressSuggestion, 72)) {
      const progress = getTodaysProgress();
      const targets = {
        protein: user?.targetProtein || 150,
        hydration: 2000,
      };

      if (progress.protein / targets.protein < 0.5) {
        sendNotification("Progress Tip", "You've been low on protein lately — want help with ideas? 🧠💪", "suggestion");
        newHistory.lastProgressSuggestion = now;
      } else if (progress.hydration / targets.hydration < 0.5) {
        sendNotification("Hydration Reminder", "Hydration looking low — your body will thank you for more water! 💧✨", "suggestion");
        newHistory.lastProgressSuggestion = now;
      }
    }

    // 4. Smart Tips
    if (preferences.smartTips && shouldSendNotification('smartTips', history.lastSmartTip, 120)) {
      const hoursSinceSupplement = getHoursSince(behaviorData.lastSupplementLog);
      const hoursSinceHydration = getHoursSince(behaviorData.lastHydrationLog);

      if (hoursSinceSupplement >= 120) {
        sendNotification("Smart Tip", "Haven't seen any supplements lately — all good? Need a reminder? 💊", "tip");
        newHistory.lastSmartTip = now;
      } else if (hoursSinceHydration >= 120) {
        sendNotification("Hydration Check", "Missing hydration logs? Even small sips count! 💧", "tip");
        newHistory.lastSmartTip = now;
      }
    }

    // 5. Overlimit Alerts
    if (preferences.overlimitAlerts && behaviorData.dailyCompletionRate >= 0.9) {
      const progress = getTodaysProgress();
      const calorieTarget = user?.targetCalories || 2000;
      
      if (progress.calories / calorieTarget >= 1.4 && shouldSendNotification('overlimitAlerts', history.lastOverlimitAlert, 24)) {
        sendNotification("Daily Summary", "Looks like today went a bit over. No worries — tomorrow's a fresh start 🌅", "alert");
        newHistory.lastOverlimitAlert = now;
      }
    }

    // 6. Encouragement
    if (preferences.encouragement && shouldSendNotification('encouragement', history.lastEncouragement, 168)) {
      if (behaviorData.dailyCompletionRate < 0.3) {
        const messages = [
          "Some days are tough — just know you're not alone. 💙",
          "Every small step counts. You've got this! 🌱",
          "Progress isn't always linear. Be kind to yourself today 🤗",
        ];
        const message = messages[Math.floor(Math.random() * messages.length)];
        sendNotification("Encouragement", message, "encouragement");
        newHistory.lastEncouragement = now;
      }
    }

    // 7. Re-engagement
    if (preferences.reEngagement) {
      const hoursSinceLastOpen = getHoursSince(history.lastAppOpen);
      if (hoursSinceLastOpen >= 48 && shouldSendNotification('reEngagement', history.lastReEngagement, 48)) {
        const messages = [
          "Hey friend! We miss you here. Ready to get back on track? 🥦💪",
          "Your wellness journey is waiting for you! Welcome back 🌟",
          "Small steps, big changes. Let's continue your journey! 🚀",
        ];
        const message = messages[Math.floor(Math.random() * messages.length)];
        sendNotification("We Miss You!", message, "reEngagement");
        newHistory.lastReEngagement = now;
      }
    }

    // Update consecutive days logic
    const today = new Date().toDateString();
    const lastLogDate = behaviorData.lastFoodLog ? new Date(behaviorData.lastFoodLog).toDateString() : null;
    
    if (lastLogDate === today && behaviorData.dailyCompletionRate >= 0.7) {
      newHistory.consecutiveDays = Math.max(newHistory.consecutiveDays, 1);
    }

    setHistory(newHistory);
    localStorage.setItem('notification_history', JSON.stringify(newHistory));
  };

  const dismissNotification = (type: string) => {
    console.log(`Notification dismissed: ${type}`);
  };

  // Check notifications periodically
  useEffect(() => {
    const interval = setInterval(checkNotifications, 30 * 60 * 1000); // Every 30 minutes
    checkNotifications(); // Check immediately on mount
    
    return () => clearInterval(interval);
  }, [preferences, behaviorData, history]);

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
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

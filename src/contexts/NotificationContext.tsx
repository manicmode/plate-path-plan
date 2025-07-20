import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { toast } from 'sonner';

interface NotificationPreferences {
  mealReminders: boolean;
  hydrationNudges: boolean;
  consistencyPraise: boolean;
  coachCheckins: boolean;
  progressReflection: boolean;
  reminders: boolean;
  milestones: boolean;
  progressSuggestions: boolean;
  smartTips: boolean;
  overlimitAlerts: boolean;
  encouragement: boolean;
  reEngagement: boolean;
  frequency: 'normal' | 'low';
  deliveryMode: 'toast' | 'push' | 'both';
  pushEnabled: boolean;
  quietHoursStart: number;
  quietHoursEnd: number;
}

interface NotificationContextType {
  notifications: any[];
  preferences: NotificationPreferences;
  addNotification: (notification: any) => void;
  markAsRead: (id: string) => void;
  clearAll: () => void;
  updatePreferences: (updates: Partial<NotificationPreferences>) => void;
  recordCoachInteraction: () => void;
}

const defaultPreferences: NotificationPreferences = {
  mealReminders: true,
  hydrationNudges: true,
  consistencyPraise: true,
  coachCheckins: true,
  progressReflection: true,
  reminders: true,
  milestones: true,
  progressSuggestions: true,
  smartTips: true,
  overlimitAlerts: true,
  encouragement: true,
  reEngagement: true,
  frequency: 'normal',
  deliveryMode: 'both',
  pushEnabled: false,
  quietHoursStart: 22,
  quietHoursEnd: 7,
};

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

// Export alias for backward compatibility
export const useNotifications = useNotification;

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const notificationStartTime = performance.now();
  console.log('🔍 NotificationProvider: Starting initialization at', notificationStartTime.toFixed(2) + 'ms');
  
  const [notifications, setNotifications] = useState<any[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const effectStartTime = performance.now();
    console.log('🔍 NotificationProvider: Effect running at', effectStartTime.toFixed(2) + 'ms');
    
    try {
      // Load preferences from localStorage
      const storageStartTime = performance.now();
      const savedPreferences = localStorage.getItem('notification_preferences');
      if (savedPreferences) {
        const parsed = JSON.parse(savedPreferences);
        setPreferences({ ...defaultPreferences, ...parsed });
      }
      console.log('🔍 NotificationProvider: Storage load completed in', (performance.now() - storageStartTime).toFixed(2) + 'ms');
      
      console.log('🔍 NotificationProvider: Initialized successfully');
      setIsInitialized(true);
      
      const effectEndTime = performance.now();
      console.log('🔍 NotificationProvider: TOTAL EFFECT COMPLETED in', (effectEndTime - effectStartTime).toFixed(2) + 'ms');
    } catch (error) {
      console.error('🔍 NotificationProvider: Initialization failed:', error);
      setIsInitialized(true);
    }

    return () => {
      console.log('🔍 NotificationProvider: Cleanup completed');
    };
  }, []);

  const addNotification = (notification: any) => {
    try {
      console.log('Adding notification:', notification);
      setNotifications(prev => [...prev, { ...notification, id: Date.now().toString() }]);
      
      if (notification.title && notification.body) {
        toast.success(notification.title, {
          description: notification.body,
        });
      }
    } catch (error) {
      console.error('Failed to add notification:', error);
    }
  };

  const markAsRead = (id: string) => {
    try {
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const clearAll = () => {
    try {
      setNotifications([]);
    } catch (error) {
      console.error('Failed to clear notifications:', error);
    }
  };

  const updatePreferences = (updates: Partial<NotificationPreferences>) => {
    try {
      const newPreferences = { ...preferences, ...updates };
      setPreferences(newPreferences);
      localStorage.setItem('notification_preferences', JSON.stringify(newPreferences));
      console.log('Notification preferences updated:', updates);
    } catch (error) {
      console.error('Failed to update notification preferences:', error);
    }
  };

  const recordCoachInteraction = () => {
    try {
      const lastInteraction = Date.now();
      localStorage.setItem('last_coach_interaction', lastInteraction.toString());
      console.log('Coach interaction recorded');
    } catch (error) {
      console.error('Failed to record coach interaction:', error);
    }
  };

  const contextValue: NotificationContextType = {
    notifications,
    preferences,
    addNotification,
    markAsRead,
    clearAll,
    updatePreferences,
    recordCoachInteraction,
  };

  const contextEndTime = performance.now();
  const totalNotificationTime = contextEndTime - notificationStartTime;
  console.log('🔍 NotificationProvider: TOTAL INITIALIZATION COMPLETED in', totalNotificationTime.toFixed(2) + 'ms');

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
};

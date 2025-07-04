
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { toast } from 'sonner';

interface NotificationContextType {
  notifications: any[];
  addNotification: (notification: any) => void;
  markAsRead: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  console.log('NotificationProvider initializing...');
  
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    console.log('NotificationProvider effect running...');
    
    try {
      // Simple initialization without any external dependencies
      console.log('NotificationProvider initialized successfully');
      setIsInitialized(true);
    } catch (error) {
      console.error('NotificationProvider initialization failed:', error);
      setIsInitialized(true); // Still mark as initialized to prevent hanging
    }

    return () => {
      console.log('NotificationProvider cleanup');
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

  const contextValue: NotificationContextType = {
    notifications,
    addNotification,
    markAsRead,
    clearAll,
  };

  console.log('NotificationProvider rendering with context value');

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
};

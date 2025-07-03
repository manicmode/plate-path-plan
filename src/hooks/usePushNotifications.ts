
import { useState, useEffect } from 'react';
import { requestNotificationPermission, onMessageListener } from '@/lib/firebase';
import { toast } from 'sonner';

export const usePushNotifications = () => {
  const [token, setToken] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    setPermission(Notification.permission);
    
    // Check for existing token
    const storedToken = localStorage.getItem('fcm_token');
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  const requestPermission = async () => {
    try {
      const fcmToken = await requestNotificationPermission();
      if (fcmToken) {
        setToken(fcmToken);
        localStorage.setItem('fcm_token', fcmToken);
        setPermission('granted');
        
        // Store token in user profile if needed
        console.log('FCM Token:', fcmToken);
        return fcmToken;
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    }
    return null;
  };

  useEffect(() => {
    const unsubscribe = onMessageListener()
      .then((payload: any) => {
        console.log('Foreground message received:', payload);
        
        // Show toast when app is in foreground
        if (payload.notification) {
          toast.success(payload.notification.title, {
            description: payload.notification.body,
          });
        }
      })
      .catch((err) => console.log('Failed to receive foreground message:', err));

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  return {
    token,
    permission,
    requestPermission,
    hasPermission: permission === 'granted'
  };
};


import { useState, useEffect } from 'react';
import { toast } from 'sonner';

// Mobile detection utility
const isMobileDevice = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

// Check if Firebase FCM is supported
const isFirebaseSupported = () => {
  try {
    // Check if we're in a secure context (required for FCM)
    if (!window.isSecureContext) return false;
    
    // Check if service workers are supported
    if (!('serviceWorker' in navigator)) return false;
    
    // Check if Notification API is supported
    if (!('Notification' in window)) return false;
    
    return true;
  } catch (error) {
    console.log('Firebase support check failed:', error);
    return false;
  }
};

export const usePushNotifications = () => {
  const [token, setToken] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Set initial permission state
    if (typeof Notification !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
    }
    
    // Check if Firebase is supported on this device/browser
    const supported = isFirebaseSupported();
    setIsSupported(supported);
    
    if (!supported) {
      console.log('Push notifications not supported on this device/browser');
      return;
    }

    // Check for existing token only if supported
    const storedToken = localStorage.getItem('fcm_token');
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  const requestPermission = async () => {
    try {
      // Early return if not supported
      if (!isSupported) {
        toast.error('Push notifications are not supported on this device');
        return null;
      }

      // Request notification permission first
      if (typeof Notification === 'undefined') {
        toast.error('Notifications are not supported on this device');
        return null;
      }
      const permission = await Notification.requestPermission();
      setPermission(permission);
      
      if (permission !== 'granted') {
        toast.error('Push notifications were denied');
        return null;
      }

      // Dynamically import Firebase only when needed
      const { requestNotificationPermission } = await import('@/lib/firebase');
      const fcmToken = await requestNotificationPermission();
      
      if (fcmToken) {
        setToken(fcmToken);
        localStorage.setItem('fcm_token', fcmToken);
        
        // Store token in user profile if needed
        console.log('FCM Token:', fcmToken);
        return fcmToken;
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast.error('Failed to enable push notifications');
    }
    return null;
  };

  // Set up message listener only when Firebase is available and supported
  useEffect(() => {
    if (!isSupported || permission !== 'granted') {
      return;
    }

    let cleanup: (() => void) | undefined;

    const setupMessageListener = async () => {
      try {
        const { onMessageListener } = await import('@/lib/firebase');
        
        onMessageListener()
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
      } catch (error) {
        console.error('Failed to setup message listener:', error);
      }
    };

    setupMessageListener();

    return cleanup;
  }, [isSupported, permission]);

  return {
    token,
    permission,
    requestPermission,
    hasPermission: permission === 'granted',
    isSupported
  };
};

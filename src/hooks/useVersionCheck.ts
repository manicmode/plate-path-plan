import { useEffect, useState } from 'react';
import { APP_VERSION } from '@/constants/version';
import { toast } from 'sonner';

export const useVersionCheck = () => {
  const [hasNewVersion, setHasNewVersion] = useState(false);

  useEffect(() => {
    const storedVersion = localStorage.getItem('app_version');
    const currentVersion = APP_VERSION.FULL;

    if (storedVersion && storedVersion !== currentVersion) {
      setHasNewVersion(true);
      
      toast("🚀 New version available!", {
        description: "Tap to refresh and get the latest features",
        action: {
          label: "Refresh",
          onClick: () => {
            localStorage.setItem('app_version', currentVersion);
            window.location.reload();
          }
        },
        duration: 10000,
      });
    } else if (!storedVersion) {
      // First time visitor
      localStorage.setItem('app_version', currentVersion);
    }
  }, []);

  const checkForUpdates = () => {
    try {
      const currentVersion = APP_VERSION.FULL;
      localStorage.setItem('app_version', currentVersion);
      
      // Safely handle service worker updates
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations()
          .then(registrations => {
            console.log('🔍 Found service worker registrations:', registrations.length);
            registrations.forEach((registration, index) => {
              console.log(`🔍 Updating service worker ${index}:`, registration.scope);
              registration.update().catch(error => {
                console.warn(`Service worker ${index} update failed:`, error);
              });
            });
          })
          .catch(error => {
            console.warn('Failed to get service worker registrations:', error);
          });
      }
    } catch (error) {
      console.error('Error in checkForUpdates:', error);
    }
  };

  return { hasNewVersion, checkForUpdates };
};
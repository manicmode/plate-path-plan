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
    const currentVersion = APP_VERSION.FULL;
    localStorage.setItem('app_version', currentVersion);
    
    // Force service worker update if available
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(registration => {
          registration.update();
        });
      });
    }
  };

  return { hasNewVersion, checkForUpdates };
};
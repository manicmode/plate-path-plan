
import { useEffect, useRef } from 'react';

interface AppLifecycleCallbacks {
  onForeground?: () => void;
  onBackground?: () => void;
  onVisibilityChange?: (isVisible: boolean) => void;
}

export const useAppLifecycle = (callbacks: AppLifecycleCallbacks = {}) => {
  const { onForeground, onBackground, onVisibilityChange } = callbacks;
  const wasHiddenRef = useRef(false);

  useEffect(() => {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

    const handleVisibilityChange = () => {
      const isHidden = document.hidden;
      
      if (!wasHiddenRef.current && isHidden) {
        // App going to background
        console.log('App going to background');
        wasHiddenRef.current = true;
        onBackground?.();
      } else if (wasHiddenRef.current && !isHidden) {
        // App coming to foreground
        console.log('App coming to foreground');
        wasHiddenRef.current = false;
        onForeground?.();
      }
      
      onVisibilityChange?.(!isHidden);
    };

    const handleFocus = () => {
      if (wasHiddenRef.current) {
        console.log('Window focused after being hidden');
        wasHiddenRef.current = false;
        onForeground?.();
      }
    };

    const handleBlur = () => {
      if (!document.hidden) {
        console.log('Window blurred');
        wasHiddenRef.current = true;
        onBackground?.();
      }
    };

    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        console.log('Page restored from cache (iOS Safari)');
        onForeground?.();
      }
    };

    const handlePageHide = () => {
      console.log('Page hidden (iOS Safari)');
      onBackground?.();
    };

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    // iOS Safari specific events
    if (isIOS && isSafari) {
      window.addEventListener('pageshow', handlePageShow);
      window.addEventListener('pagehide', handlePageHide);
    }

    // Initial state check
    if (document.hidden) {
      wasHiddenRef.current = true;
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      
      if (isIOS && isSafari) {
        window.removeEventListener('pageshow', handlePageShow);
        window.removeEventListener('pagehide', handlePageHide);
      }
    };
  }, [onForeground, onBackground, onVisibilityChange]);
};

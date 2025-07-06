
import { useState, useEffect } from 'react';

interface AppLifecycleState {
  isVisible: boolean;
  isFocused: boolean;
  wasBackground: boolean;
  timeInBackground: number;
}

export const useAppLifecycle = () => {
  const [state, setState] = useState<AppLifecycleState>({
    isVisible: true,
    isFocused: true,
    wasBackground: false,
    timeInBackground: 0,
  });

  useEffect(() => {
    let backgroundTime = Date.now();

    const handleVisibilityChange = () => {
      const isVisible = !document.hidden;
      const now = Date.now();
      
      console.log('App visibility changed:', { isVisible, timestamp: new Date().toISOString() });
      
      setState(prev => ({
        ...prev,
        isVisible,
        wasBackground: !isVisible || prev.wasBackground,
        timeInBackground: !isVisible ? now : (now - backgroundTime),
      }));

      if (!isVisible) {
        backgroundTime = now;
      }
    };

    const handleFocus = () => {
      console.log('App focused at:', new Date().toISOString());
      setState(prev => ({ ...prev, isFocused: true }));
    };

    const handleBlur = () => {
      console.log('App blurred at:', new Date().toISOString());
      setState(prev => ({ ...prev, isFocused: false }));
    };

    // Mobile-specific lifecycle events
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        console.log('App restored from bfcache');
        setState(prev => ({ ...prev, isVisible: true, isFocused: true }));
      }
    };

    const handlePageHide = () => {
      console.log('App going to bfcache');
      setState(prev => ({ ...prev, isVisible: false, isFocused: false }));
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, []);

  return state;
};

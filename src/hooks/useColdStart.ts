import { useState, useEffect } from 'react';

const COLD_START_KEY = 'voyage_session_active';
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

export const useColdStart = () => {
  const [isColdStart, setIsColdStart] = useState(true);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const checkColdStart = () => {
      try {
        const sessionData = sessionStorage.getItem(COLD_START_KEY);
        const lastActive = localStorage.getItem('last_active');
        const now = Date.now();

        // Check if this is a cold start
        const isCold = !sessionData || 
          !lastActive || 
          (now - parseInt(lastActive)) > SESSION_TIMEOUT;

        setIsColdStart(isCold);

        // Mark session as active
        if (isCold) {
          sessionStorage.setItem(COLD_START_KEY, 'true');
          localStorage.setItem('last_active', now.toString());
        }

        // Minimum display time to ensure splash is visible
        setTimeout(() => {
          setIsReady(true);
        }, 3000); // 3 seconds minimum, splash screen will control the full duration

      } catch (error) {
        console.warn('Cold start detection failed:', error);
        setIsColdStart(false);
        setIsReady(true);
      }
    };

    checkColdStart();

    // Update last active time periodically
    const interval = setInterval(() => {
      try {
        localStorage.setItem('last_active', Date.now().toString());
      } catch (error) {
        // Ignore storage errors
      }
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  const completeSplash = () => {
    setIsColdStart(false);
  };

  return {
    isColdStart: isColdStart && !isReady,
    completeSplash
  };
};
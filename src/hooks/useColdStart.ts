import { useState, useEffect } from 'react';

const COLD_START_KEY = 'voyage_session_active';
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

export const useColdStart = () => {
  const [isColdStart, setIsColdStart] = useState(true);
  const [isReady, setIsReady] = useState(false);
  
  // Mobile detection for enhanced debugging
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  useEffect(() => {
    console.log('🚀 Cold start detection starting...', { 
      isMobile, 
      timestamp: new Date().toISOString() 
    });
    
    const checkColdStart = () => {
      try {
        const sessionData = sessionStorage.getItem(COLD_START_KEY);
        const lastActive = localStorage.getItem('last_active');
        const now = Date.now();

        console.log('🚀 Cold start check:', { 
          hasSessionData: !!sessionData, 
          lastActive: lastActive ? new Date(parseInt(lastActive)).toISOString() : null,
          timeSinceActive: lastActive ? now - parseInt(lastActive) : null,
          isMobile,
          timestamp: new Date().toISOString()
        });

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

        console.log('🚀 Cold start result:', { 
          isColdStart: isCold, 
          isMobile,
          timestamp: new Date().toISOString()
        });

        // Remove artificial hold - navigate immediately when route decision is made
        const minDisplayTime = 0; // No artificial hold
        console.log('[boot] minDisplayTime=', minDisplayTime);
        setTimeout(() => {
          console.log('🚀 Cold start ready timer complete', { 
            isMobile, 
            minDisplayTime,
            timestamp: new Date().toISOString() 
          });
          setIsReady(true);
        }, minDisplayTime);

      } catch (error) {
        console.warn('🚨 Cold start detection failed:', error, { 
          isMobile, 
          timestamp: new Date().toISOString() 
        });
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
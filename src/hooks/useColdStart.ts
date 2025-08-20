import { useState, useEffect } from 'react';
import { useAppReadiness } from './useAppReadiness';

const COLD_START_KEY = 'voyage_session_active';
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

export const useColdStart = () => {
  const [isColdStart, setIsColdStart] = useState(true);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [userInitiatedExit, setUserInitiatedExit] = useState(false);
  
  const { isReady: appReady, status } = useAppReadiness();
  
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
        setSessionChecked(true);

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

      } catch (error) {
        console.warn('🚨 Cold start detection failed:', error, { 
          isMobile, 
          timestamp: new Date().toISOString() 
        });
        setIsColdStart(false);
        setSessionChecked(true);
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

  // Monitor app readiness and auto-complete splash when ready
  useEffect(() => {
    if (!sessionChecked || !isColdStart) return;
    
    if (appReady && status === 'ready') {
      console.log('[cold-start] app ready, can complete splash');
    }
  }, [appReady, status, sessionChecked, isColdStart]);

  const completeSplash = () => {
    console.log('[cold-start] completing splash screen');
    setIsColdStart(false);
  };

  const forceCompleteSplash = () => {
    console.log('[cold-start] force completing splash - user initiated');
    setUserInitiatedExit(true);
    setIsColdStart(false);
  };

  // Only show splash if it's a cold start AND (app not ready OR user hasn't initiated exit)
  const shouldShowSplash = isColdStart && sessionChecked && !userInitiatedExit;

  return {
    isColdStart: shouldShowSplash,
    isAppReady: appReady,
    completeSplash,
    forceCompleteSplash,
    appReadinessStatus: status
  };
};
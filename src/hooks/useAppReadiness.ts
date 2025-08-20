import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth';

export interface AppReadinessState {
  isReady: boolean;
  fontsLoaded: boolean;
  authResolved: boolean;
  criticalResourcesLoaded: boolean;
  status: 'loading' | 'ready' | 'error';
}

export const useAppReadiness = () => {
  const [readinessState, setReadinessState] = useState<AppReadinessState>({
    isReady: false,
    fontsLoaded: false,
    authResolved: false,
    criticalResourcesLoaded: false,
    status: 'loading'
  });

  const { loading: authLoading } = useAuth();

  useEffect(() => {
    console.log('[app-readiness] checking readiness states...');
    
    let fontsReady = false;
    let resourcesReady = false;

    // Check fonts readiness
    const checkFonts = async () => {
      try {
        if (document.fonts && document.fonts.ready) {
          await document.fonts.ready;
          fontsReady = true;
          console.log('[app-readiness] fonts ready');
        } else {
          // Fallback for browsers without font loading API
          setTimeout(() => {
            fontsReady = true;
            console.log('[app-readiness] fonts ready (fallback)');
          }, 200);
        }
      } catch (error) {
        console.warn('[app-readiness] font loading check failed:', error);
        fontsReady = true; // Continue anyway
      }
      updateReadiness();
    };

    // Check critical resources (images, initial data)
    const checkResources = () => {
      // For now, just a small delay to simulate resource loading
      // In a real app, you'd check for critical images, initial API calls, etc.
      setTimeout(() => {
        resourcesReady = true;
        console.log('[app-readiness] critical resources ready');
        updateReadiness();
      }, 100);
    };

    const updateReadiness = () => {
      const authResolved = !authLoading;
      const allReady = fontsReady && authResolved && resourcesReady;

      setReadinessState(prev => ({
        ...prev,
        fontsLoaded: fontsReady,
        authResolved,
        criticalResourcesLoaded: resourcesReady,
        isReady: allReady,
        status: allReady ? 'ready' : 'loading'
      }));

      if (allReady) {
        console.log('[app-readiness] ✅ All systems ready');
      }
    };

    checkFonts();
    checkResources();
    
    // Also update when auth state changes
    updateReadiness();
  }, [authLoading]);

  return readinessState;
};
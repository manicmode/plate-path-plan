import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth';

/**
 * Hook to coordinate splash→home transition atomically
 * Ensures Home is fully ready before hiding splash to prevent white gaps
 */
export const useHomeReady = () => {
  const [homeReady, setHomeReady] = useState(false);
  const { loading: authLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    // Only proceed once auth is resolved
    if (authLoading) return;

    const checkHomeReady = async () => {
      try {
        // Criteria for homeReady:
        // 1. Auth ready
        const authReady = !authLoading && isAuthenticated;
        
        // 2. Fonts ready (prevent FOIT)
        const fontsReady = document.fonts?.ready || Promise.resolve();
        
        await fontsReady;
        
        // 3. Two RAF cycles to ensure layout complete
        await new Promise(resolve => requestAnimationFrame(resolve));
        await new Promise(resolve => requestAnimationFrame(resolve));
        
        if (authReady) {
          console.log('[home] ready criteria met');
          setHomeReady(true);
        }
      } catch (error) {
        console.warn('[home] ready check failed:', error);
        // Fallback to ready after short delay
        setTimeout(() => setHomeReady(true), 500);
      }
    };

    checkHomeReady();
  }, [authLoading, isAuthenticated]);

  return { homeReady };
};
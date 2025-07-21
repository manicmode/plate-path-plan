
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/auth/useAuth';

export const useStableAuth = () => {
  const { user, loading: authLoading } = useAuth();
  const [userReady, setUserReady] = useState(false);
  const userIdRef = useRef<string | null>(null);
  const initializationRef = useRef(false);

  useEffect(() => {
    // Only initialize once when we have a stable user
    if (!initializationRef.current && !authLoading && user?.id) {
      initializationRef.current = true;
      userIdRef.current = user.id;
      setUserReady(true);
    }
    
    // Reset if user changes (logout/login)
    if (user?.id !== userIdRef.current) {
      userIdRef.current = user?.id || null;
      initializationRef.current = false;
      setUserReady(false);
      
      // Set ready again if we have a new user
      if (!authLoading && user?.id) {
        initializationRef.current = true;
        setUserReady(true);
      }
    }
  }, [user?.id, authLoading]);

  return {
    user,
    userReady: userReady && !authLoading,
    authLoading,
    stableUserId: userIdRef.current
  };
};

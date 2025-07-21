
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/auth/useAuth';

export const useStableAuth = () => {
  const { user, loading: authLoading } = useAuth();
  const [userReady, setUserReady] = useState(false);
  const userIdRef = useRef<string | null>(null);
  const profileLoadedRef = useRef(false);

  useEffect(() => {
    // Reset if user changes
    if (user?.id !== userIdRef.current) {
      userIdRef.current = user?.id || null;
      profileLoadedRef.current = false;
      setUserReady(false);
    }

    // User is ready when:
    // 1. Auth is not loading
    // 2. User exists
    // 3. User has email confirmed
    // 4. Profile has loaded at least once
    if (!authLoading && user?.id && user.email && !profileLoadedRef.current) {
      profileLoadedRef.current = true;
      setUserReady(true);
    }
  }, [user?.id, user?.email, authLoading]);

  return {
    user,
    userReady,
    authLoading,
    stableUserId: userIdRef.current
  };
};

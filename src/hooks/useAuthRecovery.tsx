
import { useEffect, useState } from 'react';
import { cleanupAuthState } from '@/lib/authUtils';

interface UseAuthRecoveryOptions {
  isLoading: boolean;
  timeoutMs?: number;
}

export const useAuthRecovery = ({ isLoading, timeoutMs = 5000 }: UseAuthRecoveryOptions) => {
  const [showRecovery, setShowRecovery] = useState(false);
  const [hasTimedOut, setHasTimedOut] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setShowRecovery(false);
      setHasTimedOut(false);
      return;
    }

    const timeoutId = setTimeout(() => {
      console.warn('🚨 Auth loading timeout reached');
      setHasTimedOut(true);
      setShowRecovery(true);
    }, timeoutMs);

    return () => clearTimeout(timeoutId);
  }, [isLoading, timeoutMs]);

  const handleRecovery = () => {
    console.log('🔧 Initiating auth recovery...');
    cleanupAuthState();
    setShowRecovery(false);
    setHasTimedOut(false);
    // Force page reload to reset auth state
    window.location.reload();
  };

  return {
    showRecovery,
    hasTimedOut,
    handleRecovery,
  };
};

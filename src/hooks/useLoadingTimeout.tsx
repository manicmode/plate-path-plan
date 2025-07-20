
import { useEffect, useState } from 'react';
import { cleanupAuthState } from '@/lib/authUtils';

interface UseLoadingTimeoutOptions {
  timeoutMs?: number;
  onTimeout?: () => void;
}

export const useLoadingTimeout = (
  isLoading: boolean,
  options: UseLoadingTimeoutOptions = {}
) => {
  const { timeoutMs = 5000, onTimeout } = options;
  const [hasTimedOut, setHasTimedOut] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setHasTimedOut(false);
      setShowRecovery(false);
      return;
    }

    const timeoutId = setTimeout(() => {
      console.warn('⏰ Loading timeout reached');
      setHasTimedOut(true);
      setShowRecovery(true);
      onTimeout?.();
    }, timeoutMs);

    return () => clearTimeout(timeoutId);
  }, [isLoading, timeoutMs, onTimeout]);

  const retry = () => {
    console.log('🔄 Retrying loading...');
    setHasTimedOut(false);
    setShowRecovery(false);
  };

  const forceSkip = () => {
    console.log('⏭️ Force skipping loading...');
    cleanupAuthState();
    setHasTimedOut(false);
    setShowRecovery(false);
    window.location.reload();
  };

  return {
    hasTimedOut,
    showRecovery,
    retry,
    forceSkip,
  };
};

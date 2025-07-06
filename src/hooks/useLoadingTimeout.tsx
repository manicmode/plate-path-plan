
import { useEffect, useState } from 'react';

interface UseLoadingTimeoutOptions {
  timeoutMs?: number;
  onTimeout?: () => void;
}

export const useLoadingTimeout = (
  isLoading: boolean,
  options: UseLoadingTimeoutOptions = {}
) => {
  const { timeoutMs = 10000, onTimeout } = options;
  const [hasTimedOut, setHasTimedOut] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setHasTimedOut(false);
      setShowRecovery(false);
      return;
    }

    const timeoutId = setTimeout(() => {
      console.warn('Loading timeout reached');
      setHasTimedOut(true);
      setShowRecovery(true);
      onTimeout?.();
    }, timeoutMs);

    return () => clearTimeout(timeoutId);
  }, [isLoading, timeoutMs, onTimeout]);

  const retry = () => {
    setHasTimedOut(false);
    setShowRecovery(false);
  };

  return {
    hasTimedOut,
    showRecovery,
    retry,
  };
};

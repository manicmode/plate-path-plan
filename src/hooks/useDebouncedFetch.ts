
import { useCallback, useRef } from 'react';

export const useDebouncedFetch = (fetchFn: () => Promise<void>, delay: number = 200) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  const debouncedFetch = useCallback(async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(async () => {
      if (isMountedRef.current) {
        await fetchFn();
      }
    }, delay);
  }, [fetchFn, delay]);

  const cleanup = useCallback(() => {
    isMountedRef.current = false;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  return { debouncedFetch, cleanup };
};

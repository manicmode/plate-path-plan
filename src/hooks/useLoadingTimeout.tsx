
import { useState, useEffect, useRef } from 'react';

export const useLoadingTimeout = (initialLoading: boolean = true, timeoutMs: number = 10000) => {
  const [isLoading, setIsLoading] = useState(initialLoading);
  const [hasTimedOut, setHasTimedOut] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const startTimeRef = useRef<number>(Date.now());

  const setLoading = (loading: boolean) => {
    console.log('Loading state changed:', { loading, elapsed: Date.now() - startTimeRef.current });
    
    if (loading) {
      startTimeRef.current = Date.now();
      setHasTimedOut(false);
      
      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // Set new timeout
      timeoutRef.current = setTimeout(() => {
        console.warn('Loading timeout reached after', timeoutMs, 'ms');
        setHasTimedOut(true);
        setIsLoading(false);
      }, timeoutMs);
    } else {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = undefined;
      }
    }
    
    setIsLoading(loading);
  };

  const retry = () => {
    console.log('Retrying after timeout');
    setHasTimedOut(false);
    setLoading(true);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { isLoading, hasTimedOut, setLoading, retry };
};

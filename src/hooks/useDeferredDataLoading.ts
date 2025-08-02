import { useEffect, useState, useRef } from 'react';

interface DeferredDataLoadingOptions {
  /** Delay in milliseconds before starting data loading (default: 100ms) */
  delay?: number;
  /** Whether to defer loading until component has mounted and rendered */
  deferUntilMounted?: boolean;
  /** Whether the component is in a critical loading path */
  priority?: 'high' | 'medium' | 'low';
}

/**
 * Hook to defer heavy data loading until after critical UI rendering is complete
 */
export const useDeferredDataLoading = (options: DeferredDataLoadingOptions = {}) => {
  const {
    delay = 100,
    deferUntilMounted = true,
    priority = 'medium'
  } = options;

  const [shouldLoad, setShouldLoad] = useState(!deferUntilMounted);
  const [isReady, setIsReady] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    
    // For high priority, start loading immediately
    if (priority === 'high') {
      setShouldLoad(true);
      setIsReady(true);
      return;
    }

    // For medium and low priority, defer loading
    const actualDelay = priority === 'low' ? Math.max(delay, 200) : delay;
    
    timeoutRef.current = setTimeout(() => {
      if (mountedRef.current) {
        setShouldLoad(true);
        setIsReady(true);
      }
    }, actualDelay);

    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [delay, priority]);

  // Function to manually trigger loading (for user interactions)
  const triggerLoad = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setShouldLoad(true);
    setIsReady(true);
  };

  return {
    shouldLoad,
    isReady,
    triggerLoad,
    isMounted: mountedRef.current
  };
};

/**
 * Hook specifically for deferring heavy API calls in the Home component
 */
export const useDeferredHomeDataLoading = () => {
  return useDeferredDataLoading({
    delay: 50,
    deferUntilMounted: true,
    priority: 'medium'
  });
};

/**
 * Hook for critical data that should load immediately but with a small defer to not block initial render
 */
export const useCriticalDataLoading = () => {
  return useDeferredDataLoading({
    delay: 50,
    deferUntilMounted: true,
    priority: 'high'
  });
};

/**
 * Hook for non-critical data that can wait longer
 */
export const useNonCriticalDataLoading = () => {
  return useDeferredDataLoading({
    delay: 300,
    deferUntilMounted: true,
    priority: 'low'
  });
};
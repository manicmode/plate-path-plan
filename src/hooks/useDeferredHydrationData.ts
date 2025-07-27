import { useState, useEffect } from 'react';
import { useRealHydrationData } from './useRealHydrationData';
import { useDeferredHomeDataLoading } from './useDeferredDataLoading';

/**
 * Wrapper hook for useRealHydrationData that defers loading until after initial render
 */
export const useDeferredHydrationData = () => {
  const { shouldLoad } = useDeferredHomeDataLoading();
  const [shouldStartLoading, setShouldStartLoading] = useState(false);

  // Start loading when deferred loading is ready
  useEffect(() => {
    if (shouldLoad && !shouldStartLoading) {
      setShouldStartLoading(true);
    }
  }, [shouldLoad, shouldStartLoading]);

  // Return loading state until ready to load
  const { todayTotal, weeklyData, isLoading } = useRealHydrationData();

  // If we haven't started loading yet, return loading state
  if (!shouldStartLoading) {
    return {
      todayTotal: 0,
      weeklyData: [],
      isLoading: true
    };
  }

  return {
    todayTotal,
    weeklyData,
    isLoading
  };
};
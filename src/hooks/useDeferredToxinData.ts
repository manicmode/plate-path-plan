import { useState, useEffect } from 'react';
import { useRealToxinData } from './useRealToxinData';
import { useNonCriticalDataLoading } from './useDeferredDataLoading';

/**
 * Wrapper hook for useRealToxinData that defers loading until after other data has loaded
 */
export const useDeferredToxinData = () => {
  const { shouldLoad } = useNonCriticalDataLoading();
  const [shouldStartLoading, setShouldStartLoading] = useState(false);

  // Start loading when non-critical loading is ready
  useEffect(() => {
    if (shouldLoad && !shouldStartLoading) {
      setShouldStartLoading(true);
    }
  }, [shouldLoad, shouldStartLoading]);

  // Return loading state until ready to load
  const { toxinData, todayFlaggedCount, isLoading } = useRealToxinData();

  // If we haven't started loading yet, return empty state
  if (!shouldStartLoading) {
    return {
      toxinData: [],
      todayFlaggedCount: 0,
      isLoading: true
    };
  }

  return {
    toxinData,
    todayFlaggedCount,
    isLoading
  };
};
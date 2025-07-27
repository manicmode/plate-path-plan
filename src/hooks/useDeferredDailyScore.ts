import { useState, useEffect } from 'react';
import { useDailyScore } from './useDailyScore';
import { useDeferredHomeDataLoading } from './useDeferredDataLoading';

/**
 * Wrapper hook for useDailyScore that defers loading until after initial render
 */
export const useDeferredDailyScore = () => {
  const { shouldLoad } = useDeferredHomeDataLoading();
  const [shouldStartLoading, setShouldStartLoading] = useState(false);

  // Start loading when deferred loading is ready
  useEffect(() => {
    if (shouldLoad && !shouldStartLoading) {
      setShouldStartLoading(true);
    }
  }, [shouldLoad, shouldStartLoading]);

  // Return loading state until ready to load
  const { todayScore, scoreStats, loading } = useDailyScore();

  // If we haven't started loading yet, return loading state
  if (!shouldStartLoading) {
    return {
      todayScore: null,
      scoreStats: null,
      loading: true
    };
  }

  return {
    todayScore,
    scoreStats,
    loading
  };
};
import { useState, useEffect } from 'react';
import { usePrivateChallenges } from './usePrivateChallenges';

export const useSafePrivateChallenges = () => {
  const [safeData, setSafeData] = useState({
    userActiveChallenges: [],
    challengesWithParticipation: [],
    loading: false
  });

  try {
    const data = usePrivateChallenges();
    
    useEffect(() => {
      setSafeData({
        userActiveChallenges: Array.isArray(data.userActiveChallenges) ? data.userActiveChallenges : [],
        challengesWithParticipation: Array.isArray(data.challengesWithParticipation) ? data.challengesWithParticipation : [],
        loading: Boolean(data.loading)
      });
    }, [data.userActiveChallenges, data.challengesWithParticipation, data.loading]);

    return {
      ...safeData,
      updatePrivateProgress: data.updatePrivateProgress || (() => Promise.resolve()),
      refreshData: data.refreshData || (() => Promise.resolve())
    };
  } catch (error) {
    console.warn('usePrivateChallenges failed, using safe fallback:', error);
    return {
      userActiveChallenges: [],
      challengesWithParticipation: [],
      loading: false,
      updatePrivateProgress: () => Promise.resolve(),
      refreshData: () => Promise.resolve()
    };
  }
};
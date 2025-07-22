import { useState, useEffect } from 'react';
import { usePublicChallenges } from './usePublicChallenges';

export const useSafePublicChallenges = () => {
  const [safeData, setSafeData] = useState({
    challenges: [],
    userParticipations: [],
    loading: false
  });

  try {
    const data = usePublicChallenges();
    
    useEffect(() => {
      setSafeData({
        challenges: Array.isArray(data.challenges) ? data.challenges : [],
        userParticipations: Array.isArray(data.userParticipations) ? data.userParticipations : [],
        loading: Boolean(data.loading)
      });
    }, [data.challenges, data.userParticipations, data.loading]);

    // Return all original functions with safe fallbacks
    return {
      ...safeData,
      joinChallenge: data.joinChallenge || (() => Promise.resolve(false)),
      updateProgress: data.updateProgress || (() => Promise.resolve(false)),
      leaveChallenge: data.leaveChallenge || (() => Promise.resolve(false)),
      getUserParticipation: data.getUserParticipation || (() => null)
    };
  } catch (error) {
    console.warn('usePublicChallenges failed, using safe fallback:', error);
    return {
      challenges: [],
      userParticipations: [], 
      loading: false,
      joinChallenge: () => Promise.resolve(false),
      updateProgress: () => Promise.resolve(false),
      leaveChallenge: () => Promise.resolve(false),
      getUserParticipation: () => null
    };
  }
};
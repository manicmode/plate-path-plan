import { useState, useEffect } from 'react';
import { useSmartFriendRecommendations } from './useSmartFriendRecommendations';

export const useSafeFriendRecommendations = () => {
  const [safeData, setSafeData] = useState({
    friends: [],
    isLoading: false
  });

  try {
    const data = useSmartFriendRecommendations();
    
    useEffect(() => {
      setSafeData({
        friends: Array.isArray(data.friends) ? data.friends : [],
        isLoading: Boolean(data.isLoading)
      });
    }, [data.friends, data.isLoading]);

    return safeData;
  } catch (error) {
    console.warn('useSmartFriendRecommendations failed, using safe fallback:', error);
    return {
      friends: [],
      isLoading: false
    };
  }
};
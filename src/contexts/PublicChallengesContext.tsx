
import React, { createContext, useContext, useState, ReactNode, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/auth';
import { usePublicChallenges } from '@/hooks/usePublicChallenges';

interface PublicChallenge {
  id: string;
  title: string;
  description: string;
  goalDescription: string;
  durationDays: number;
  targetValue: number | null;
  targetUnit: string | null;
  participantCount: number;
  difficulty: string;
  category: string;
  badgeIcon: string;
  isTrending: boolean;
  isNew: boolean;
  isActive: boolean;
}

interface ChallengeFilters {
  category: string;
  difficulty: string;
  duration: 'all' | 'quick' | 'standard' | 'long';
  trending: boolean;
  new: boolean;
}

interface PublicChallengesContextType {
  // Challenge lists (memoized)
  allChallenges: PublicChallenge[];
  quickChallenges: PublicChallenge[];
  globalChallenges: PublicChallenge[];
  trendingChallenges: PublicChallenge[];
  newChallenges: PublicChallenge[];
  
  // Filtered challenges
  filteredChallenges: PublicChallenge[];
  
  // Filter state
  filters: ChallengeFilters;
  setFilters: (filters: Partial<ChallengeFilters>) => void;
  resetFilters: () => void;
  
  // Actions
  joinChallenge: (challengeId: string) => Promise<boolean>;
  leaveChallenge: (challengeId: string) => Promise<boolean>;
  refreshChallenges: () => void;
  
  // State
  loading: boolean;
  error: string | null;
  
  // User participation data
  getUserParticipation: (challengeId: string) => any;
}

const PublicChallengesContext = createContext<PublicChallengesContextType | undefined>(undefined);

export const usePublicChallengesContext = () => {
  const context = useContext(PublicChallengesContext);
  if (!context) {
    throw new Error('usePublicChallengesContext must be used within a PublicChallengesProvider');
  }
  return context;
};

const defaultFilters: ChallengeFilters = {
  category: 'all',
  difficulty: 'all',
  duration: 'all',
  trending: false,
  new: false,
};

interface PublicChallengesProviderProps {
  children: ReactNode;
}

export const PublicChallengesProvider: React.FC<PublicChallengesProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<ChallengeFilters>(defaultFilters);

  console.log('PublicChallengesProvider: Initializing with user:', user?.id);

  const publicChallengesHook = usePublicChallenges();
  
  const {
    globalChallenges: rawGlobalChallenges = [],
    quickChallenges: rawQuickChallenges = [],
    trendingChallenges: rawTrendingChallenges = [],
    newChallenges: rawNewChallenges = [],
    joinChallenge: originalJoinChallenge,
    leaveChallenge: originalLeaveChallenge,
    updateProgress,
    getUserParticipation,
    loading = false,
    refreshData
  } = publicChallengesHook || {};

  // Clear error when data loads successfully
  useEffect(() => {
    if (rawGlobalChallenges.length > 0 || rawQuickChallenges.length > 0) {
      setError(null);
    }
  }, [rawGlobalChallenges.length, rawQuickChallenges.length]);

  // Safe challenge conversion helper
  const convertChallenge = useCallback((challenge: any): PublicChallenge | null => {
    try {
      if (!challenge || !challenge.id) return null;
      
      return {
        id: challenge.id,
        title: challenge.title || 'Untitled Challenge',
        description: challenge.description || '',
        goalDescription: challenge.goal_description || '',
        durationDays: challenge.duration_days || 0,
        targetValue: challenge.target_value,
        targetUnit: challenge.target_unit,
        participantCount: challenge.participant_count || 0,
        difficulty: challenge.difficulty_level || 'beginner',
        category: challenge.category || 'general',
        badgeIcon: challenge.badge_icon || '🏆',
        isTrending: challenge.is_trending || false,
        isNew: challenge.is_new || false,
        isActive: challenge.is_active !== false,
      };
    } catch (err) {
      console.warn('Error converting challenge:', challenge?.id, err);
      return null;
    }
  }, []);

  // Memoized challenge conversions with error handling
  const allChallenges = useMemo(() => {
    try {
      console.log('PublicChallengesProvider: Converting challenges', {
        globalCount: rawGlobalChallenges.length,
        quickCount: rawQuickChallenges.length
      });

      const combinedChallenges = [...(rawGlobalChallenges || []), ...(rawQuickChallenges || [])];
      const converted = combinedChallenges
        .map(convertChallenge)
        .filter((challenge): challenge is PublicChallenge => challenge !== null);
      
      console.log('PublicChallengesProvider: Converted challenges:', converted.length);
      return converted;
    } catch (err) {
      console.error('Error processing all challenges:', err);
      setError('Failed to load challenges');
      return [];
    }
  }, [rawGlobalChallenges, rawQuickChallenges, convertChallenge]);

  const quickChallenges = useMemo(() => {
    try {
      return (rawQuickChallenges || [])
        .map(convertChallenge)
        .filter((challenge): challenge is PublicChallenge => challenge !== null);
    } catch (err) {
      console.error('Error processing quick challenges:', err);
      return [];
    }
  }, [rawQuickChallenges, convertChallenge]);

  const globalChallenges = useMemo(() => {
    try {
      return (rawGlobalChallenges || [])
        .map(convertChallenge)
        .filter((challenge): challenge is PublicChallenge => challenge !== null);
    } catch (err) {
      console.error('Error processing global challenges:', err);
      return [];
    }
  }, [rawGlobalChallenges, convertChallenge]);

  const trendingChallenges = useMemo(() => {
    try {
      return (rawTrendingChallenges || [])
        .map(convertChallenge)
        .filter((challenge): challenge is PublicChallenge => challenge !== null);
    } catch (err) {
      console.error('Error processing trending challenges:', err);
      return [];
    }
  }, [rawTrendingChallenges, convertChallenge]);

  const newChallenges = useMemo(() => {
    try {
      return (rawNewChallenges || [])
        .map(convertChallenge)
        .filter((challenge): challenge is PublicChallenge => challenge !== null);
    } catch (err) {
      console.error('Error processing new challenges:', err);
      return [];
    }
  }, [rawNewChallenges, convertChallenge]);

  // Memoized filtered challenges with error handling
  const filteredChallenges = useMemo(() => {
    try {
      let filtered = allChallenges;

      if (filters.category !== 'all') {
        filtered = filtered.filter(challenge => challenge.category === filters.category);
      }

      if (filters.difficulty !== 'all') {
        filtered = filtered.filter(challenge => challenge.difficulty === filters.difficulty);
      }

      if (filters.duration !== 'all') {
        switch (filters.duration) {
          case 'quick':
            filtered = filtered.filter(challenge => challenge.durationDays <= 3);
            break;
          case 'standard':
            filtered = filtered.filter(challenge => challenge.durationDays > 3 && challenge.durationDays <= 14);
            break;
          case 'long':
            filtered = filtered.filter(challenge => challenge.durationDays > 14);
            break;
        }
      }

      if (filters.trending) {
        filtered = filtered.filter(challenge => challenge.isTrending);
      }

      if (filters.new) {
        filtered = filtered.filter(challenge => challenge.isNew);
      }

      return filtered;
    } catch (err) {
      console.error('Error filtering challenges:', err);
      return allChallenges;
    }
  }, [allChallenges, filters]);

  // Optimized action handlers with error handling
  const joinChallenge = useCallback(async (challengeId: string) => {
    try {
      setError(null);
      return await originalJoinChallenge?.(challengeId) || false;
    } catch (err) {
      console.error('Error joining challenge:', err);
      setError('Failed to join challenge');
      return false;
    }
  }, [originalJoinChallenge]);

  const leaveChallenge = useCallback(async (challengeId: string) => {
    try {
      setError(null);
      return await originalLeaveChallenge?.(challengeId) || false;
    } catch (err) {
      console.error('Error leaving challenge:', err);
      setError('Failed to leave challenge');
      return false;
    }
  }, [originalLeaveChallenge]);

  const setFilters = useCallback((newFilters: Partial<ChallengeFilters>) => {
    try {
      setFiltersState(prev => ({ ...prev, ...newFilters }));
    } catch (err) {
      console.error('Error setting filters:', err);
    }
  }, []);

  const resetFilters = useCallback(() => {
    try {
      setFiltersState(defaultFilters);
    } catch (err) {
      console.error('Error resetting filters:', err);
    }
  }, []);

  const refreshChallenges = useCallback(() => {
    try {
      setError(null);
      console.log('PublicChallengesProvider: Refreshing challenges');
      refreshData?.();
    } catch (err) {
      console.error('Error refreshing challenges:', err);
      setError('Failed to refresh challenges');
    }
  }, [refreshData]);

  const value: PublicChallengesContextType = {
    allChallenges,
    quickChallenges,
    globalChallenges,
    trendingChallenges,
    newChallenges,
    filteredChallenges,
    filters,
    setFilters,
    resetFilters,
    joinChallenge,
    leaveChallenge,
    refreshChallenges,
    loading,
    error,
    getUserParticipation: getUserParticipation || (() => null),
  };

  console.log('PublicChallengesProvider: Providing context value', {
    allCount: allChallenges.length,
    filteredCount: filteredChallenges.length,
    loading: value.loading,
    error: value.error
  });

  return (
    <PublicChallengesContext.Provider value={value}>
      {children}
    </PublicChallengesContext.Provider>
  );
};

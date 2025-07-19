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
  const {
    globalChallenges: rawGlobalChallenges,
    quickChallenges: rawQuickChallenges,
    trendingChallenges: rawTrendingChallenges,
    newChallenges: rawNewChallenges,
    joinChallenge: originalJoinChallenge,
    leaveChallenge: originalLeaveChallenge,
    updateProgress,
    getUserParticipation,
    loading,
    refreshData
  } = usePublicChallenges();

  const [filters, setFiltersState] = useState<ChallengeFilters>(defaultFilters);

  // Memoized challenge conversions to prevent unnecessary re-renders
  const allChallenges = useMemo(() => {
    const combinedChallenges = [...rawGlobalChallenges, ...rawQuickChallenges];
    return combinedChallenges.map(challenge => ({
      id: challenge.id,
      title: challenge.title,
      description: challenge.description,
      goalDescription: challenge.goal_description,
      durationDays: challenge.duration_days,
      targetValue: challenge.target_value,
      targetUnit: challenge.target_unit,
      participantCount: challenge.participant_count,
      difficulty: challenge.difficulty_level,
      category: challenge.category,
      badgeIcon: challenge.badge_icon,
      isTrending: challenge.is_trending,
      isNew: challenge.is_new,
      isActive: challenge.is_active,
    }));
  }, [rawGlobalChallenges, rawQuickChallenges]);

  const quickChallenges = useMemo(() => 
    rawQuickChallenges.map(challenge => ({
      id: challenge.id,
      title: challenge.title,
      description: challenge.description,
      goalDescription: challenge.goal_description,
      durationDays: challenge.duration_days,
      targetValue: challenge.target_value,
      targetUnit: challenge.target_unit,
      participantCount: challenge.participant_count,
      difficulty: challenge.difficulty_level,
      category: challenge.category,
      badgeIcon: challenge.badge_icon,
      isTrending: challenge.is_trending,
      isNew: challenge.is_new,
      isActive: challenge.is_active,
    })),
    [rawQuickChallenges]
  );

  const globalChallenges = useMemo(() => 
    rawGlobalChallenges.map(challenge => ({
      id: challenge.id,
      title: challenge.title,
      description: challenge.description,
      goalDescription: challenge.goal_description,
      durationDays: challenge.duration_days,
      targetValue: challenge.target_value,
      targetUnit: challenge.target_unit,
      participantCount: challenge.participant_count,
      difficulty: challenge.difficulty_level,
      category: challenge.category,
      badgeIcon: challenge.badge_icon,
      isTrending: challenge.is_trending,
      isNew: challenge.is_new,
      isActive: challenge.is_active,
    })),
    [rawGlobalChallenges]
  );

  const trendingChallenges = useMemo(() => 
    rawTrendingChallenges.map(challenge => ({
      id: challenge.id,
      title: challenge.title,
      description: challenge.description,
      goalDescription: challenge.goal_description,
      durationDays: challenge.duration_days,
      targetValue: challenge.target_value,
      targetUnit: challenge.target_unit,
      participantCount: challenge.participant_count,
      difficulty: challenge.difficulty_level,
      category: challenge.category,
      badgeIcon: challenge.badge_icon,
      isTrending: challenge.is_trending,
      isNew: challenge.is_new,
      isActive: challenge.is_active,
    })),
    [rawTrendingChallenges]
  );

  const newChallenges = useMemo(() => 
    rawNewChallenges.map(challenge => ({
      id: challenge.id,
      title: challenge.title,
      description: challenge.description,
      goalDescription: challenge.goal_description,
      durationDays: challenge.duration_days,
      targetValue: challenge.target_value,
      targetUnit: challenge.target_unit,
      participantCount: challenge.participant_count,
      difficulty: challenge.difficulty_level,
      category: challenge.category,
      badgeIcon: challenge.badge_icon,
      isTrending: challenge.is_trending,
      isNew: challenge.is_new,
      isActive: challenge.is_active,
    })),
    [rawNewChallenges]
  );

  // Memoized filtered challenges
  const filteredChallenges = useMemo(() => {
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
  }, [allChallenges, filters]);

  // Optimized action handlers with useCallback to prevent re-renders
  const joinChallenge = useCallback(async (challengeId: string) => {
    return await originalJoinChallenge(challengeId);
  }, [originalJoinChallenge]);

  const leaveChallenge = useCallback(async (challengeId: string) => {
    return await originalLeaveChallenge(challengeId);
  }, [originalLeaveChallenge]);

  const setFilters = useCallback((newFilters: Partial<ChallengeFilters>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
  }, []);

  const resetFilters = useCallback(() => {
    setFiltersState(defaultFilters);
  }, []);

  const refreshChallenges = useCallback(() => {
    refreshData();
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
    getUserParticipation,
  };

  return (
    <PublicChallengesContext.Provider value={value}>
      {children}
    </PublicChallengesContext.Provider>
  );
};
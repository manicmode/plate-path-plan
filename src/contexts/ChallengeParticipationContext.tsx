
import React, { createContext, useContext, useState, ReactNode, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/auth';
import { usePublicChallenges } from '@/hooks/usePublicChallenges';
import { usePrivateChallenges } from '@/hooks/usePrivateChallenges';

interface ParticipationData {
  challengeId: string;
  challengeName: string;
  challengeType: 'public' | 'private';
  startDate: Date;
  endDate: Date;
  currentProgress: number;
  completionPercentage: number;
  streakCount: number;
  bestStreak: number;
  isCompleted: boolean;
  daysRemaining: number;
  lastProgressUpdate?: Date;
}

interface ProgressUpdate {
  challengeId: string;
  value: number;
  notes?: string;
}

interface ChallengeParticipationContextType {
  // Participation data
  userParticipations: ParticipationData[];
  publicParticipations: ParticipationData[];
  privateParticipations: ParticipationData[];
  
  // Progress actions
  updateProgress: (update: ProgressUpdate) => Promise<boolean>;
  markDayComplete: (challengeId: string, date?: Date) => Promise<boolean>;
  
  // Participation management
  leaveChallenge: (challengeId: string) => Promise<boolean>;
  joinChallenge: (challengeId: string) => Promise<boolean>;
  
  // Streak management
  getCurrentStreak: (challengeId: string) => number;
  getBestStreak: (challengeId: string) => number;
  
  // Progress calculations
  getDailyProgress: (challengeId: string, date?: Date) => number;
  getWeeklyProgress: (challengeId: string) => number[];
  getOverallProgress: () => number;
  
  // State
  loading: boolean;
  error: string | null;
  refreshParticipations: () => void;
  
  // Selectors (to prevent cascade re-renders)
  getParticipation: (challengeId: string) => ParticipationData | undefined;
  getParticipationsByType: (type: 'public' | 'private') => ParticipationData[];
}

const ChallengeParticipationContext = createContext<ChallengeParticipationContextType | undefined>(undefined);

export const useChallengeParticipation = () => {
  const context = useContext(ChallengeParticipationContext);
  if (!context) {
    throw new Error('useChallengeParticipation must be used within a ChallengeParticipationProvider');
  }
  return context;
};

interface ChallengeParticipationProviderProps {
  children: ReactNode;
}

export const ChallengeParticipationProvider: React.FC<ChallengeParticipationProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [error, setError] = useState<string | null>(null);

  console.log('ChallengeParticipationProvider: Initializing with user:', user?.id);

  const publicChallengesHook = usePublicChallenges();
  const privateChallengesHook = usePrivateChallenges();

  const {
    challenges: publicChallenges = [],
    userParticipations: rawPublicParticipations = [],
    updateProgress: updatePublicProgress,
    leaveChallenge: leavePublicChallenge,
    joinChallenge: joinPublicChallenge,
    loading: publicLoading = false,
    refreshData: refreshPublic
  } = publicChallengesHook || {};

  const {
    challengesWithParticipation: privateChallenges = [],
    updatePrivateProgress,
    loading: privateLoading = false,
    refreshData: refreshPrivate
  } = privateChallengesHook || {};

  // Clear error when data loads successfully
  useEffect(() => {
    if (rawPublicParticipations.length > 0 || privateChallenges.length > 0) {
      setError(null);
    }
  }, [rawPublicParticipations.length, privateChallenges.length]);

  // Safe participation conversion helper
  const convertPublicParticipation = useCallback((participation: any, challenge: any): ParticipationData | null => {
    try {
      if (!participation || !challenge) return null;

      return {
        challengeId: participation.challenge_id,
        challengeName: challenge.title || 'Untitled Challenge',
        challengeType: 'public' as const,
        startDate: new Date(participation.start_date),
        endDate: new Date(participation.end_date),
        currentProgress: participation.current_progress || 0,
        completionPercentage: participation.completion_percentage || 0,
        streakCount: participation.streak_count || 0,
        bestStreak: participation.best_streak || 0,
        isCompleted: participation.is_completed || false,
        daysRemaining: Math.max(0, Math.ceil((new Date(participation.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))),
        lastProgressUpdate: participation.last_progress_update ? new Date(participation.last_progress_update) : undefined,
      };
    } catch (err) {
      console.warn('Error converting public participation:', participation?.challenge_id, err);
      return null;
    }
  }, []);

  const convertPrivateParticipation = useCallback((challengeData: any): ParticipationData | null => {
    try {
      if (!challengeData?.participation) return null;

      const endDate = new Date(challengeData.start_date);
      endDate.setDate(endDate.getDate() + (challengeData.duration_days || 0));

      return {
        challengeId: challengeData.id,
        challengeName: challengeData.title || 'Untitled Private Challenge',
        challengeType: 'private' as const,
        startDate: new Date(challengeData.start_date),
        endDate,
        currentProgress: challengeData.participation.progress_value || 0,
        completionPercentage: challengeData.participation.completion_percentage || 0,
        streakCount: challengeData.participation.streak_count || 0,
        bestStreak: 0, // Not tracked in private challenges currently
        isCompleted: (challengeData.participation.completion_percentage || 0) >= 100,
        daysRemaining: Math.max(0, Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))),
        lastProgressUpdate: challengeData.participation.last_progress_update ? new Date(challengeData.participation.last_progress_update) : undefined,
      };
    } catch (err) {
      console.warn('Error converting private participation:', challengeData?.id, err);
      return null;
    }
  }, []);

  // Memoized public participations with error handling
  const publicParticipations = useMemo(() => {
    try {
      if (!user) {
        console.log('ChallengeParticipationProvider: No user, returning empty public participations');
        return [];
      }

      console.log('ChallengeParticipationProvider: Processing public participations', {
        participationsCount: rawPublicParticipations.length,
        challengesCount: publicChallenges.length
      });

      return rawPublicParticipations
        .map(participation => {
          const challenge = publicChallenges.find(c => c.id === participation.challenge_id);
          return convertPublicParticipation(participation, challenge);
        })
        .filter((participation): participation is ParticipationData => participation !== null);
    } catch (err) {
      console.error('Error processing public participations:', err);
      setError('Failed to load public participations');
      return [];
    }
  }, [user, rawPublicParticipations, publicChallenges, convertPublicParticipation]);

  // Memoized private participations with error handling
  const privateParticipations = useMemo(() => {
    try {
      if (!user) {
        console.log('ChallengeParticipationProvider: No user, returning empty private participations');
        return [];
      }

      console.log('ChallengeParticipationProvider: Processing private participations', {
        challengesCount: privateChallenges.length
      });

      return privateChallenges
        .map(convertPrivateParticipation)
        .filter((participation): participation is ParticipationData => participation !== null);
    } catch (err) {
      console.error('Error processing private participations:', err);
      setError('Failed to load private participations');
      return [];
    }
  }, [user, privateChallenges, convertPrivateParticipation]);

  // Combined participations
  const userParticipations = useMemo(() => {
    try {
      return [...publicParticipations, ...privateParticipations];
    } catch (err) {
      console.error('Error combining participations:', err);
      return [];
    }
  }, [publicParticipations, privateParticipations]);

  // Optimized action handlers with error handling
  const updateProgress = useCallback(async (update: ProgressUpdate) => {
    try {
      setError(null);
      const participation = userParticipations.find(p => p.challengeId === update.challengeId);
      if (!participation) return false;

      if (participation.challengeType === 'public') {
        return await updatePublicProgress?.(update.challengeId, update.value) || false;
      } else {
        return await updatePrivateProgress?.(update.challengeId, update.value) || false;
      }
    } catch (err) {
      console.error('Error updating progress:', err);
      setError('Failed to update progress');
      return false;
    }
  }, [userParticipations, updatePublicProgress, updatePrivateProgress]);

  const markDayComplete = useCallback(async (challengeId: string, date?: Date) => {
    try {
      return await updateProgress({ challengeId, value: 100 });
    } catch (err) {
      console.error('Error marking day complete:', err);
      return false;
    }
  }, [updateProgress]);

  const leaveChallenge = useCallback(async (challengeId: string) => {
    try {
      setError(null);
      const participation = userParticipations.find(p => p.challengeId === challengeId);
      if (!participation) return false;

      if (participation.challengeType === 'public') {
        return await leavePublicChallenge?.(challengeId) || false;
      } else {
        // Private challenges don't have a leave function in the current hook
        console.log('Leaving private challenge:', challengeId);
        return true;
      }
    } catch (err) {
      console.error('Error leaving challenge:', err);
      setError('Failed to leave challenge');
      return false;
    }
  }, [userParticipations, leavePublicChallenge]);

  const joinChallenge = useCallback(async (challengeId: string) => {
    try {
      setError(null);
      return await joinPublicChallenge?.(challengeId) || false;
    } catch (err) {
      console.error('Error joining challenge:', err);
      setError('Failed to join challenge');
      return false;
    }
  }, [joinPublicChallenge]);

  // Selector functions with error handling
  const getParticipation = useCallback((challengeId: string) => {
    try {
      return userParticipations.find(p => p.challengeId === challengeId);
    } catch (err) {
      console.error('Error getting participation:', err);
      return undefined;
    }
  }, [userParticipations]);

  const getParticipationsByType = useCallback((type: 'public' | 'private') => {
    try {
      return userParticipations.filter(p => p.challengeType === type);
    } catch (err) {
      console.error('Error getting participations by type:', err);
      return [];
    }
  }, [userParticipations]);

  const getCurrentStreak = useCallback((challengeId: string) => {
    try {
      const participation = getParticipation(challengeId);
      return participation?.streakCount || 0;
    } catch (err) {
      console.error('Error getting current streak:', err);
      return 0;
    }
  }, [getParticipation]);

  const getBestStreak = useCallback((challengeId: string) => {
    try {
      const participation = getParticipation(challengeId);
      return participation?.bestStreak || 0;
    } catch (err) {
      console.error('Error getting best streak:', err);
      return 0;
    }
  }, [getParticipation]);

  const getDailyProgress = useCallback((challengeId: string, date?: Date) => {
    try {
      const participation = getParticipation(challengeId);
      return participation?.completionPercentage || 0;
    } catch (err) {
      console.error('Error getting daily progress:', err);
      return 0;
    }
  }, [getParticipation]);

  const getWeeklyProgress = useCallback((challengeId: string) => {
    try {
      const participation = getParticipation(challengeId);
      return participation ? Array(7).fill(participation.completionPercentage / 7) : [];
    } catch (err) {
      console.error('Error getting weekly progress:', err);
      return [];
    }
  }, [getParticipation]);

  const getOverallProgress = useCallback(() => {
    try {
      if (userParticipations.length === 0) return 0;
      const totalProgress = userParticipations.reduce((sum, p) => sum + p.completionPercentage, 0);
      return totalProgress / userParticipations.length;
    } catch (err) {
      console.error('Error getting overall progress:', err);
      return 0;
    }
  }, [userParticipations]);

  const refreshParticipations = useCallback(() => {
    try {
      setError(null);
      console.log('ChallengeParticipationProvider: Refreshing participations');
      refreshPublic?.();
      refreshPrivate?.();
    } catch (err) {
      console.error('Error refreshing participations:', err);
      setError('Failed to refresh participations');
    }
  }, [refreshPublic, refreshPrivate]);

  const value: ChallengeParticipationContextType = {
    userParticipations,
    publicParticipations,
    privateParticipations,
    updateProgress,
    markDayComplete,
    leaveChallenge,
    joinChallenge,
    getCurrentStreak,
    getBestStreak,
    getDailyProgress,
    getWeeklyProgress,
    getOverallProgress,
    loading: publicLoading || privateLoading,
    error,
    refreshParticipations,
    getParticipation,
    getParticipationsByType,
  };

  console.log('ChallengeParticipationProvider: Providing context value', {
    userParticipationsCount: userParticipations.length,
    publicParticipationsCount: publicParticipations.length,
    privateParticipationsCount: privateParticipations.length,
    loading: value.loading,
    error: value.error
  });

  return (
    <ChallengeParticipationContext.Provider value={value}>
      {children}
    </ChallengeParticipationContext.Provider>
  );
};

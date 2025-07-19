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
  const {
    challenges: publicChallenges,
    userParticipations: rawPublicParticipations,
    updateProgress: updatePublicProgress,
    leaveChallenge: leavePublicChallenge,
    joinChallenge: joinPublicChallenge,
    loading: publicLoading,
    refreshData: refreshPublic
  } = usePublicChallenges();

  const {
    challengesWithParticipation: privateChallenges,
    updatePrivateProgress,
    loading: privateLoading,
    refreshData: refreshPrivate
  } = usePrivateChallenges();

  // Memoized public participations
  const publicParticipations = useMemo(() => {
    if (!user) return [];

    return rawPublicParticipations.map(participation => {
      const challenge = publicChallenges.find(c => c.id === participation.challenge_id);
      if (!challenge) return null;

      return {
        challengeId: participation.challenge_id,
        challengeName: challenge.title,
        challengeType: 'public' as const,
        startDate: new Date(participation.start_date),
        endDate: new Date(participation.end_date),
        currentProgress: participation.current_progress,
        completionPercentage: participation.completion_percentage,
        streakCount: participation.streak_count || 0,
        bestStreak: participation.best_streak || 0,
        isCompleted: participation.is_completed,
        daysRemaining: Math.max(0, Math.ceil((new Date(participation.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))),
        lastProgressUpdate: participation.last_progress_update ? new Date(participation.last_progress_update) : undefined,
      };
    }).filter(Boolean) as ParticipationData[];
  }, [user, rawPublicParticipations, publicChallenges]);

  // Memoized private participations
  const privateParticipations = useMemo(() => {
    if (!user) return [];

    return privateChallenges.map(challengeData => {
      if (!challengeData.participation) return null;

      const endDate = new Date(challengeData.start_date);
      endDate.setDate(endDate.getDate() + challengeData.duration_days);

      return {
        challengeId: challengeData.id,
        challengeName: challengeData.title,
        challengeType: 'private' as const,
        startDate: new Date(challengeData.start_date),
        endDate,
        currentProgress: challengeData.participation.progress_value,
        completionPercentage: challengeData.participation.completion_percentage,
        streakCount: challengeData.participation.streak_count || 0,
        bestStreak: 0, // Not tracked in private challenges currently
        isCompleted: challengeData.participation.completion_percentage >= 100,
        daysRemaining: Math.max(0, Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))),
        lastProgressUpdate: challengeData.participation.last_progress_update ? new Date(challengeData.participation.last_progress_update) : undefined,
      };
    }).filter(Boolean) as ParticipationData[];
  }, [user, privateChallenges]);

  // Combined participations
  const userParticipations = useMemo(() => 
    [...publicParticipations, ...privateParticipations],
    [publicParticipations, privateParticipations]
  );

  // Optimized action handlers
  const updateProgress = useCallback(async (update: ProgressUpdate) => {
    const participation = userParticipations.find(p => p.challengeId === update.challengeId);
    if (!participation) return false;

    if (participation.challengeType === 'public') {
      return await updatePublicProgress(update.challengeId, update.value);
    } else {
      return await updatePrivateProgress(update.challengeId, update.value);
    }
  }, [userParticipations, updatePublicProgress, updatePrivateProgress]);

  const markDayComplete = useCallback(async (challengeId: string, date?: Date) => {
    // For simplicity, mark as 100% complete for the day
    return await updateProgress({ challengeId, value: 100 });
  }, [updateProgress]);

  const leaveChallenge = useCallback(async (challengeId: string) => {
    const participation = userParticipations.find(p => p.challengeId === challengeId);
    if (!participation) return false;

    if (participation.challengeType === 'public') {
      return await leavePublicChallenge(challengeId);
    } else {
      // Private challenges don't have a leave function in the current hook
      console.log('Leaving private challenge:', challengeId);
      return true;
    }
  }, [userParticipations, leavePublicChallenge]);

  const joinChallenge = useCallback(async (challengeId: string) => {
    return await joinPublicChallenge(challengeId);
  }, [joinPublicChallenge]);

  // Selector functions to prevent cascade re-renders
  const getParticipation = useCallback((challengeId: string) => 
    userParticipations.find(p => p.challengeId === challengeId),
    [userParticipations]
  );

  const getParticipationsByType = useCallback((type: 'public' | 'private') => 
    userParticipations.filter(p => p.challengeType === type),
    [userParticipations]
  );

  const getCurrentStreak = useCallback((challengeId: string) => {
    const participation = getParticipation(challengeId);
    return participation?.streakCount || 0;
  }, [getParticipation]);

  const getBestStreak = useCallback((challengeId: string) => {
    const participation = getParticipation(challengeId);
    return participation?.bestStreak || 0;
  }, [getParticipation]);

  const getDailyProgress = useCallback((challengeId: string, date?: Date) => {
    const participation = getParticipation(challengeId);
    // This would need to be enhanced with actual daily progress tracking
    return participation?.completionPercentage || 0;
  }, [getParticipation]);

  const getWeeklyProgress = useCallback((challengeId: string) => {
    // This would need to be enhanced with actual weekly progress tracking
    const participation = getParticipation(challengeId);
    return participation ? Array(7).fill(participation.completionPercentage / 7) : [];
  }, [getParticipation]);

  const getOverallProgress = useCallback(() => {
    if (userParticipations.length === 0) return 0;
    const totalProgress = userParticipations.reduce((sum, p) => sum + p.completionPercentage, 0);
    return totalProgress / userParticipations.length;
  }, [userParticipations]);

  const refreshParticipations = useCallback(() => {
    refreshPublic();
    refreshPrivate();
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
    refreshParticipations,
    getParticipation,
    getParticipationsByType,
  };

  return (
    <ChallengeParticipationContext.Provider value={value}>
      {children}
    </ChallengeParticipationContext.Provider>
  );
};
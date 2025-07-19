import React, { createContext, useContext, useState, ReactNode, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/auth';
import { usePublicChallenges } from '@/hooks/usePublicChallenges';
import { usePrivateChallenges } from '@/hooks/usePrivateChallenges';

interface ActiveChallenge {
  id: string;
  name: string;
  type: 'public' | 'private' | 'micro';
  startDate: Date;
  endDate: Date;
  progress: number;
  isCompleted: boolean;
  streakCount: number;
  goalDescription: string;
  durationDays: number;
}

interface ActiveChallengesContextType {
  activeChallenges: ActiveChallenge[];
  microChallenges: ActiveChallenge[];
  completedChallenges: ActiveChallenge[];
  totalActiveCount: number;
  completionRate: number;
  loading: boolean;
  refreshActiveChallenges: () => void;
}

const ActiveChallengesContext = createContext<ActiveChallengesContextType | undefined>(undefined);

export const useActiveChallenges = () => {
  const context = useContext(ActiveChallengesContext);
  if (!context) {
    throw new Error('useActiveChallenges must be used within an ActiveChallengesProvider');
  }
  return context;
};

interface ActiveChallengesProviderProps {
  children: ReactNode;
}

export const ActiveChallengesProvider: React.FC<ActiveChallengesProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const { 
    challenges: publicChallenges, 
    userParticipations, 
    loading: publicLoading,
    refreshData: refreshPublic
  } = usePublicChallenges();
  const { 
    challengesWithParticipation: privateChallenges, 
    loading: privateLoading,
    refreshData: refreshPrivate
  } = usePrivateChallenges();

  // Memoized active challenges to prevent unnecessary recalculations
  const activeChallenges = useMemo(() => {
    if (!user) return [];

    const activeList: ActiveChallenge[] = [];

    // Process public challenges user is participating in
    publicChallenges.forEach(pubChallenge => {
      const userParticipation = userParticipations.find(p => p.challenge_id === pubChallenge.id);
      if (!userParticipation || userParticipation.is_completed) return;

      activeList.push({
        id: pubChallenge.id,
        name: pubChallenge.title,
        type: pubChallenge.duration_days <= 3 ? 'micro' : 'public',
        startDate: new Date(userParticipation.start_date),
        endDate: new Date(userParticipation.end_date),
        progress: userParticipation.completion_percentage,
        isCompleted: userParticipation.is_completed,
        streakCount: userParticipation.streak_count || 0,
        goalDescription: pubChallenge.goal_description,
        durationDays: pubChallenge.duration_days
      });
    });

    // Process private challenges
    privateChallenges.forEach(privChallenge => {
      if (!privChallenge.participation || privChallenge.participation.completion_percentage >= 100) return;

      activeList.push({
        id: privChallenge.id,
        name: privChallenge.title,
        type: 'private',
        startDate: new Date(privChallenge.start_date),
        endDate: new Date(new Date(privChallenge.start_date).getTime() + privChallenge.duration_days * 24 * 60 * 60 * 1000),
        progress: privChallenge.participation.completion_percentage,
        isCompleted: false,
        streakCount: privChallenge.participation.streak_count || 0,
        goalDescription: privChallenge.description,
        durationDays: privChallenge.duration_days
      });
    });

    return activeList;
  }, [user, publicChallenges, userParticipations, privateChallenges]);

  // Memoized micro challenges (short duration)
  const microChallenges = useMemo(() => 
    activeChallenges.filter(challenge => challenge.type === 'micro'),
    [activeChallenges]
  );

  // Memoized completed challenges
  const completedChallenges = useMemo(() => {
    if (!user) return [];

    const completedList: ActiveChallenge[] = [];

    // Process completed public challenges
    publicChallenges.forEach(pubChallenge => {
      const userParticipation = userParticipations.find(p => p.challenge_id === pubChallenge.id);
      if (!userParticipation || !userParticipation.is_completed) return;

      completedList.push({
        id: pubChallenge.id,
        name: pubChallenge.title,
        type: pubChallenge.duration_days <= 3 ? 'micro' : 'public',
        startDate: new Date(userParticipation.start_date),
        endDate: new Date(userParticipation.end_date),
        progress: userParticipation.completion_percentage,
        isCompleted: true,
        streakCount: userParticipation.streak_count || 0,
        goalDescription: pubChallenge.goal_description,
        durationDays: pubChallenge.duration_days
      });
    });

    // Process completed private challenges
    privateChallenges.forEach(privChallenge => {
      if (!privChallenge.participation || privChallenge.participation.completion_percentage < 100) return;

      completedList.push({
        id: privChallenge.id,
        name: privChallenge.title,
        type: 'private',
        startDate: new Date(privChallenge.start_date),
        endDate: new Date(new Date(privChallenge.start_date).getTime() + privChallenge.duration_days * 24 * 60 * 60 * 1000),
        progress: privChallenge.participation.completion_percentage,
        isCompleted: true,
        streakCount: privChallenge.participation.streak_count || 0,
        goalDescription: privChallenge.description,
        durationDays: privChallenge.duration_days
      });
    });

    return completedList;
  }, [user, publicChallenges, userParticipations, privateChallenges]);

  // Memoized calculated values
  const totalActiveCount = useMemo(() => activeChallenges.length, [activeChallenges]);
  
  const completionRate = useMemo(() => {
    const totalChallenges = activeChallenges.length + completedChallenges.length;
    return totalChallenges > 0 ? (completedChallenges.length / totalChallenges) * 100 : 0;
  }, [activeChallenges.length, completedChallenges.length]);

  const refreshActiveChallenges = () => {
    refreshPublic();
    refreshPrivate();
  };

  const value: ActiveChallengesContextType = {
    activeChallenges,
    microChallenges,
    completedChallenges,
    totalActiveCount,
    completionRate,
    loading: publicLoading || privateLoading,
    refreshActiveChallenges,
  };

  return (
    <ActiveChallengesContext.Provider value={value}>
      {children}
    </ActiveChallengesContext.Provider>
  );
};
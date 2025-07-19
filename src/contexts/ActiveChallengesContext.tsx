
import React, { createContext, useContext, useState, ReactNode, useEffect, useMemo, useCallback } from 'react';
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
  participants?: Array<{ id: string; name: string; avatar: string; progress: number }>;
}

interface ActiveChallengesContextType {
  activeChallenges: ActiveChallenge[];
  microChallenges: ActiveChallenge[];
  completedChallenges: ActiveChallenge[];
  totalActiveCount: number;
  completionRate: number;
  loading: boolean;
  error: string | null;
  refreshActiveChallenges: () => void;
  joinChallenge: (challengeId: string) => Promise<void>;
  leaveChallenge: (challengeId: string) => Promise<void>;
  createChallenge: (challengeData: any) => Promise<void>;
  userChallenges: ActiveChallenge[];
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
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  console.log('ActiveChallengesProvider: Initializing with user:', user?.id);

  // Initialize hooks with better error handling
  const publicChallengesHook = usePublicChallenges();
  const privateChallengesHook = usePrivateChallenges();

  const {
    challenges: publicChallenges = [],
    userParticipations = [],
    loading: publicLoading = false,
    refreshData: refreshPublic
  } = publicChallengesHook || {};

  const {
    challengesWithParticipation: privateChallenges = [],
    loading: privateLoading = false,
    refreshData: refreshPrivate
  } = privateChallengesHook || {};

  // Initialize after auth is ready
  useEffect(() => {
    if (user !== undefined) { // Wait for auth to initialize (null or user object)
      setIsInitialized(true);
      setError(null);
    }
  }, [user]);

  // Clear error when data loads successfully
  useEffect(() => {
    if (isInitialized && (publicChallenges.length > 0 || privateChallenges.length > 0)) {
      setError(null);
    }
  }, [isInitialized, publicChallenges.length, privateChallenges.length]);

  // Memoized active challenges with error handling
  const activeChallenges = useMemo(() => {
    if (!isInitialized || !user) {
      console.log('ActiveChallengesProvider: Not initialized or no user, returning empty challenges');
      return [];
    }

    try {
      console.log('ActiveChallengesProvider: Processing challenges', {
        publicCount: publicChallenges.length,
        privateCount: privateChallenges.length,
        participationsCount: userParticipations.length
      });

      const activeList: ActiveChallenge[] = [];

      // Process public challenges user is participating in
      if (Array.isArray(publicChallenges) && Array.isArray(userParticipations)) {
        publicChallenges.forEach(pubChallenge => {
          try {
            const userParticipation = userParticipations.find(p => p.challenge_id === pubChallenge.id);
            if (!userParticipation || userParticipation.is_completed) return;

            activeList.push({
              id: pubChallenge.id,
              name: pubChallenge.title || 'Untitled Challenge',
              type: (pubChallenge.duration_days || 0) <= 3 ? 'micro' : 'public',
              startDate: new Date(userParticipation.start_date),
              endDate: new Date(userParticipation.end_date),
              progress: userParticipation.completion_percentage || 0,
              isCompleted: userParticipation.is_completed || false,
              streakCount: userParticipation.streak_count || 0,
              goalDescription: pubChallenge.goal_description || '',
              durationDays: pubChallenge.duration_days || 0
            });
          } catch (err) {
            console.warn('Error processing public challenge:', pubChallenge.id, err);
          }
        });
      }

      // Process private challenges
      if (Array.isArray(privateChallenges)) {
        privateChallenges.forEach(privChallenge => {
          try {
            if (!privChallenge.participation || (privChallenge.participation.completion_percentage || 0) >= 100) return;

            const startDate = new Date(privChallenge.start_date);
            const endDate = new Date(startDate.getTime() + (privChallenge.duration_days || 0) * 24 * 60 * 60 * 1000);

            activeList.push({
              id: privChallenge.id,
              name: privChallenge.title || 'Untitled Private Challenge',
              type: 'private',
              startDate,
              endDate,
              progress: privChallenge.participation.completion_percentage || 0,
              isCompleted: false,
              streakCount: privChallenge.participation.streak_count || 0,
              goalDescription: privChallenge.description || '',
              durationDays: privChallenge.duration_days || 0
            });
          } catch (err) {
            console.warn('Error processing private challenge:', privChallenge.id, err);
          }
        });
      }

      console.log('ActiveChallengesProvider: Processed active challenges:', activeList.length);
      return activeList;

    } catch (err) {
      console.error('Error in activeChallenges calculation:', err);
      setError('Failed to load active challenges');
      return [];
    }
  }, [isInitialized, user, publicChallenges, userParticipations, privateChallenges]);

  // Memoized micro challenges
  const microChallenges = useMemo(() => {
    try {
      return activeChallenges.filter(challenge => challenge.type === 'micro');
    } catch (err) {
      console.error('Error filtering micro challenges:', err);
      return [];
    }
  }, [activeChallenges]);

  // Memoized completed challenges with error handling
  const completedChallenges = useMemo(() => {
    if (!isInitialized || !user) return [];

    try {
      const completedList: ActiveChallenge[] = [];

      // Process completed public challenges
      if (Array.isArray(publicChallenges) && Array.isArray(userParticipations)) {
        publicChallenges.forEach(pubChallenge => {
          try {
            const userParticipation = userParticipations.find(p => p.challenge_id === pubChallenge.id);
            if (!userParticipation || !userParticipation.is_completed) return;

            completedList.push({
              id: pubChallenge.id,
              name: pubChallenge.title || 'Untitled Challenge',
              type: (pubChallenge.duration_days || 0) <= 3 ? 'micro' : 'public',
              startDate: new Date(userParticipation.start_date),
              endDate: new Date(userParticipation.end_date),
              progress: userParticipation.completion_percentage || 0,
              isCompleted: true,
              streakCount: userParticipation.streak_count || 0,
              goalDescription: pubChallenge.goal_description || '',
              durationDays: pubChallenge.duration_days || 0
            });
          } catch (err) {
            console.warn('Error processing completed public challenge:', pubChallenge.id, err);
          }
        });
      }

      // Process completed private challenges
      if (Array.isArray(privateChallenges)) {
        privateChallenges.forEach(privChallenge => {
          try {
            if (!privChallenge.participation || (privChallenge.participation.completion_percentage || 0) < 100) return;

            const startDate = new Date(privChallenge.start_date);
            const endDate = new Date(startDate.getTime() + (privChallenge.duration_days || 0) * 24 * 60 * 60 * 1000);

            completedList.push({
              id: privChallenge.id,
              name: privChallenge.title || 'Untitled Private Challenge',
              type: 'private',
              startDate,
              endDate,
              progress: privChallenge.participation.completion_percentage || 0,
              isCompleted: true,
              streakCount: privChallenge.participation.streak_count || 0,
              goalDescription: privChallenge.description || '',
              durationDays: privChallenge.duration_days || 0
            });
          } catch (err) {
            console.warn('Error processing completed private challenge:', privChallenge.id, err);
          }
        });
      }

      return completedList;
    } catch (err) {
      console.error('Error in completedChallenges calculation:', err);
      return [];
    }
  }, [isInitialized, user, publicChallenges, userParticipations, privateChallenges]);

  // Memoized calculated values
  const totalActiveCount = useMemo(() => activeChallenges.length, [activeChallenges]);
  
  const completionRate = useMemo(() => {
    try {
      const totalChallenges = activeChallenges.length + completedChallenges.length;
      return totalChallenges > 0 ? (completedChallenges.length / totalChallenges) * 100 : 0;
    } catch (err) {
      console.error('Error calculating completion rate:', err);
      return 0;
    }
  }, [activeChallenges.length, completedChallenges.length]);

  const refreshActiveChallenges = useCallback(() => {
    try {
      setError(null);
      console.log('ActiveChallengesProvider: Refreshing challenges');
      refreshPublic?.();
      refreshPrivate?.();
    } catch (err) {
      console.error('Error refreshing challenges:', err);
      setError('Failed to refresh challenges');
    }
  }, [refreshPublic, refreshPrivate]);

  const joinChallenge = useCallback(async (challengeId: string) => {
    try {
      // Implementation will be added when needed
      console.log('Joining challenge:', challengeId);
      refreshActiveChallenges();
    } catch (err) {
      console.error('Error joining challenge:', err);
      setError('Failed to join challenge');
    }
  }, [refreshActiveChallenges]);

  const leaveChallenge = useCallback(async (challengeId: string) => {
    try {
      // Implementation will be added when needed
      console.log('Leaving challenge:', challengeId);
      refreshActiveChallenges();
    } catch (err) {
      console.error('Error leaving challenge:', err);
      setError('Failed to leave challenge');
    }
  }, [refreshActiveChallenges]);

  const createChallenge = useCallback(async (challengeData: any) => {
    try {
      // Implementation will be added when needed
      console.log('Creating challenge:', challengeData);
      refreshActiveChallenges();
    } catch (err) {
      console.error('Error creating challenge:', err);
      setError('Failed to create challenge');
    }
  }, [refreshActiveChallenges]);

  const userChallenges = useMemo(() => {
    return [...activeChallenges, ...completedChallenges];
  }, [activeChallenges, completedChallenges]);

  const loading = !isInitialized || publicLoading || privateLoading;

  const value: ActiveChallengesContextType = {
    activeChallenges,
    microChallenges,
    completedChallenges,
    totalActiveCount,
    completionRate,
    loading,
    error,
    refreshActiveChallenges,
    joinChallenge,
    leaveChallenge,
    createChallenge,
    userChallenges,
  };

  console.log('ActiveChallengesProvider: Providing context value', {
    activeCount: activeChallenges.length,
    microCount: microChallenges.length,
    completedCount: completedChallenges.length,
    loading: value.loading,
    error: value.error,
    isInitialized
  });

  return (
    <ActiveChallengesContext.Provider value={value}>
      {children}
    </ActiveChallengesContext.Provider>
  );
};

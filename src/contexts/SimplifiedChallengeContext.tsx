
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useAuth } from '@/contexts/auth';

export interface Challenge {
  id: string;
  name: string;
  type: 'public' | 'private' | 'micro';
  creatorId: string;
  creatorName: string;
  goalType: 'no-sugar' | 'log-meals' | 'drink-water' | 'eat-veggies' | 'custom';
  customGoal?: string;
  startDate: Date;
  endDate: Date;
  participants: string[];
  participantDetails: { [userId: string]: { name: string; avatar: string } };
  progress: { [userId: string]: number };
  maxParticipants?: number;
  inviteCode?: string;
  isActive: boolean;
  trending?: boolean;
}

interface SimplifiedChallengeContextType {
  challenges: Challenge[];
  microChallenges: Challenge[];
  activeUserChallenges: Challenge[];
  loading: boolean;
  error: string | null;
  createChallenge: (challenge: Omit<Challenge, 'id' | 'isActive'>) => void;
  joinChallenge: (challengeId: string, userId: string, userDetails: { name: string; avatar: string }) => void;
  leaveChallenge: (challengeId: string, userId: string) => void;
  updateProgress: (challengeId: string, userId: string, progress: number) => void;
  deleteChallenge: (challengeId: string) => void;
}

const SimplifiedChallengeContext = createContext<SimplifiedChallengeContextType | undefined>(undefined);

export const useSimplifiedChallenge = () => {
  const context = useContext(SimplifiedChallengeContext);
  if (!context) {
    throw new Error('useSimplifiedChallenge must be used within a SimplifiedChallengeProvider');
  }
  return context;
};

interface SimplifiedChallengeProviderProps {
  children: ReactNode;
}

export const SimplifiedChallengeProvider: React.FC<SimplifiedChallengeProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mock data for now to ensure the page loads
  useEffect(() => {
    if (user) {
      console.log('Loading simplified challenges for user:', user.id);
      setLoading(true);
      
      // Simulate loading with mock data
      setTimeout(() => {
        const mockChallenges: Challenge[] = [
          {
            id: 'mock-1',
            name: 'Daily Water Challenge',
            type: 'public',
            creatorId: 'system',
            creatorName: 'System',
            goalType: 'drink-water',
            startDate: new Date(),
            endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            participants: [user.id],
            participantDetails: {
              [user.id]: { name: user.email?.split('@')[0] || 'You', avatar: '💧' }
            },
            progress: { [user.id]: 75 },
            isActive: true,
            trending: true
          },
          {
            id: 'mock-2',
            name: 'No Sugar Challenge',
            type: 'micro',
            creatorId: 'system',
            creatorName: 'System',
            goalType: 'no-sugar',
            startDate: new Date(),
            endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
            participants: [user.id],
            participantDetails: {
              [user.id]: { name: user.email?.split('@')[0] || 'You', avatar: '🚫' }
            },
            progress: { [user.id]: 50 },
            isActive: true
          }
        ];
        
        setChallenges(mockChallenges);
        setLoading(false);
        setError(null);
        console.log('Simplified challenges loaded successfully');
      }, 500);
    } else {
      setChallenges([]);
      setLoading(false);
    }
  }, [user]);

  const microChallenges = challenges.filter(c => c.type === 'micro');
  const activeUserChallenges = challenges.filter(c => c.participants.includes(user?.id || ''));

  const createChallenge = (challengeData: Omit<Challenge, 'id' | 'isActive'>) => {
    const newChallenge: Challenge = {
      ...challengeData,
      id: `challenge-${Date.now()}`,
      isActive: true,
    };
    setChallenges(prev => [...prev, newChallenge]);
  };

  const joinChallenge = (challengeId: string, userId: string, userDetails: { name: string; avatar: string }) => {
    setChallenges(prev => prev.map(challenge => {
      if (challenge.id === challengeId && !challenge.participants.includes(userId)) {
        return {
          ...challenge,
          participants: [...challenge.participants, userId],
          participantDetails: {
            ...challenge.participantDetails,
            [userId]: userDetails,
          },
          progress: {
            ...challenge.progress,
            [userId]: 0,
          },
        };
      }
      return challenge;
    }));
  };

  const leaveChallenge = (challengeId: string, userId: string) => {
    setChallenges(prev => prev.map(challenge => {
      if (challenge.id === challengeId) {
        const { [userId]: removedProgress, ...restProgress } = challenge.progress;
        const { [userId]: removedDetails, ...restDetails } = challenge.participantDetails;
        return {
          ...challenge,
          participants: challenge.participants.filter(id => id !== userId),
          participantDetails: restDetails,
          progress: restProgress,
        };
      }
      return challenge;
    }));
  };

  const updateProgress = (challengeId: string, userId: string, progress: number) => {
    setChallenges(prev => prev.map(challenge => {
      if (challenge.id === challengeId) {
        return {
          ...challenge,
          progress: {
            ...challenge.progress,
            [userId]: Math.min(100, Math.max(0, progress)),
          },
        };
      }
      return challenge;
    }));
  };

  const deleteChallenge = (challengeId: string) => {
    setChallenges(prev => prev.filter(challenge => challenge.id !== challengeId));
  };

  const value: SimplifiedChallengeContextType = {
    challenges,
    microChallenges,
    activeUserChallenges,
    loading,
    error,
    createChallenge,
    joinChallenge,
    leaveChallenge,
    updateProgress,
    deleteChallenge,
  };

  return (
    <SimplifiedChallengeContext.Provider value={value}>
      {children}
    </SimplifiedChallengeContext.Provider>
  );
};

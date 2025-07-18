import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface Challenge {
  id: string;
  name: string;
  type: 'public' | 'private';
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

interface ChallengeContextType {
  challenges: Challenge[];
  activeUserChallenges: Challenge[];
  createChallenge: (challenge: Omit<Challenge, 'id' | 'isActive'>) => void;
  joinChallenge: (challengeId: string, userId: string, userDetails: { name: string; avatar: string }) => void;
  leaveChallenenge: (challengeId: string, userId: string) => void;
  updateProgress: (challengeId: string, userId: string, progress: number) => void;
  deleteChallenge: (challengeId: string) => void;
}

const ChallengeContext = createContext<ChallengeContextType | undefined>(undefined);

export const useChallenge = () => {
  const context = useContext(ChallengeContext);
  if (!context) {
    throw new Error('useChallenge must be used within a ChallengeProvider');
  }
  return context;
};

interface ChallengeProviderProps {
  children: ReactNode;
}

export const ChallengeProvider: React.FC<ChallengeProviderProps> = ({ children }) => {
  const [challenges, setChallenges] = useState<Challenge[]>([
    // Mock data for demonstration
    {
      id: '1',
      name: '7-Day No Sugar Challenge 🍯',
      type: 'public',
      creatorId: 'user-1',
      creatorName: 'Maya 🌟',
      goalType: 'no-sugar',
      startDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // Started 2 days ago
      endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // Ends in 5 days
      participants: ['user-1', 'user-2', 'user-3'],
      participantDetails: {
        'user-1': { name: 'Maya 🌟', avatar: '🌟' },
        'user-2': { name: 'Alex 🦄', avatar: '🦄' },
        'user-3': { name: 'Sam 🔥', avatar: '🔥' },
      },
      progress: {
        'user-1': 85,
        'user-2': 92,
        'user-3': 67,
      },
      maxParticipants: 10,
      isActive: true,
      trending: true,
    },
    {
      id: '2',
      name: 'Hydration Heroes 💧',
      type: 'public',
      creatorId: 'user-4',
      creatorName: 'Jordan 🚀',
      goalType: 'drink-water',
      startDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // Started 1 day ago
      endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Ends in 2 days
      participants: ['user-4', 'user-5'],
      participantDetails: {
        'user-4': { name: 'Jordan 🚀', avatar: '🚀' },
        'user-5': { name: 'Casey 🌈', avatar: '🌈' },
      },
      progress: {
        'user-4': 78,
        'user-5': 45,
      },
      maxParticipants: 5,
      isActive: true,
    },
    {
      id: '3',
      name: 'Private Veggie Squad 🥬',
      type: 'private',
      creatorId: 'user-6',
      creatorName: 'Health Guru 🥗',
      goalType: 'eat-veggies',
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      participants: ['user-6', 'user-7'],
      participantDetails: {
        'user-6': { name: 'Health Guru 🥗', avatar: '🥗' },
        'user-7': { name: 'Workout Buddy 💪', avatar: '💪' },
      },
      progress: {
        'user-6': 100,
        'user-7': 86,
      },
      inviteCode: 'VEGGIE123',
      isActive: true,
    },
  ]);

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

  const leaveChallenenge = (challengeId: string, userId: string) => {
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

  // Get challenges where current user is participating
  const activeUserChallenges = challenges.filter(challenge => 
    challenge.participants.includes('current-user-id') && challenge.isActive
  );

  const value: ChallengeContextType = {
    challenges: challenges.filter(c => c.isActive),
    activeUserChallenges,
    createChallenge,
    joinChallenge,
    leaveChallenenge,
    updateProgress,
    deleteChallenge,
  };

  return (
    <ChallengeContext.Provider value={value}>
      {children}
    </ChallengeContext.Provider>
  );
};
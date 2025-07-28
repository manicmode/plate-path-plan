import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface RecoveryChallenge {
  id: string;
  name: string;
  type: 'public' | 'private' | 'micro';
  creatorId: string;
  creatorName: string;
  recoveryTypes: ('meditation' | 'breathing' | 'yoga' | 'sleep' | 'stretching' | 'muscle-recovery')[];
  description: string;
  startDate: Date;
  endDate: Date;
  participants: string[];
  participantDetails: { [userId: string]: { name: string; avatar: string } };
  progress: { [userId: string]: number };
  maxParticipants?: number;
  inviteCode?: string;
  isActive: boolean;
  trending?: boolean;
  sessions: { [userId: string]: { [recoveryType: string]: number } };
}

interface RecoveryChallengeContextType {
  challenges: RecoveryChallenge[];
  microChallenges: RecoveryChallenge[];
  activeUserChallenges: RecoveryChallenge[];
  createChallenge: (challenge: Omit<RecoveryChallenge, 'id' | 'isActive'>) => void;
  joinChallenge: (challengeId: string, userId: string, userDetails: { name: string; avatar: string }) => void;
  leaveChallenge: (challengeId: string, userId: string) => void;
  updateProgress: (challengeId: string, userId: string, recoveryType: string, sessions: number) => void;
  deleteChallenge: (challengeId: string) => void;
  nudgeFriend: (challengeId: string, friendId: string) => void;
}

const RecoveryChallengeContext = createContext<RecoveryChallengeContextType | undefined>(undefined);

export const useRecoveryChallenge = () => {
  const context = useContext(RecoveryChallengeContext);
  if (!context) {
    throw new Error('useRecoveryChallenge must be used within a RecoveryChallengeProvider');
  }
  return context;
};

interface RecoveryChallengeProviderProps {
  children: ReactNode;
}

export const RecoveryChallengeProvider: React.FC<RecoveryChallengeProviderProps> = ({ children }) => {
  const [challenges, setChallenges] = useState<RecoveryChallenge[]>([
    // Mock recovery challenges
    {
      id: 'recovery-1',
      name: '7-Day Meditation Streak 🧘‍♂️',
      type: 'public',
      creatorId: 'user-1',
      creatorName: 'Zen Master Maya 🌸',
      recoveryTypes: ['meditation'],
      description: 'Build a consistent meditation practice with daily sessions',
      startDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      participants: ['user-1', 'user-2', 'user-3'],
      participantDetails: {
        'user-1': { name: 'Zen Master Maya 🌸', avatar: '🌸' },
        'user-2': { name: 'Mindful Alex 🧘', avatar: '🧘' },
        'user-3': { name: 'Peaceful Sam ☮️', avatar: '☮️' },
      },
      progress: {
        'user-1': 85,
        'user-2': 92,
        'user-3': 67,
      },
      sessions: {
        'user-1': { meditation: 6 },
        'user-2': { meditation: 7 },
        'user-3': { meditation: 5 },
      },
      maxParticipants: 15,
      isActive: true,
      trending: true,
    },
    {
      id: 'recovery-2',
      name: 'Breathwork Daily for 10 Days 🌬️',
      type: 'public',
      creatorId: 'user-4',
      creatorName: 'Breathing Coach Jordan 💨',
      recoveryTypes: ['breathing'],
      description: 'Master your breath with daily breathing exercises',
      startDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000),
      participants: ['user-4', 'user-5'],
      participantDetails: {
        'user-4': { name: 'Breathing Coach Jordan 💨', avatar: '💨' },
        'user-5': { name: 'Deep Breath Casey 🌊', avatar: '🌊' },
      },
      progress: {
        'user-4': 78,
        'user-5': 45,
      },
      sessions: {
        'user-4': { breathing: 8 },
        'user-5': { breathing: 4 },
      },
      maxParticipants: 10,
      isActive: true,
    },
    {
      id: 'recovery-3',
      name: 'Yoga Flow Every Morning 🧎‍♀️',
      type: 'private',
      creatorId: 'user-6',
      creatorName: 'Yoga Guru Sarah 🕉️',
      recoveryTypes: ['yoga', 'stretching'],
      description: 'Start each day with gentle yoga and stretching',
      startDate: new Date(),
      endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      participants: ['user-6', 'user-7'],
      participantDetails: {
        'user-6': { name: 'Yoga Guru Sarah 🕉️', avatar: '🕉️' },
        'user-7': { name: 'Flexible Jamie 🤸', avatar: '🤸' },
      },
      progress: {
        'user-6': 100,
        'user-7': 86,
      },
      sessions: {
        'user-6': { yoga: 3, stretching: 3 },
        'user-7': { yoga: 2, stretching: 3 },
      },
      inviteCode: 'YOGA123',
      isActive: true,
    },
    // Micro recovery challenges
    {
      id: 'recovery-micro-1',
      name: '🧘‍♂️ 5-Min Meditation Today',
      type: 'micro',
      creatorId: 'user-2',
      creatorName: 'Mindful Alex 🧘',
      recoveryTypes: ['meditation'],
      description: 'Quick meditation session to center yourself',
      startDate: new Date(),
      endDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      participants: ['user-2', 'user-3', 'user-4'],
      participantDetails: {
        'user-2': { name: 'Mindful Alex 🧘', avatar: '🧘' },
        'user-3': { name: 'Peaceful Sam ☮️', avatar: '☮️' },
        'user-4': { name: 'Breathing Coach Jordan 💨', avatar: '💨' },
      },
      progress: {
        'user-2': 67,
        'user-3': 33,
        'user-4': 100,
      },
      sessions: {
        'user-2': { meditation: 0 },
        'user-3': { meditation: 0 },
        'user-4': { meditation: 1 },
      },
      isActive: true,
    },
  ]);

  const createChallenge = (challengeData: Omit<RecoveryChallenge, 'id' | 'isActive'>) => {
    const newChallenge: RecoveryChallenge = {
      ...challengeData,
      id: `recovery-challenge-${Date.now()}`,
      isActive: true,
      sessions: {},
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
          sessions: {
            ...challenge.sessions,
            [userId]: challenge.recoveryTypes.reduce((acc, type) => ({...acc, [type]: 0}), {}),
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
        const { [userId]: removedSessions, ...restSessions } = challenge.sessions;
        return {
          ...challenge,
          participants: challenge.participants.filter(id => id !== userId),
          participantDetails: restDetails,
          progress: restProgress,
          sessions: restSessions,
        };
      }
      return challenge;
    }));
  };

  const updateProgress = (challengeId: string, userId: string, recoveryType: string, sessions: number) => {
    setChallenges(prev => prev.map(challenge => {
      if (challenge.id === challengeId) {
        const userSessions = { ...challenge.sessions[userId], [recoveryType]: sessions };
        const totalSessions = Object.values(userSessions).reduce((sum, count) => sum + count, 0);
        const daysInChallenge = Math.ceil((Date.now() - challenge.startDate.getTime()) / (1000 * 60 * 60 * 24));
        const progress = Math.min(100, (totalSessions / Math.max(1, daysInChallenge)) * 100);

        return {
          ...challenge,
          sessions: {
            ...challenge.sessions,
            [userId]: userSessions,
          },
          progress: {
            ...challenge.progress,
            [userId]: Math.round(progress),
          },
        };
      }
      return challenge;
    }));
  };

  const deleteChallenge = (challengeId: string) => {
    setChallenges(prev => prev.filter(challenge => challenge.id !== challengeId));
  };

  const nudgeFriend = (challengeId: string, friendId: string) => {
    console.log(`Nudging friend ${friendId} for recovery challenge ${challengeId}`);
  };

  // Get challenges where current user is participating
  const activeUserChallenges = challenges.filter(challenge => 
    challenge.participants.includes('current-user-id') && challenge.isActive
  );

  // Separate micro challenges from regular challenges
  const microChallenges = challenges.filter(c => c.type === 'micro' && c.isActive);
  const regularChallenges = challenges.filter(c => c.type !== 'micro' && c.isActive);

  const value: RecoveryChallengeContextType = {
    challenges: regularChallenges,
    microChallenges,
    activeUserChallenges,
    createChallenge,
    joinChallenge,
    leaveChallenge,
    updateProgress,
    deleteChallenge,
    nudgeFriend,
  };

  return (
    <RecoveryChallengeContext.Provider value={value}>
      {children}
    </RecoveryChallengeContext.Provider>
  );
};
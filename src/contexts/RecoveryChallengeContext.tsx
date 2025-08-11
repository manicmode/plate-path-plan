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
  const [challenges, setChallenges] = useState<RecoveryChallenge[]>([]);
  
  // Note: This context is being deprecated in favor of usePublicChallenges hook
  // All challenges should now come from Supabase via the proper hooks

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
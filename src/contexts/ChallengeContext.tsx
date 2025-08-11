import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface Challenge {
  id: string;
  name: string;
  type: 'public' | 'private' | 'micro';
  creatorId: string;
  creatorName: string;
  goalType: 'no-sugar' | 'log-meals' | 'drink-water' | 'eat-veggies' | 'custom' | 'meditation' | 'breathing' | 'yoga' | 'sleep' | 'stretching' | 'muscle-recovery' | 'recovery-mixed';
  customGoal?: string;
  recoveryTypes?: ('meditation' | 'breathing' | 'yoga' | 'sleep' | 'stretching' | 'muscle-recovery')[];
  description?: string;
  startDate: Date;
  endDate: Date;
  participants: string[];
  participantDetails: { [userId: string]: { name: string; avatar: string } };
  progress: { [userId: string]: number };
  maxParticipants?: number;
  inviteCode?: string;
  isActive: boolean;
  trending?: boolean;
  sessions?: { [userId: string]: { [recoveryType: string]: number } };
}

interface ChallengeContextType {
  challenges: Challenge[];
  microChallenges: Challenge[];
  activeUserChallenges: Challenge[];
  createChallenge: (challenge: Omit<Challenge, 'id' | 'isActive'>) => void;
  joinChallenge: (challengeId: string, userId: string, userDetails: { name: string; avatar: string }) => void;
  leaveChallenenge: (challengeId: string, userId: string) => void;
  updateProgress: (challengeId: string, userId: string, progress: number) => void;
  deleteChallenge: (challengeId: string) => void;
  nudgeFriend: (challengeId: string, friendId: string) => void;
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
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  
  // Note: This context is being deprecated in favor of usePublicChallenges hook
  // All challenges should now come from Supabase via the proper hooks

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

  const nudgeFriend = (challengeId: string, friendId: string) => {
    // Simulate sending a nudge notification
    console.log(`Nudging friend ${friendId} for challenge ${challengeId}`);
  };

  // Get challenges where current user is participating
  const activeUserChallenges = challenges.filter(challenge => 
    challenge.participants.includes('current-user-id') && challenge.isActive
  );

  // Separate micro challenges from regular challenges
  const microChallenges = challenges.filter(c => c.type === 'micro' && c.isActive);
  const regularChallenges = challenges.filter(c => c.type !== 'micro' && c.isActive);

  const value: ChallengeContextType = {
    challenges: regularChallenges,
    microChallenges,
    activeUserChallenges,
    createChallenge,
    joinChallenge,
    leaveChallenenge,
    updateProgress,
    deleteChallenge,
    nudgeFriend,
  };

  return (
    <ChallengeContext.Provider value={value}>
      {children}
    </ChallengeContext.Provider>
  );
};
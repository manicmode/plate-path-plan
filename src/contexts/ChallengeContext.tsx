
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useAuth } from '@/contexts/auth';
import { usePublicChallenges } from '@/hooks/usePublicChallenges';
import { usePrivateChallenges } from '@/hooks/usePrivateChallenges';

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
  loading: boolean;
}

export const ChallengeContext = createContext<ChallengeContextType | undefined>(undefined);

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
  const { user } = useAuth();
  const { 
    challenges: publicChallenges, 
    userParticipations, 
    loading: publicLoading 
  } = usePublicChallenges();
  const { 
    challengesWithParticipation: privateChallenges, 
    loading: privateLoading 
  } = usePrivateChallenges();

  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [microChallenges, setMicroChallenges] = useState<Challenge[]>([]);
  const [activeUserChallenges, setActiveUserChallenges] = useState<Challenge[]>([]);

  // Convert Supabase data to Challenge format
  useEffect(() => {
    if (!user) {
      setChallenges([]);
      setMicroChallenges([]);
      setActiveUserChallenges([]);
      return;
    }

    console.log('Converting challenge data for user:', user.id);
    console.log('Public challenges:', publicChallenges);
    console.log('User participations:', userParticipations);
    console.log('Private challenges:', privateChallenges);

    // Convert public challenges
    const convertedPublicChallenges: Challenge[] = [];
    const convertedMicroChallenges: Challenge[] = [];
    const userActiveList: Challenge[] = [];

    // Process public challenges user is participating in
    publicChallenges.forEach(pubChallenge => {
      const userParticipation = userParticipations.find(p => p.challenge_id === pubChallenge.id);
      if (!userParticipation) return;

      const challenge: Challenge = {
        id: pubChallenge.id,
        name: pubChallenge.title,
        type: pubChallenge.duration_days <= 3 ? 'micro' : 'public',
        creatorId: 'system',
        creatorName: 'System',
        goalType: 'custom',
        customGoal: pubChallenge.goal_description,
        startDate: new Date(userParticipation.start_date),
        endDate: new Date(userParticipation.end_date),
        participants: [user.id],
        participantDetails: {
          [user.id]: { 
            name: user.email?.split('@')[0] || 'You', 
            avatar: '🌟' 
          }
        },
        progress: {
          [user.id]: userParticipation.completion_percentage
        },
        maxParticipants: 100,
        isActive: true,
        trending: pubChallenge.is_trending
      };

      if (pubChallenge.duration_days <= 3) {
        convertedMicroChallenges.push(challenge);
      } else {
        convertedPublicChallenges.push(challenge);
      }
      userActiveList.push(challenge);
    });

    // Process private challenges
    privateChallenges.forEach(privChallenge => {
      const challenge: Challenge = {
        id: privChallenge.id,
        name: privChallenge.title,
        type: 'private',
        creatorId: privChallenge.creator_id,
        creatorName: 'Challenge Creator',
        goalType: 'custom',
        customGoal: privChallenge.description,
        startDate: new Date(privChallenge.start_date),
        endDate: new Date(new Date(privChallenge.start_date).getTime() + privChallenge.duration_days * 24 * 60 * 60 * 1000),
        participants: [user.id],
        participantDetails: {
          [user.id]: { 
            name: user.email?.split('@')[0] || 'You', 
            avatar: '🔥' 
          }
        },
        progress: {
          [user.id]: privChallenge.participation?.completion_percentage || 0
        },
        maxParticipants: privChallenge.max_participants,
        inviteCode: `INV${privChallenge.id.slice(0, 6)}`,
        isActive: privChallenge.status === 'active' || privChallenge.status === 'pending',
      };

      convertedPublicChallenges.push(challenge);
      userActiveList.push(challenge);
    });

    console.log('Converted challenges:', {
      public: convertedPublicChallenges,
      micro: convertedMicroChallenges,
      active: userActiveList
    });

    setChallenges(convertedPublicChallenges);
    setMicroChallenges(convertedMicroChallenges);
    setActiveUserChallenges(userActiveList);
  }, [user, publicChallenges, userParticipations, privateChallenges]);

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
    console.log(`Nudging friend ${friendId} for challenge ${challengeId}`);
  };

  const value: ChallengeContextType = {
    challenges,
    microChallenges,
    activeUserChallenges,
    createChallenge,
    joinChallenge,
    leaveChallenenge,
    updateProgress,
    deleteChallenge,
    nudgeFriend,
    loading: publicLoading || privateLoading,
  };

  return (
    <ChallengeContext.Provider value={value}>
      {children}
    </ChallengeContext.Provider>
  );
};

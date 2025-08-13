import React, { useEffect } from 'react';
import { PrivateChallenge, PrivateChallengeParticipation } from '@/hooks/usePrivateChallenges';
import { UnifiedChallengeCard } from './UnifiedChallengeCard';
import { useChatStore } from '@/store/chatStore';

interface PrivateChallengeCardProps {
  challenge: PrivateChallenge;
  participation: PrivateChallengeParticipation;
  onUpdateProgress: (challengeId: string, value: number) => Promise<boolean>;
  onLeave?: (challengeId: string) => Promise<boolean>;
}

// Mock function to get user names - in real app this would come from user profiles
const getUserName = (userId: string) => {
  const mockUsers: Record<string, { name: string; avatar: string }> = {
    '1': { name: 'Sarah Chen', avatar: '👩‍💻' },
    '2': { name: 'Mike Johnson', avatar: '👨‍🍳' },
    '3': { name: 'Emma Wilson', avatar: '👩‍🎨' },
    '4': { name: 'Alex Rodriguez', avatar: '👨‍⚕️' },
    '5': { name: 'Lisa Park', avatar: '👩‍🏫' },
  };
  return mockUsers[userId] || { name: 'Unknown User', avatar: '👤' };
};

export const PrivateChallengeCard: React.FC<PrivateChallengeCardProps> = ({
  challenge,
  participation,
  onUpdateProgress,
  onLeave,
}) => {
  const { selectChatroom } = useChatStore();
  const isCompleted = participation.completion_percentage >= 100;
  const isCreator = participation.is_creator;
  const progressPercentage = participation.completion_percentage;

  const handleJoin = async () => {
    // Private challenges are already joined, this shouldn't be called
  };

  const handleLeave = async () => {
    if (onLeave) {
      await onLeave(challenge.id);
    }
  };

  const handleChatClick = () => {
    selectChatroom(challenge.id);
    window.dispatchEvent(
      new CustomEvent("switch-to-chat-tab", { detail: { challengeId: challenge.id } })
    );
    console.log('Navigating to Billboard for challenge:', challenge.id);
  };

  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{ challengeId?: string }>;
      if (ce.detail?.challengeId === challenge.id) {
        console.info('[Billboard] open from private card', challenge.id);
      }
    };
    window.addEventListener('switch-to-chat-tab', handler as EventListener);
    return () => window.removeEventListener('switch-to-chat-tab', handler as EventListener);
  }, [challenge.id]);

  return (
    <UnifiedChallengeCard
      id={challenge.id}
      title={challenge.title}
      description={challenge.description}
      badgeIcon={challenge.badge_icon}
      challengeType="friend"
      durationDays={challenge.duration_days}
      targetValue={challenge.target_value}
      targetUnit={challenge.target_unit}
      isParticipating={true}
      isCompleted={isCompleted}
      progressPercentage={progressPercentage}
      streakCount={participation.streak_count}
      bestStreak={0} // Not tracked in private challenges currently
      isCreator={isCreator}
      onJoin={handleJoin}
      onLeave={handleLeave}
      showInMyActiveChallenges={true}
    />
  );
};
import React, { useMemo, memo } from 'react';
import { PublicChallenge, UserChallengeParticipation } from '@/hooks/usePublicChallenges';
import { UnifiedChallengeCard, ChallengeType } from './UnifiedChallengeCard';

interface PublicChallengeCardProps {
  challenge: PublicChallenge;
  participation?: UserChallengeParticipation;
  onJoin: (challengeId: string) => Promise<boolean>;
  onUpdateProgress: (challengeId: string, value: number) => Promise<boolean>;
  onLeave: (challengeId: string) => Promise<boolean>;
}

export const PublicChallengeCard: React.FC<PublicChallengeCardProps> = memo(({
  challenge,
  participation,
  onJoin,
  onUpdateProgress,
  onLeave,
}) => {
  // Memoize computed values to prevent recalculation on every render
  const { isParticipating, isCompleted, progressPercentage, challengeType } = useMemo(() => {
    return {
      isParticipating: !!participation,
      isCompleted: participation?.is_completed || false,
      progressPercentage: participation?.completion_percentage || 0,
      challengeType: (challenge.duration_days <= 3 ? 'quick' : 'global') as ChallengeType
    };
  }, [participation, challenge.duration_days]);

  const handleJoin = async () => {
    await onJoin(challenge.id);
  };

  const handleLeave = async () => {
    await onLeave(challenge.id);
  };

  return (
    <UnifiedChallengeCard
      id={challenge.id}
      title={challenge.title}
      description={challenge.goal_description}
      badgeIcon={challenge.badge_icon}
      challengeType={challengeType}
      durationDays={challenge.duration_days}
      participantCount={challenge.participant_count}
      targetValue={challenge.target_value}
      targetUnit={challenge.target_unit}
      isParticipating={isParticipating}
      isCompleted={isCompleted}
      progressPercentage={progressPercentage}
      streakCount={participation?.streak_count || 0}
      bestStreak={participation?.best_streak || 0}
      isTrending={challenge.is_trending}
      isNew={challenge.is_new}
      difficultyLevel={challenge.difficulty_level}
      onJoin={handleJoin}
      onLeave={handleLeave}
    />
  );
});
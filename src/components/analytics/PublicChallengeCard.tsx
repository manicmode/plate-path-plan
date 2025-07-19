import React from 'react';
import { PublicChallenge, UserChallengeParticipation } from '@/hooks/usePublicChallenges';
import { UnifiedChallengeCard, ChallengeType } from './UnifiedChallengeCard';

interface PublicChallengeCardProps {
  challenge: PublicChallenge;
  participation?: UserChallengeParticipation;
  onJoin: (challengeId: string) => Promise<boolean>;
  onUpdateProgress: (challengeId: string, value: number) => Promise<boolean>;
  onLeave: (challengeId: string) => Promise<boolean>;
}

export const PublicChallengeCard: React.FC<PublicChallengeCardProps> = ({
  challenge,
  participation,
  onJoin,
  onUpdateProgress,
  onLeave,
}) => {
  const isParticipating = !!participation;
  const isCompleted = participation?.is_completed || false;
  const progressPercentage = participation?.completion_percentage || 0;

  // Determine challenge type based on duration for color coding
  const getChallengeType = (): ChallengeType => {
    if (challenge.duration_days <= 3) return 'quick';
    return 'global';
  };

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
      challengeType={getChallengeType()}
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
};
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
  const isCompleted = false; // Simplified for now
  const progressPercentage = 0; // Simplified for now

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
      description={challenge.description || 'No description available'}
      badgeIcon={challenge.cover_emoji || '🏆'}
      challengeType={getChallengeType()}
      durationDays={challenge.duration_days}
      participantCount={challenge.participant_count}
      targetValue={challenge.duration_days}
      targetUnit="days"
      isParticipating={isParticipating}
      isCompleted={isCompleted}
      progressPercentage={progressPercentage}
      streakCount={0}
      bestStreak={0}
      isTrending={challenge.participant_count > 5}
      isNew={(() => {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return new Date(challenge.created_at) > weekAgo;
      })()}
      difficultyLevel={challenge.duration_days <= 3 ? 'beginner' : challenge.duration_days <= 14 ? 'intermediate' : 'advanced'}
      onJoin={handleJoin}
      onLeave={handleLeave}
    />
  );
};
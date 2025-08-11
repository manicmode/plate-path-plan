import React from 'react';
import { ChallengesFeed } from '@/components/analytics/ChallengesFeed';

interface ExerciseChallengesProps {
  onChallengeCreated?: () => void;
}

export const ExerciseChallenges: React.FC<ExerciseChallengesProps> = ({ 
  onChallengeCreated 
}) => {
  return <ChallengesFeed onCreate={onChallengeCreated} />;
};
import React from 'react';
import { ChallengesFeed } from '@/components/analytics/ChallengesFeed';

interface ExerciseChallengesProps {
  onChallengeCreated?: () => void;
}

export const ExerciseChallenges: React.FC<ExerciseChallengesProps> = ({ 
  onChallengeCreated 
}) => {
  if (import.meta.env.DEV) console.log("[hooks-order-ok] ExerciseChallenges");
  
  return <ChallengesFeed onCreate={onChallengeCreated} />;
};
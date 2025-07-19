
import React, { useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';
import { EnhancedChallengeCard } from './EnhancedChallengeCard';

interface Challenge {
  id: string;
  name: string;
  type: 'public' | 'private' | 'micro';
  progress: number;
  streakCount: number;
  durationDays: number;
  endDate: Date;
  participants?: Array<{ id: string; name: string; progress: number }>;
}

interface OptimizedChallengeListProps {
  challenges: Challenge[];
  onUpdateProgress?: (challengeId: string, progress: number) => void;
  onComplete?: (challengeId: string) => void;
  height?: number;
}

const ChallengeItem: React.FC<{
  index: number;
  style: React.CSSProperties;
  data: {
    challenges: Challenge[];
    onUpdateProgress?: (challengeId: string, progress: number) => void;
    onComplete?: (challengeId: string) => void;
  };
}> = ({ index, style, data }) => {
  const challenge = data.challenges[index];
  
  return (
    <div style={style} className="px-2 py-1">
      <EnhancedChallengeCard
        challenge={challenge}
        onUpdateProgress={data.onUpdateProgress}
        onComplete={data.onComplete}
      />
    </div>
  );
};

export const OptimizedChallengeList: React.FC<OptimizedChallengeListProps> = ({
  challenges,
  onUpdateProgress,
  onComplete,
  height = 600
}) => {
  const itemData = useMemo(() => ({
    challenges,
    onUpdateProgress,
    onComplete
  }), [challenges, onUpdateProgress, onComplete]);

  if (challenges.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No challenges found</p>
      </div>
    );
  }

  // Use virtualization only for large lists
  if (challenges.length > 10) {
    return (
      <List
        height={height}
        itemCount={challenges.length}
        itemSize={280} // Approximate height of each challenge card
        itemData={itemData}
        className="w-full"
      >
        {ChallengeItem}
      </List>
    );
  }

  // For smaller lists, render normally
  return (
    <div className="space-y-4">
      {challenges.map((challenge) => (
        <EnhancedChallengeCard
          key={challenge.id}
          challenge={challenge}
          onUpdateProgress={onUpdateProgress}
          onComplete={onComplete}
        />
      ))}
    </div>
  );
};

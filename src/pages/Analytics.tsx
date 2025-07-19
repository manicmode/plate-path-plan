import React from 'react';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CircleUserRound, CalendarClock, CheckCircle2, Flame, Users } from 'lucide-react';
import { ChallengeContext } from '@/contexts/ChallengeContext';
import { useChallenge } from '@/contexts/ChallengeContext';
import { MicroChallengeCard } from '@/components/analytics/MicroChallengeCard';
import { OptimizedChallengeList } from '@/components/analytics/OptimizedChallengeList';
import { useActiveChallenges } from '@/contexts/ActiveChallengesContext';
import { useChallengeRealtime } from '@/hooks/useChallengeRealtime';

interface AnalyticsProps {
  // Add any props here
}

export const Analytics: React.FC<AnalyticsProps> = ({ /* props */ }) => {
  const { activeChallenges, refreshActiveChallenges } = useActiveChallenges();

  return (
    <div className="space-y-6">
      {/* Header */}
      <SectionHeader title="Analytics Dashboard" subtitle="Track your progress and stay motivated!" />

      {/* Active Challenges Section - Enhanced */}
      <div className="space-y-4">
        <SectionHeader 
          title="My Active Challenges" 
          subtitle={`${activeChallenges.length} active challenges`}
        />
        
        <OptimizedChallengeList 
          challenges={activeChallenges.map(challenge => ({
            id: challenge.id,
            name: challenge.name,
            type: challenge.type,
            progress: challenge.progress,
            streakCount: challenge.streakCount,
            durationDays: challenge.durationDays,
            endDate: challenge.endDate,
            participants: challenge.participants
          }))}
          onUpdateProgress={(challengeId, progress) => {
            console.log('Challenge progress updated:', challengeId, progress);
            refreshActiveChallenges();
          }}
          onComplete={(challengeId) => {
            console.log('Challenge completed:', challengeId);
            refreshActiveChallenges();
          }}
        />
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Lock,
  Plus,
  TrendingUp
} from 'lucide-react';
import { usePrivateChallenges } from '@/hooks/usePrivateChallenges';
import { ChallengeCard } from './ChallengeCard';
import { ChallengeCreationModal } from '@/components/analytics/ChallengeCreationModal';

export const PrivateChallengesFeed: React.FC = () => {
  const { 
    challengesWithParticipation,
    loading,
    updatePrivateProgress
  } = usePrivateChallenges();
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});

  const handleProgressUpdate = async (challengeId: string) => {
    setLoadingStates(prev => ({ ...prev, [challengeId]: true }));
    try {
      await updatePrivateProgress(challengeId, 10); // Example progress value
    } finally {
      setLoadingStates(prev => ({ ...prev, [challengeId]: false }));
    }
  };

  const handleChallengeCreated = () => {
    setShowCreateModal(false);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lock className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Private Challenges</h2>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Private
        </Button>
      </div>

      {/* Empty State */}
      {challengesWithParticipation.length === 0 ? (
        <div className="text-center py-12">
          <Lock className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Private Challenges</h3>
          <p className="text-muted-foreground mb-6">
            Create a private challenge to compete with friends and family!
          </p>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Private Challenge
          </Button>
        </div>
      ) : (
        /* Challenges Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
          {challengesWithParticipation.map((challenge) => {
            const isLoading = loadingStates[challenge.id];
            const participation = challenge.participation;

            return (
              <ChallengeCard
                key={challenge.id}
                challenge={challenge}
                isParticipating={!!participation}
                isLoading={isLoading}
              />
            );
          })}
        </div>
      )}

      {/* Create Challenge Modal */}
      <ChallengeCreationModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        defaultVisibility="private"
        onChallengeCreated={handleChallengeCreated}
      />
    </div>
  );
};
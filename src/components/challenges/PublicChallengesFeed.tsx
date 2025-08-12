import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { 
  Globe,
  Plus,
  Search
} from 'lucide-react';
import { usePublicChallenges } from '@/hooks/usePublicChallenges';
import { ChallengeCard } from './ChallengeCard';
import { ChallengeCreationModal } from '@/components/analytics/ChallengeCreationModal';
import { useToast } from '@/hooks/use-toast';

export const PublicChallengesFeed: React.FC = () => {
  const { 
    challenges, 
    loading, 
    error, 
    joinChallenge, 
    leaveChallenge,
    isUserParticipating,
    refreshData 
  } = usePublicChallenges();
  
  const { toast } = useToast();
  const [joinCode, setJoinCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});

  const handleJoinChallenge = async (challengeId: string) => {
    setLoadingStates(prev => ({ ...prev, [challengeId]: true }));
    try {
      const success = await joinChallenge(challengeId);
      if (success) {
        toast({
          title: "Joined! 🎉",
          description: "You've successfully joined the challenge",
        });
        await refreshData();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to join challenge. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingStates(prev => ({ ...prev, [challengeId]: false }));
    }
  };

  const handleLeaveChallenge = async (challengeId: string) => {
    setLoadingStates(prev => ({ ...prev, [challengeId]: true }));
    try {
      const success = await leaveChallenge(challengeId);
      if (success) {
        toast({
          title: "Left Challenge",
          description: "You've left the challenge",
        });
        await refreshData();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to leave challenge. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingStates(prev => ({ ...prev, [challengeId]: false }));
    }
  };

  const handleJoinByCode = async () => {
    if (!joinCode.trim()) {
      toast({
        title: "Missing Code",
        description: "Please enter a challenge code",
        variant: "destructive",
      });
      return;
    }

    setIsJoining(true);
    try {
      // Check if it's a UUID (direct challenge ID) or invite code
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(joinCode);
      
      let challengeId = joinCode;
      
      if (!isUUID) {
        // Find challenge by invite_code
        const challenge = challenges.find(c => c.invite_code === joinCode);
        if (!challenge) {
          toast({
            title: "Invalid Code",
            description: "Challenge not found with that code",
            variant: "destructive",
          });
          return;
        }
        challengeId = challenge.id;
      }

      await handleJoinChallenge(challengeId);
      setJoinCode('');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to join challenge. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsJoining(false);
    }
  };

  const handleChallengeCreated = async () => {
    setShowCreateModal(false);
    await refreshData();
    console.log('[feeds] refreshed');
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-16 w-full" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive mb-4">Error: {error.message}</p>
        <Button onClick={refreshData}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Public Challenges</h2>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Public
        </Button>
      </div>

      {/* Join by Code */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Search className="h-5 w-5 text-primary" />
            Join by Code
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Enter challenge ID or invite code..."
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleJoinByCode()}
            />
            <Button 
              onClick={handleJoinByCode}
              disabled={isJoining}
              className="whitespace-nowrap"
            >
              {isJoining ? 'Joining...' : 'Join'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Empty State */}
      {challenges.length === 0 ? (
        <div className="text-center py-12">
          <Globe className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Public Challenges</h3>
          <p className="text-muted-foreground mb-6">
            Be the first to create a public challenge for the community!
          </p>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Public Challenge
          </Button>
        </div>
      ) : (
        /* Challenges Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {challenges.map((challenge) => {
            const isParticipating = isUserParticipating(challenge.id);
            const isLoading = loadingStates[challenge.id];

            return (
              <ChallengeCard
                key={challenge.id}
                challenge={challenge}
                isParticipating={isParticipating}
                onJoin={handleJoinChallenge}
                onLeave={handleLeaveChallenge}
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
        defaultVisibility="public"
        onChallengeCreated={handleChallengeCreated}
      />
    </div>
  );
};
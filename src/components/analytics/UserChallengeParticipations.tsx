import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Clock, Target, Trophy, Flame, Plus, Lock, Users } from 'lucide-react';
import { usePublicChallenges } from '@/hooks/usePublicChallenges';
import { usePrivateChallenges } from '@/hooks/usePrivateChallenges';
import { PrivateChallengeCreationModal } from './PrivateChallengeCreationModal';
import { PrivateChallengeCard } from './PrivateChallengeCard';

export const UserChallengeParticipations: React.FC = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  const { 
    userParticipations, 
    challenges,
    updateProgress,
    leaveChallenge,
    loading: publicLoading 
  } = usePublicChallenges();

  const {
    challengesWithParticipation,
    updatePrivateProgress,
    loading: privateLoading
  } = usePrivateChallenges();

  const loading = publicLoading || privateLoading;

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const hasAnyChallenge = userParticipations.length > 0 || challengesWithParticipation.length > 0;

  if (!hasAnyChallenge) {
    return (
      <Card className="border-2 border-dashed border-muted">
        <CardContent className="text-center py-8">
          <Target className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <h3 className="font-semibold mb-2">No Active Challenges</h3>
          <p className="text-muted-foreground text-sm mb-3">
            Browse public challenges or create a private one with friends!
          </p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" size="sm">
              Browse Public
            </Button>
            <Button size="sm" onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Create Private
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Combine all challenges into one unified list
  const allActiveChallenges = [
    // Private challenges
    ...challengesWithParticipation.map(({ participation, ...challenge }) => ({
      type: 'private',
      challenge,
      participation: participation!,
      onLeave: async (challengeId: string) => {
        console.log('Leave private challenge:', challengeId);
        return true;
      }
    })),
    // Public challenges  
    ...userParticipations.map((participation) => {
      const challenge = challenges.find(c => c.id === participation.challenge_id);
      if (!challenge) return null;
      
      const challengeType = challenge.duration_days <= 3 ? 'quick' : 'public';
      
      return {
        type: challengeType,
        challenge,
        participation,
        onLeave: async (challengeId: string) => {
          return leaveChallenge(challengeId);
        }
      };
    }).filter(Boolean)
  ];

  return (
    <div className="space-y-6">
      {/* Header with Create Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          <h3 className="text-lg font-bold">My Challenges</h3>
          <Badge variant="secondary">
            {allActiveChallenges.length} active
          </Badge>
        </div>
        <Button size="sm" onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-1" />
          Create Private
        </Button>
      </div>

      {/* Unified Challenge Cards - No separators or category headers */}
      <div className="space-y-4">
        {allActiveChallenges.map((item) => {
          if (!item) return null;
          
          const { type, challenge, participation, onLeave } = item;
          
          // Handle different participation types
          const isCompleted = type === 'private' 
            ? (participation as any).completion_pct === 100 
            : (participation as any).is_completed || participation.completion_percentage === 100;
          
          const progressPercentage = type === 'private'
            ? (participation as any).completion_pct || 0
            : participation.completion_percentage || 0;

          // Header gradient based on challenge type
          const getHeaderClass = () => {
            switch (type) {
              case 'private':
                return 'bg-gradient-to-r from-purple-600 to-pink-600';
              case 'quick':
                return 'bg-gradient-to-r from-orange-500 to-yellow-500';
              case 'public':
              default:
                return 'bg-gradient-to-r from-blue-600 to-purple-600';
            }
          };

          // Type badge
          const getTypeBadge = () => {
            switch (type) {
              case 'private':
                return { icon: '🔒', label: 'Private' };
              case 'quick':
                return { icon: '⚡', label: 'Quick' };
              case 'public':
              default:
                return { icon: '🌐', label: 'Public' };
            }
          };

          const typeBadge = getTypeBadge();
          const timeLeft = challenge.duration_days ? `${challenge.duration_days}d` : '∞';

          // Get challenge icon and description
          const challengeIcon = type === 'private' 
            ? (challenge as any).emoji_icon || '🎯'
            : (challenge as any).badge_icon || '🎯';
          
          const challengeDescription = type === 'private'
            ? (challenge as any).challenge_type || (challenge as any).description
            : (challenge as any).goal_description || (challenge as any).description;

          // Get participant count
          const participantCount = type === 'private'
            ? (challenge as any).max_participants || 1
            : (challenge as any).participant_count || 1;

          return (
            <Card key={`${type}-${challenge.id}`} className="overflow-hidden border-0 bg-card/80 backdrop-blur">
              {/* Header with gradient */}
              <div className={`${getHeaderClass()} p-4 text-white`}>
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                    {typeBadge.icon} {typeBadge.label}
                  </Badge>
                  <div className="flex items-center gap-1 text-sm">
                    <Clock className="w-4 h-4" />
                    <span>{timeLeft}</span>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <span className="text-2xl">{challengeIcon}</span>
                    {challenge.title}
                  </h3>
                  <p className="text-white/90 text-sm">
                    {challengeDescription}
                  </p>
                  {type === 'private' && (
                    <p className="text-white/70 text-xs flex items-center gap-1">
                      <span>📝</span>
                      Created by {(challenge as any).creator_id === participation.user_id ? 'You' : 'Friend'}
                    </p>
                  )}
                </div>
              </div>

              <CardContent className="p-4 space-y-4">
                {/* Group Progress */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Group Progress</span>
                    <span className="text-sm text-muted-foreground">
                      {Math.round(progressPercentage)}%
                    </span>
                  </div>
                  <Progress value={progressPercentage} className="h-2" />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{participantCount} participants</span>
                    {participation.streak_count > 0 && (
                      <span className="flex items-center gap-1">
                        <Flame className="w-3 h-3" />
                        {participation.streak_count} day streak
                      </span>
                    )}
                  </div>
                </div>

                {/* Participant Avatars */}
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {/* Mock avatars - replace with actual participant data */}
                    {[1, 2, 3].slice(0, Math.min(3, participantCount)).map((i) => (
                      <div 
                        key={i}
                        className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/60 border-2 border-background flex items-center justify-center text-white text-xs font-bold"
                      >
                        {i === 1 ? '🏆' : i === 2 ? '⭐' : '💪'}
                      </div>
                    ))}
                  </div>
                  {participantCount > 3 && (
                    <span className="text-xs text-muted-foreground">
                      +{participantCount - 3} more
                    </span>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button 
                    className="flex-1 bg-primary hover:bg-primary/90"
                    onClick={() => {
                      if (confirm('Do you want to leave this challenge?')) {
                        onLeave(challenge.id);
                      }
                    }}
                  >
                    Joined
                  </Button>
                  
                  {type === 'private' && (
                    <Button variant="outline" size="sm">
                      <Users className="w-4 h-4 mr-1" />
                      Invite
                    </Button>
                  )}
                  
                  <Button variant="outline" size="sm">
                    <Users className="w-4 h-4 mr-1" />
                    Chat
                  </Button>
                </div>

                {isCompleted && participation.completed_at && (
                  <div className="text-xs text-muted-foreground pt-2 border-t flex items-center gap-1">
                    <Trophy className="w-3 h-3 text-yellow-500" />
                    Completed on {new Date(participation.completed_at).toLocaleDateString()}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Creation Modal */}
      <PrivateChallengeCreationModal 
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </div>
  );
};
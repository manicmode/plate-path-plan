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

  return (
    <div className="space-y-6">
      {/* Header with Create Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          <h3 className="text-lg font-bold">My Challenges</h3>
          <Badge variant="secondary">
            {userParticipations.length + challengesWithParticipation.length} active
          </Badge>
        </div>
        <Button size="sm" onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-1" />
          Create Private
        </Button>
      </div>

      {/* Private Challenges */}
      {challengesWithParticipation.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-purple-600" />
            <h4 className="font-semibold text-purple-600">Private Challenges</h4>
            <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
              {challengesWithParticipation.length} active
            </Badge>
          </div>
          
          <div className="space-y-3">
            {challengesWithParticipation.map(({ participation, ...challenge }) => (
              <PrivateChallengeCard
                key={challenge.id}
                challenge={challenge}
                participation={participation!}
                onUpdateProgress={updatePrivateProgress}
                onLeave={async (challengeId) => {
                  // Implement leave functionality for private challenges
                  console.log('Leave private challenge:', challengeId);
                  return true;
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Public Challenges */}
      {userParticipations.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-600" />
            <h4 className="font-semibold text-blue-600">Public Challenges</h4>
            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
              {userParticipations.length} active
            </Badge>
          </div>

          <div className="space-y-3">
            {userParticipations.map((participation) => {
              const challenge = challenges.find(c => c.id === participation.challenge_id);
              if (!challenge) return null;

              const isCompleted = participation.is_completed;
              const progressPercentage = participation.completion_percentage;

              // Determine challenge type based on duration for color coding
              const getChallengeType = () => {
                if (challenge.duration_days <= 3) return 'quick';
                return 'global';
              };

              const challengeType = getChallengeType();
              const getColorClass = () => {
                if (challengeType === 'quick') return 'border-t-orange-500 bg-orange-500/5';
                return 'border-t-blue-500 bg-blue-500/5';
              };

              return (
                <div key={participation.id} className={`border-t-4 rounded-lg ${getColorClass()}`}>
                  <Card className="border-0 bg-transparent">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        {/* Header */}
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-lg">{challenge.badge_icon}</span>
                              <h4 className="font-semibold">{challenge.title}</h4>
                              {isCompleted && <Trophy className="w-4 h-4 text-yellow-500" />}
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {challenge.goal_description}
                            </p>
                            
                            {/* Status badges */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className="text-xs">
                                {challengeType === 'quick' ? '⚡ Quick' : '🌐 Public'}
                              </Badge>
                              
                              <Badge 
                                variant={isCompleted ? "default" : "secondary"}
                                className={isCompleted ? "bg-green-500 text-white" : ""}
                              >
                                {isCompleted ? 'Completed' : `${Math.round(progressPercentage)}% Complete`}
                              </Badge>
                              
                              {participation.streak_count > 0 && (
                                <Badge variant="outline" className="text-xs">
                                  <Flame className="w-3 h-3 mr-1" />
                                  {participation.streak_count} day streak
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Progress bar */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Group Progress</span>
                            <span className="text-sm text-muted-foreground">
                              {Math.round(progressPercentage)}%
                            </span>
                          </div>
                          <Progress value={progressPercentage} className="h-2" />
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{challenge.participant_count} participants</span>
                          </div>
                        </div>

                        {/* Main button */}
                        <Button 
                          variant="outline"
                          className="w-full"
                          onClick={() => {
                            if (confirm('Are you sure you want to leave this challenge?')) {
                              leaveChallenge(challenge.id);
                            }
                          }}
                        >
                          Joined
                        </Button>

                        {isCompleted && participation.completed_at && (
                          <div className="text-xs text-muted-foreground pt-2 border-t">
                            Completed on {new Date(participation.completed_at).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Creation Modal */}
      <PrivateChallengeCreationModal 
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </div>
  );
};
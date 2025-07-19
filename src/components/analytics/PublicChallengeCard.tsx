import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Clock, Users, Target, Trophy, Flame, Star } from 'lucide-react';
import { PublicChallenge, UserChallengeParticipation } from '@/hooks/usePublicChallenges';

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
  const [isLoading, setIsLoading] = useState(false);
  const [progressValue, setProgressValue] = useState(1);

  const isParticipating = !!participation;
  const isCompleted = participation?.is_completed || false;
  const progressPercentage = participation?.completion_percentage || 0;

  const handleJoin = async () => {
    setIsLoading(true);
    await onJoin(challenge.id);
    setIsLoading(false);
  };

  const handleUpdateProgress = async () => {
    setIsLoading(true);
    await onUpdateProgress(challenge.id, progressValue);
    setIsLoading(false);
  };

  const handleLeave = async () => {
    setIsLoading(true);
    await onLeave(challenge.id);
    setIsLoading(false);
  };

  const getDifficultyColor = (level: string) => {
    switch (level) {
      case 'beginner': return 'bg-green-500/10 text-green-700 border-green-500/20';
      case 'intermediate': return 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20';
      case 'advanced': return 'bg-red-500/10 text-red-700 border-red-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'hydration': return '💧';
      case 'nutrition': return '🥗';
      case 'exercise': return '🏃';
      case 'mindfulness': return '🧘';
      default: return '🎯';
    }
  };

  return (
    <Card className="h-full transition-all duration-200 hover:shadow-lg hover:scale-[1.02]">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 flex-1">
            <span className="text-2xl">{challenge.badge_icon}</span>
            <div className="flex-1">
              <CardTitle className="text-lg leading-tight">{challenge.title}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                {challenge.is_trending && (
                  <Badge variant="secondary" className="text-xs bg-orange-500/10 text-orange-700 border-orange-500/20">
                    <Flame className="w-3 h-3 mr-1" />
                    Trending
                  </Badge>
                )}
                {challenge.is_new && (
                  <Badge variant="secondary" className="text-xs bg-blue-500/10 text-blue-700 border-blue-500/20">
                    <Star className="w-3 h-3 mr-1" />
                    New
                  </Badge>
                )}
                <Badge variant="outline" className={`text-xs ${getDifficultyColor(challenge.difficulty_level)}`}>
                  {challenge.difficulty_level}
                </Badge>
              </div>
            </div>
          </div>
        </div>
        
        <p className="text-sm text-muted-foreground mt-2">
          {challenge.goal_description}
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="flex flex-col items-center p-2 rounded-lg bg-muted/50">
            <Clock className="w-4 h-4 text-muted-foreground mb-1" />
            <span className="text-sm font-medium">{challenge.duration_days}</span>
            <span className="text-xs text-muted-foreground">
              {challenge.duration_days === 1 ? 'day' : 'days'}
            </span>
          </div>
          
          <div className="flex flex-col items-center p-2 rounded-lg bg-muted/50">
            <Users className="w-4 h-4 text-muted-foreground mb-1" />
            <span className="text-sm font-medium">{challenge.participant_count}</span>
            <span className="text-xs text-muted-foreground">joined</span>
          </div>
          
          <div className="flex flex-col items-center p-2 rounded-lg bg-muted/50">
            <Target className="w-4 h-4 text-muted-foreground mb-1" />
            <span className="text-sm font-medium">
              {challenge.target_value || 'Daily'}
            </span>
            <span className="text-xs text-muted-foreground">
              {challenge.target_unit || 'habit'}
            </span>
          </div>
        </div>

        {isParticipating && (
          <div className="space-y-3 p-3 rounded-lg bg-muted/50">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Your Progress</span>
              <div className="flex items-center gap-2">
                {isCompleted && <Trophy className="w-4 h-4 text-yellow-500" />}
                <span className="text-sm text-muted-foreground">
                  {Math.round(progressPercentage)}%
                </span>
              </div>
            </div>
            
            <Progress value={progressPercentage} className="h-2" />
            
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Streak: {participation?.streak_count || 0} days</span>
              <span>Best: {participation?.best_streak || 0} days</span>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          {!isParticipating ? (
            <Button 
              onClick={handleJoin}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? 'Joining...' : 'Join Challenge'}
            </Button>
          ) : (
            <>
              {!isCompleted && (
                <div className="flex gap-2 flex-1">
                  <input
                    type="number"
                    min="1"
                    value={progressValue}
                    onChange={(e) => setProgressValue(Number(e.target.value))}
                    className="w-16 px-2 py-1 text-sm border rounded"
                    placeholder="1"
                  />
                  <Button 
                    onClick={handleUpdateProgress}
                    disabled={isLoading}
                    size="sm"
                    className="flex-1"
                  >
                    {isLoading ? 'Updating...' : 'Log Progress'}
                  </Button>
                </div>
              )}
              
              <Button 
                onClick={handleLeave}
                disabled={isLoading}
                variant="outline"
                size="sm"
              >
                Leave
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
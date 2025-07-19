import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Clock, Users, Target, Trophy, Flame, Star, Globe, Lock, Zap, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ChallengeType = 'global' | 'friend' | 'quick';

interface UnifiedChallengeCardProps {
  id: string;
  title: string;
  description: string;
  badgeIcon: string;
  challengeType: ChallengeType;
  durationDays: number;
  participantCount?: number;
  targetValue?: number | string;
  targetUnit?: string;
  isParticipating: boolean;
  isCompleted?: boolean;
  progressPercentage?: number;
  streakCount?: number;
  bestStreak?: number;
  isTrending?: boolean;
  isNew?: boolean;
  difficultyLevel?: string;
  isCreator?: boolean;
  onJoin: () => Promise<void>;
  onLeave: () => Promise<void>;
  showInMyActiveChallenges?: boolean;
}

export const UnifiedChallengeCard: React.FC<UnifiedChallengeCardProps> = ({
  id,
  title,
  description,
  badgeIcon,
  challengeType,
  durationDays,
  participantCount,
  targetValue,
  targetUnit,
  isParticipating,
  isCompleted = false,
  progressPercentage = 0,
  streakCount = 0,
  bestStreak = 0,
  isTrending = false,
  isNew = false,
  difficultyLevel,
  isCreator = false,
  onJoin,
  onLeave,
  showInMyActiveChallenges = false,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);

  const getTypeColor = (type: ChallengeType) => {
    switch (type) {
      case 'global': return 'border-t-blue-500 bg-blue-500/5';
      case 'friend': return 'border-t-purple-500 bg-purple-500/5';
      case 'quick': return 'border-t-orange-500 bg-orange-500/5';
      default: return 'border-t-gray-500 bg-gray-500/5';
    }
  };

  const getTypeIcon = (type: ChallengeType) => {
    switch (type) {
      case 'global': return <Globe className="w-4 h-4" />;
      case 'friend': return <Lock className="w-4 h-4" />;
      case 'quick': return <Zap className="w-4 h-4" />;
    }
  };

  const getTypeLabel = (type: ChallengeType) => {
    switch (type) {
      case 'global': return 'Public';
      case 'friend': return 'Private';
      case 'quick': return 'Quick';
    }
  };

  const getDifficultyColor = (level?: string) => {
    switch (level) {
      case 'beginner': return 'bg-green-500/10 text-green-700 border-green-500/20';
      case 'intermediate': return 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20';
      case 'advanced': return 'bg-red-500/10 text-red-700 border-red-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const handleMainButtonClick = async () => {
    if (!isParticipating) {
      setIsLoading(true);
      try {
        await onJoin();
      } finally {
        setIsLoading(false);
      }
    } else {
      setShowLeaveDialog(true);
    }
  };

  const handleLeaveConfirm = async () => {
    setIsLoading(true);
    try {
      await onLeave();
      setShowLeaveDialog(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Card className={cn(
        "h-full transition-all duration-200 hover:shadow-lg hover:scale-[1.02] border-t-4",
        getTypeColor(challengeType)
      )}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2 flex-1">
              <span className="text-2xl">{badgeIcon}</span>
              <div className="flex-1">
                <CardTitle className="text-lg leading-tight">{title}</CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {getTypeIcon(challengeType)}
                    <span className="ml-1">{getTypeLabel(challengeType)}</span>
                  </Badge>
                  
                  {isTrending && (
                    <Badge variant="secondary" className="text-xs bg-orange-500/10 text-orange-700 border-orange-500/20">
                      <Flame className="w-3 h-3 mr-1" />
                      Trending
                    </Badge>
                  )}
                  
                  {isNew && (
                    <Badge variant="secondary" className="text-xs bg-blue-500/10 text-blue-700 border-blue-500/20">
                      <Star className="w-3 h-3 mr-1" />
                      New
                    </Badge>
                  )}
                  
                  {difficultyLevel && (
                    <Badge variant="outline" className={`text-xs ${getDifficultyColor(difficultyLevel)}`}>
                      {difficultyLevel}
                    </Badge>
                  )}

                  {isCreator && (
                    <Crown className="w-4 h-4 text-purple-500" />
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <p className="text-sm text-muted-foreground mt-2">
            {description}
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          {!showInMyActiveChallenges && (
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="flex flex-col items-center p-2 rounded-lg bg-muted/50">
                <Clock className="w-4 h-4 text-muted-foreground mb-1" />
                <span className="text-sm font-medium">{durationDays}</span>
                <span className="text-xs text-muted-foreground">
                  {durationDays === 1 ? 'day' : 'days'}
                </span>
              </div>
              
              {participantCount !== undefined && (
                <div className="flex flex-col items-center p-2 rounded-lg bg-muted/50">
                  <Users className="w-4 h-4 text-muted-foreground mb-1" />
                  <span className="text-sm font-medium">{participantCount}</span>
                  <span className="text-xs text-muted-foreground">joined</span>
                </div>
              )}
              
              <div className="flex flex-col items-center p-2 rounded-lg bg-muted/50">
                <Target className="w-4 h-4 text-muted-foreground mb-1" />
                <span className="text-sm font-medium">
                  {targetValue || 'Daily'}
                </span>
                <span className="text-xs text-muted-foreground">
                  {targetUnit || 'habit'}
                </span>
              </div>
            </div>
          )}

          {isParticipating && showInMyActiveChallenges && (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Group Progress</span>
                  <span className="text-sm text-muted-foreground">
                    {Math.round(progressPercentage)}%
                  </span>
                </div>
                <Progress value={progressPercentage} className="h-2" />
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{participantCount || 2} participants</span>
                {challengeType === 'friend' && <span>2 participants</span>}
              </div>
            </>
          )}

          {isParticipating && !showInMyActiveChallenges && (
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
                <span>Streak: {streakCount} days</span>
                <span>Best: {bestStreak} days</span>
              </div>
            </div>
          )}

          <Button 
            onClick={handleMainButtonClick}
            disabled={isLoading || isCompleted}
            className="w-full"
            variant={isParticipating ? "outline" : "default"}
          >
            {isLoading 
              ? (isParticipating ? 'Leaving...' : 'Joining...') 
              : isCompleted
                ? 'Completed'
                : isParticipating 
                  ? 'Joined' 
                  : 'Join Challenge'
            }
          </Button>

          {showInMyActiveChallenges && challengeType === 'friend' && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1">
                Invite
              </Button>
              <Button variant="outline" size="sm" className="flex-1">
                Chat
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave Challenge</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Are you sure you want to leave this challenge? Your progress will be lost.
            </p>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowLeaveDialog(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleLeaveConfirm}
                disabled={isLoading}
              >
                {isLoading ? 'Leaving...' : 'Leave Challenge'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
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
      case 'global': return 'border-t-blue-500/60 bg-gradient-to-br from-blue-500/5 to-blue-600/10 shadow-blue-500/10';
      case 'friend': return 'border-t-purple-500/60 bg-gradient-to-br from-purple-500/5 to-purple-600/10 shadow-purple-500/10';
      case 'quick': return 'border-t-orange-500/60 bg-gradient-to-br from-orange-500/5 to-orange-600/10 shadow-orange-500/10';
      default: return 'border-t-muted bg-gradient-to-br from-muted/5 to-muted/10 shadow-muted/10';
    }
  };

  const getTypeBadgeIcon = (type: ChallengeType) => {
    switch (type) {
      case 'global': return '🌍';
      case 'friend': return '🔒';
      case 'quick': return '⚡';
      default: return '🎯';
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
        "premium-challenge-card mx-auto w-full max-w-md",
        "h-full min-h-[320px] transition-all duration-300 ease-out",
        "hover:shadow-2xl hover:shadow-primary/20 hover:scale-[1.03]",
        "border-0 rounded-2xl backdrop-blur-sm border-border/50",
        "group relative overflow-hidden",
        getTypeColor(challengeType)
      )}>
        {/* Type badge icon in top-left corner */}
        <div className="absolute top-4 left-4 z-10">
          <div className="w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center shadow-sm">
            <span className="text-sm">{getTypeBadgeIcon(challengeType)}</span>
          </div>
        </div>

        <CardHeader className="pb-4 pt-6 px-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3 flex-1 ml-10">
              <span className="text-3xl filter drop-shadow-sm">{badgeIcon}</span>
              <div className="flex-1 space-y-2">
                <CardTitle className="text-xl leading-tight font-semibold">{title}</CardTitle>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-xs bg-background/50 backdrop-blur-sm">
                    {getTypeIcon(challengeType)}
                    <span className="ml-1">{getTypeLabel(challengeType)}</span>
                  </Badge>
                  
                  {isTrending && (
                    <Badge variant="secondary" className="text-xs bg-orange-500/15 text-orange-700 border-orange-500/30">
                      <Flame className="w-3 h-3 mr-1" />
                      Trending
                    </Badge>
                  )}
                  
                  {isNew && (
                    <Badge variant="secondary" className="text-xs bg-blue-500/15 text-blue-700 border-blue-500/30">
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
                    <Crown className="w-4 h-4 text-purple-500 filter drop-shadow-sm" />
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <p className="text-sm text-muted-foreground mt-3 leading-relaxed px-1">
            {description}
          </p>
        </CardHeader>

        <CardContent className="space-y-5 px-6 pb-6">
          {!showInMyActiveChallenges && (
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="flex flex-col items-center p-3 rounded-xl bg-background/60 backdrop-blur-sm border border-border/30 shadow-sm">
                <Clock className="w-5 h-5 text-primary mb-2" />
                <span className="text-sm font-semibold">{durationDays}</span>
                <span className="text-xs text-muted-foreground">
                  {durationDays === 1 ? 'day' : 'days'}
                </span>
              </div>
              
              {participantCount !== undefined && (
                <div className="flex flex-col items-center p-3 rounded-xl bg-background/60 backdrop-blur-sm border border-border/30 shadow-sm">
                  <Users className="w-5 h-5 text-primary mb-2" />
                  <span className="text-sm font-semibold">{participantCount}</span>
                  <span className="text-xs text-muted-foreground">joined</span>
                </div>
              )}
              
              <div className="flex flex-col items-center p-3 rounded-xl bg-background/60 backdrop-blur-sm border border-border/30 shadow-sm">
                <Target className="w-5 h-5 text-primary mb-2" />
                <span className="text-sm font-semibold">
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
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">Group Progress</span>
                  <span className="text-sm font-medium text-primary">
                    {Math.round(progressPercentage)}%
                  </span>
                </div>
                <div className="relative">
                  <Progress 
                    value={progressPercentage} 
                    className="h-3 premium-progress-bar rounded-full shadow-inner bg-background/50" 
                  />
                  {progressPercentage > 0 && (
                    <div className="absolute inset-y-0 left-0 w-full h-3 rounded-full premium-progress-glow opacity-60 animate-pulse" />
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                <span>{participantCount || 2} participants</span>
                {challengeType === 'friend' && <span>2 participants</span>}
              </div>
            </>
          )}

          {isParticipating && !showInMyActiveChallenges && (
            <div className="space-y-4 p-4 rounded-xl bg-background/60 backdrop-blur-sm border border-border/30 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Your Progress</span>
                <div className="flex items-center gap-2">
                  {isCompleted && <Trophy className="w-4 h-4 text-yellow-500 filter drop-shadow-sm" />}
                  <span className="text-sm font-medium text-primary">
                    {Math.round(progressPercentage)}%
                  </span>
                </div>
              </div>
              
              <div className="relative">
                <Progress 
                  value={progressPercentage} 
                  className="h-3 premium-progress-bar rounded-full shadow-inner bg-background/50" 
                />
                {progressPercentage > 0 && (
                  <div className="absolute inset-y-0 left-0 w-full h-3 rounded-full premium-progress-glow opacity-60 animate-pulse" />
                )}
              </div>
              
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Streak: {streakCount} days</span>
                <span>Best: {bestStreak} days</span>
              </div>
            </div>
          )}

          <Button 
            onClick={handleMainButtonClick}
            disabled={isLoading || isCompleted}
            className="w-full h-11 text-sm font-semibold rounded-xl shadow-md hover:shadow-lg transition-all duration-200"
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
            <div className="flex gap-3">
              <Button variant="outline" size="sm" className="flex-1 h-10 rounded-xl font-medium">
                Invite
              </Button>
              <Button variant="outline" size="sm" className="flex-1 h-10 rounded-xl font-medium">
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
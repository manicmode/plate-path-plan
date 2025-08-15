import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Clock, Users, Target, Trophy, Flame, Star, Globe, Lock, Zap, Crown, Share, MessageCircle, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useChatStore } from '@/store/chatStore';
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
  showChat?: boolean; // browse should hide chat
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
  showChat = true,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);

  const { selectChatroom } = useChatStore();

  const handleChat = () => {
    selectChatroom(id);
    window.dispatchEvent(new CustomEvent('switch-to-chat-tab', { detail: { challengeId: id } }));
    console.info('[chat] open from my card', id);
  };
  const getTypeColor = (type: ChallengeType) => {
    switch (type) {
      case 'global': return 'challenge-card-gradient-blue';
      case 'friend': return 'challenge-card-gradient-purple';
      case 'quick': return 'challenge-card-gradient-orange';
      default: return 'challenge-card-gradient-gray';
    }
  };

  const getTypeBadgeIcon = (type: ChallengeType) => {
    switch (type) {
      case 'global': return <Globe className="w-3 h-3" />;
      case 'friend': return <Lock className="w-3 h-3" />;
      case 'quick': return <Zap className="w-3 h-3" />;
      default: return <Target className="w-3 h-3" />;
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
        "challenge-card-modern mx-auto w-full max-w-[340px]",
        "min-h-[380px] transition-all duration-300 ease-out",
        "hover:shadow-2xl hover:scale-[1.02]",
        "border-0 rounded-2xl overflow-hidden relative",
        "backdrop-blur-sm",
        getTypeColor(challengeType)
      )}>
        {/* Top badges row */}
        <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge className="challenge-type-badge text-xs font-medium px-3 py-1 rounded-full bg-black/30 text-white backdrop-blur-sm border-0">
              {getTypeBadgeIcon(challengeType)}
              <span className="ml-1 capitalize">{getTypeLabel(challengeType)}</span>
            </Badge>
            <Badge className="duration-badge text-xs font-medium px-3 py-1 rounded-full bg-black/30 text-white backdrop-blur-sm border-0">
              <Clock className="w-3 h-3 mr-1" />
              {durationDays}d {Math.floor(Math.random() * 24)}h
            </Badge>
          </div>
          
          {isTrending && (
            <Badge className="trending-badge text-xs font-medium px-3 py-1 rounded-full bg-orange-500/90 text-white backdrop-blur-sm border-0">
              <Flame className="w-3 h-3 mr-1" />
              Trending
            </Badge>
          )}
        </div>

        <CardHeader className="pt-16 pb-4 px-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-3xl filter drop-shadow-sm">{badgeIcon}</span>
              <div className="flex-1">
                <CardTitle className="text-xl leading-tight font-bold text-white mb-1">
                  {title}
                </CardTitle>
                <p className="text-sm text-white/80 leading-relaxed">
                  {description}
                </p>
              </div>
            </div>
            
            {isCreator && (
              <div className="flex items-center gap-2 text-white/90">
                <div className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center">
                  <span className="text-xs">👨‍💼</span>
                </div>
                <span className="text-xs">Created by Health Guru</span>
                <Star className="w-3 h-3 text-yellow-400 fill-current" />
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4 px-6 pb-6 bg-background/95 backdrop-blur-sm">
          {/* Progress Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">
                {showInMyActiveChallenges ? 'Group Progress' : 'Progress'}
              </span>
              <span className="text-sm font-bold text-emerald-600">
                {Math.round(progressPercentage)}%
              </span>
            </div>
            <div className="relative">
              <Progress 
                value={progressPercentage} 
                className="h-2 challenge-progress-bar rounded-full bg-muted/30" 
              />
            </div>
          </div>

          {/* Participants Section */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="w-4 h-4" />
              <span>{participantCount || 3} participants{challengeType === 'global' ? ' / 10' : ''}</span>
            </div>
          </div>

          {/* Participant Avatars */}
          <div className="flex items-center gap-2">
            {[...Array(Math.min(participantCount || 3, 3))].map((_, i) => (
              <div key={i} className="w-8 h-8 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center">
                <span className="text-xs">
                  {i === 0 ? '⭐' : i === 1 ? '🦄' : '🔥'}
                </span>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-2">
            <Button 
              onClick={handleMainButtonClick}
              disabled={isLoading || isCompleted}
              className={cn(
                "w-full h-11 text-sm font-semibold rounded-xl transition-all duration-200",
                isParticipating 
                  ? "bg-red-500 hover:bg-red-600 text-white" 
                  : "bg-emerald-500 hover:bg-emerald-600 text-white"
              )}
            >
              {isLoading 
                ? (isParticipating ? 'Leaving...' : 'Joining...') 
                : isCompleted
                  ? 'Completed'
                  : isParticipating 
                    ? 'Leave Challenge'
                    : <><UserPlus className="w-4 h-4 mr-2" />Join Challenge</>
              }
            </Button>

            {/* Secondary Action Buttons */}
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1 h-10 rounded-xl font-medium bg-muted/50 hover:bg-muted"
              >
                <Share className="w-4 h-4 mr-2" />
                Share
              </Button>
              {showChat && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleChat}
                  className="flex-1 h-10 rounded-xl font-medium bg-muted/50 hover:bg-muted"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Billboard
                </Button>
              )}
            </div>
          </div>
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
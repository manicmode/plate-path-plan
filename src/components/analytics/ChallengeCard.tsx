import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { 
  Clock, 
  Users, 
  Trophy, 
  Share2, 
  UserPlus, 
  UserMinus,
  Copy,
  ExternalLink,
  Flame,
  Target,
  Calendar,
  Globe,
  Lock,
  MessageCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Challenge, useChallenge } from '@/contexts/ChallengeContext';
import { ChallengeChatModal } from './ChallengeChatModal';
import { useToast } from '@/hooks/use-toast';
import { useSound } from '@/hooks/useSound';
import { ShareComposer } from '@/components/share/ShareComposer';

interface ChallengeCardProps {
  challenge: Challenge;
  currentUserId?: string;
}

export const ChallengeCard: React.FC<ChallengeCardProps> = ({ 
  challenge, 
  currentUserId = 'current-user-id' 
}) => {
  const [showChat, setShowChat] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const { joinChallenge, leaveChallenenge } = useChallenge();
  const { toast } = useToast();
  const { playChallengeWin } = useSound();

  const isParticipant = challenge.participants.includes(currentUserId);
  const isCreator = challenge.creatorId === currentUserId;
  const canJoin = challenge.type === 'public' && !isParticipant && 
    (!challenge.maxParticipants || challenge.participants.length < challenge.maxParticipants);

  // Calculate time remaining
  useEffect(() => {
    const updateTimeLeft = () => {
      const now = new Date();
      const timeDiff = challenge.endDate.getTime() - now.getTime();
      
      if (timeDiff <= 0) {
        setTimeLeft('Ended');
        return;
      }

      const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m`);
      } else {
        setTimeLeft(`${minutes}m`);
      }
    };

    updateTimeLeft();
    const interval = setInterval(updateTimeLeft, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [challenge.endDate]);

  const handleJoinChallenge = () => {
    joinChallenge(challenge.id, currentUserId, { name: 'Current User 👤', avatar: '👤' });
    playChallengeWin();
    toast({
      title: "Joined Challenge! 🎉",
      description: `You are now part of "${challenge.name}"`,
    });
  };

  const handleLeaveChallenge = () => {
    leaveChallenenge(challenge.id, currentUserId);
    toast({
      title: "Left Challenge",
      description: `You have left "${challenge.name}"`,
    });
  };

  const handleCopyInviteCode = () => {
    if (challenge.inviteCode) {
      navigator.clipboard.writeText(challenge.inviteCode);
      toast({
        title: "Invite Code Copied! 📋",
        description: `Share "${challenge.inviteCode}" with friends`,
      });
    }
  };

  const handleShareChallenge = () => {
    setIsShareOpen(true);
  };

  const getGoalIcon = (goalType: string) => {
    switch (goalType) {
      case 'no-sugar': return '🍯';
      case 'log-meals': return '📝';
      case 'drink-water': return '💧';
      case 'eat-veggies': return '🥬';
      case 'custom': return '✨';
      default: return '🎯';
    }
  };

  const getGoalText = (goalType: string, customGoal?: string) => {
    switch (goalType) {
      case 'no-sugar': return 'No Sugar Challenge';
      case 'log-meals': return 'Log 3 Meals Daily';
      case 'drink-water': return '8 Glasses of Water';
      case 'eat-veggies': return 'Eat Veggies Daily';
      case 'custom': return customGoal || 'Custom Goal';
      default: return 'Challenge Goal';
    }
  };

  // Calculate average progress
  const progressValues = Object.values(challenge.progress);
  const averageProgress = progressValues.length > 0 
    ? progressValues.reduce((sum, progress) => sum + progress, 0) / progressValues.length
    : 0;

  return (
    <>
      <Card className={cn(
        "overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-[1.02] relative",
        challenge.trending && "ring-2 ring-yellow-400 ring-opacity-50",
        isParticipant && "border-primary/50 bg-primary/5"
      )}>
        {/* Header with gradient background */}
        <CardHeader className={cn(
          "relative overflow-hidden",
          challenge.type === 'public' 
            ? "bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30"
            : "bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30"
        )}>
          {/* Trending badge */}
          {challenge.trending && (
            <div className="absolute top-2 right-2">
              <Badge className="bg-yellow-500 text-yellow-900 font-bold animate-pulse">
                🔥 Trending
              </Badge>
            </div>
          )}

          {/* Challenge type indicator */}
          <div className="flex items-center gap-2 mb-2">
            {challenge.type === 'public' ? (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Globe className="h-3 w-3" />
                Public
              </Badge>
            ) : (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Lock className="h-3 w-3" />
                Private
              </Badge>
            )}
            <Badge variant="outline" className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {timeLeft}
            </Badge>
          </div>

          {/* Challenge title and goal */}
          <div className="space-y-2">
            <h3 className="font-bold text-lg leading-tight">{challenge.name}</h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="text-lg">{getGoalIcon(challenge.goalType)}</span>
              <span>{getGoalText(challenge.goalType, challenge.customGoal)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>Created by {challenge.creatorName}</span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 space-y-4">
          {/* Progress Overview */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium">Group Progress</span>
              <span className="text-muted-foreground">{Math.round(averageProgress)}%</span>
            </div>
            <Progress value={averageProgress} className="h-2" />
          </div>

          {/* Participants */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {challenge.participants.length} participants
                  {challenge.maxParticipants && ` / ${challenge.maxParticipants}`}
                </span>
              </div>
            </div>

            {/* Participant Avatars with Progress */}
            <div className="flex flex-wrap gap-3">
              {challenge.participants.slice(0, 6).map((participantId) => {
                const participant = challenge.participantDetails[participantId];
                const progress = challenge.progress[participantId] || 0;
                
                return (
                  <div key={participantId} className="relative group">
                    {/* Progress Ring */}
                    <div className="relative w-12 h-12">
                      <svg className="w-12 h-12 transform -rotate-90">
                        <circle
                          cx="24"
                          cy="24"
                          r="20"
                          stroke="hsl(var(--muted))"
                          strokeWidth="3"
                          fill="none"
                          opacity="0.3"
                        />
                        <circle
                          cx="24"
                          cy="24"
                          r="20"
                          stroke="hsl(var(--primary))"
                          strokeWidth="3"
                          fill="none"
                          strokeDasharray={`${2 * Math.PI * 20}`}
                          strokeDashoffset={`${2 * Math.PI * 20 * (1 - progress / 100)}`}
                          strokeLinecap="round"
                          className="transition-all duration-1000 ease-out"
                        />
                      </svg>
                      
                      {/* Avatar */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Avatar className="h-8 w-8 text-lg border-2 border-background">
                          <AvatarFallback className="text-lg bg-gradient-to-br from-primary/20 to-secondary/20">
                            {participant?.avatar || '👤'}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    </div>

                    {/* Tooltip on hover */}
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-background border rounded-lg p-2 text-xs whitespace-nowrap shadow-lg z-10">
                      <div className="font-medium">{participant?.name || 'Unknown'}</div>
                      <div className="text-muted-foreground">{progress}% complete</div>
                    </div>
                  </div>
                );
              })}

              {challenge.participants.length > 6 && (
                <div className="flex items-center justify-center w-12 h-12 bg-muted rounded-full text-sm font-medium">
                  +{challenge.participants.length - 6}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            {canJoin && (
              <Button 
                onClick={handleJoinChallenge}
                className="flex-1 flex items-center gap-2"
              >
                <UserPlus className="h-4 w-4" />
                Join Challenge
              </Button>
            )}

            {isParticipant && !isCreator && (
              <Button 
                variant="outline"
                onClick={handleLeaveChallenge}
                className="flex-1 flex items-center gap-2"
              >
                <UserMinus className="h-4 w-4" />
                Leave
              </Button>
            )}

            {challenge.type === 'public' && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleShareChallenge}
                className="flex items-center gap-2"
              >
                <Share2 className="h-4 w-4" />
                Share
              </Button>
            )}

            {challenge.type === 'private' && challenge.inviteCode && (
              <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    <Copy className="h-4 w-4" />
                    Invite
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Invite Friends to Challenge</DialogTitle>
                    <DialogDescription>Share the invite code below to invite friends to join this challenge.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="text-center p-4 bg-muted/30 rounded-lg">
                      <div className="text-sm text-muted-foreground mb-2">Invite Code</div>
                      <div className="text-2xl font-bold font-mono">{challenge.inviteCode}</div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-2"
                        onClick={handleCopyInviteCode}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Code
                      </Button>
                    </div>
                    <div className="text-center">
                      <Button onClick={handleShareChallenge} className="w-full">
                        <Share2 className="h-4 w-4 mr-2" />
                        Share Challenge
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}

            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowChat(true)}
              className="flex items-center gap-1"
            >
              <MessageCircle className="h-3 w-3" />
              💬 Chat
            </Button>

            {isParticipant && (
              <Button 
                variant="outline" 
                size="sm"
                className="flex items-center gap-2"
              >
                <Target className="h-4 w-4" />
                View Details
              </Button>
            )}
          </div>
        </CardContent>

        {/* Challenge Chat Modal */}
        <ChallengeChatModal
          open={showChat}
          onOpenChange={setShowChat}
          challengeId={challenge.id}
          challengeName={challenge.name}
          participantCount={challenge.participants.length}
        />

        {/* Floating progress indicator for current user */}
        {isParticipant && (
          <div className="absolute top-4 left-4">
            <Badge className="bg-primary/90 text-primary-foreground font-bold">
              Your Progress: {challenge.progress[currentUserId] || 0}%
            </Badge>
          </div>
        )}
      </Card>
      <ShareComposer 
        open={isShareOpen}
        onOpenChange={setIsShareOpen}
        type="win"
        initialTemplate="win_basic"
        payload={{
          title: challenge.name,
          subtitle: getGoalText(challenge.goalType, challenge.customGoal),
          statBlocks: [
            { label: 'Participants', value: String(challenge.participants.length) },
            { label: 'Time Left', value: timeLeft },
          ],
          emojiOrIcon: '🏆',
          date: new Date().toLocaleDateString(),
          theme: 'dark'
        }}
      />
    </>
  );
};
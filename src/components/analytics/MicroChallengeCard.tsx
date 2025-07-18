import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Clock, Zap, Users } from 'lucide-react';
import { Challenge } from '@/contexts/ChallengeContext';
import { cn } from '@/lib/utils';

interface MicroChallengeCardProps {
  challenge: Challenge;
  onNudgeFriend?: (challengeId: string, friendId: string) => void;
}

export function MicroChallengeCard({ challenge, onNudgeFriend }: MicroChallengeCardProps) {
  const timeLeft = challenge.endDate.getTime() - new Date().getTime();
  const daysLeft = Math.ceil(timeLeft / (1000 * 60 * 60 * 24));
  const hoursLeft = Math.ceil(timeLeft / (1000 * 60 * 60));
  
  const formatTimeLeft = () => {
    if (daysLeft > 1) return `${daysLeft} days left`;
    if (hoursLeft > 1) return `${hoursLeft} hours left`;
    return 'Ending soon!';
  };

  const getParticipantsList = () => {
    return challenge.participants.map(userId => ({
      id: userId,
      ...challenge.participantDetails[userId],
      progress: challenge.progress[userId] || 0
    }));
  };

  const averageProgress = Object.values(challenge.progress).reduce((sum, progress) => sum + progress, 0) / challenge.participants.length;

  return (
    <Card className="min-w-[320px] bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 border-2 border-yellow-200 dark:border-yellow-800 hover:shadow-lg transition-all duration-300">
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-600" />
              <h3 className="font-bold text-lg truncate">{challenge.name}</h3>
            </div>
            <Badge 
              variant="secondary" 
              className={cn(
                "flex items-center gap-1 text-xs",
                daysLeft <= 1 ? "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400" :
                "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400"
              )}
            >
              <Clock className="h-3 w-3" />
              {formatTimeLeft()}
            </Badge>
          </div>

          {/* Overall Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Team Progress</span>
              <span className="font-medium">{Math.round(averageProgress)}%</span>
            </div>
            <Progress value={averageProgress} className="h-2" />
          </div>

          {/* Participants */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              {challenge.participants.length} participant{challenge.participants.length !== 1 ? 's' : ''}
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              {getParticipantsList().map((participant) => (
                <div
                  key={participant.id}
                  className="flex items-center gap-2 p-2 rounded-lg bg-background/60 border"
                >
                  <div className="relative">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">{participant.avatar}</AvatarFallback>
                    </Avatar>
                    
                    {/* Progress Ring */}
                    <svg className="absolute inset-0 w-8 h-8 -rotate-90">
                      <circle
                        cx="16"
                        cy="16"
                        r="14"
                        stroke="currentColor"
                        strokeWidth="2"
                        fill="none"
                        className="text-muted-foreground/20"
                      />
                      <circle
                        cx="16"
                        cy="16"
                        r="14"
                        stroke="currentColor"
                        strokeWidth="2"
                        fill="none"
                        strokeDasharray={`${2 * Math.PI * 14}`}
                        strokeDashoffset={`${2 * Math.PI * 14 * (1 - participant.progress / 100)}`}
                        className={cn(
                          "transition-all duration-500",
                          participant.progress >= 75 ? "text-green-500" :
                          participant.progress >= 50 ? "text-yellow-500" :
                          participant.progress >= 25 ? "text-orange-500" :
                          "text-red-500"
                        )}
                      />
                    </svg>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate">{participant.name}</div>
                    <div className="text-xs text-muted-foreground">{participant.progress}%</div>
                  </div>
                  
                  {/* Nudge Button for friends with low progress */}
                  {participant.id !== 'current-user-id' && participant.progress < 50 && onNudgeFriend && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 hover:bg-primary/10"
                      onClick={() => onNudgeFriend(challenge.id, participant.id)}
                    >
                      🔥
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              size="sm"
              className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
            >
              Update Progress
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
            >
              View Details
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Clock, Trophy, Flame, Users, Crown, Lock } from 'lucide-react';
import { PrivateChallenge, PrivateChallengeParticipation } from '@/hooks/usePrivateChallenges';

interface PrivateChallengeCardProps {
  challenge: PrivateChallenge;
  participation: PrivateChallengeParticipation;
  onUpdateProgress: (challengeId: string, value: number) => Promise<boolean>;
}

// Mock function to get user names - in real app this would come from user profiles
const getUserName = (userId: string) => {
  const mockUsers: Record<string, { name: string; avatar: string }> = {
    '1': { name: 'Sarah Chen', avatar: '👩‍💻' },
    '2': { name: 'Mike Johnson', avatar: '👨‍🍳' },
    '3': { name: 'Emma Wilson', avatar: '👩‍🎨' },
    '4': { name: 'Alex Rodriguez', avatar: '👨‍⚕️' },
    '5': { name: 'Lisa Park', avatar: '👩‍🏫' },
  };
  return mockUsers[userId] || { name: 'Unknown User', avatar: '👤' };
};

export const PrivateChallengeCard: React.FC<PrivateChallengeCardProps> = ({
  challenge,
  participation,
  onUpdateProgress,
}) => {
  const isCompleted = participation.completion_percentage >= 100;
  const isCreator = participation.is_creator;
  const progressPercentage = participation.completion_percentage;
  
  const daysLeft = Math.max(0, Math.ceil(
    (new Date(challenge.start_date).getTime() + challenge.duration_days * 24 * 60 * 60 * 1000 - new Date().getTime()) 
    / (1000 * 60 * 60 * 24)
  ));

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20';
      case 'active': return 'bg-green-500/10 text-green-700 border-green-500/20';
      case 'completed': return 'bg-blue-500/10 text-blue-700 border-blue-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  // Show mock team members (first 4 invited users + creator)
  const teamMembers = [
    getUserName(challenge.creator_id),
    ...challenge.invited_user_ids.slice(0, 3).map(getUserName)
  ];

  return (
    <Card className={`transition-all duration-200 ${
      isCompleted 
        ? 'border-green-500/50 bg-green-50/50 dark:bg-green-950/20' 
        : 'hover:shadow-md'
    }`}>
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{challenge.badge_icon}</span>
                <h4 className="font-semibold">{challenge.title}</h4>
                {isCompleted && <Trophy className="w-4 h-4 text-yellow-500" />}
                {isCreator && <Crown className="w-4 h-4 text-purple-500" />}
              </div>
              
              <p className="text-sm text-muted-foreground mb-2">
                {challenge.description}
              </p>
              
              {/* Status badges */}
              <div className="flex items-center gap-2 flex-wrap mb-3">
                <Badge 
                  variant="outline" 
                  className={`text-xs ${getStatusColor(challenge.status)}`}
                >
                  <Lock className="w-3 h-3 mr-1" />
                  Private
                </Badge>
                
                <Badge 
                  variant={isCompleted ? "default" : "secondary"}
                  className={isCompleted ? "bg-green-500 text-white" : ""}
                >
                  {isCompleted ? 'Completed' : `${Math.round(progressPercentage)}% Complete`}
                </Badge>
                
                {challenge.status === 'pending' && (
                  <Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-700">
                    Starting {new Date(challenge.start_date).toLocaleDateString()}
                  </Badge>
                )}
                
                {challenge.status === 'active' && !isCompleted && (
                  <Badge variant="outline" className="text-xs">
                    <Clock className="w-3 h-3 mr-1" />
                    {daysLeft} days left
                  </Badge>
                )}
                
                {participation.streak_count > 0 && (
                  <Badge variant="outline" className="text-xs">
                    <Flame className="w-3 h-3 mr-1" />
                    {participation.streak_count} day streak
                  </Badge>
                )}
              </div>

              {/* Team Members */}
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-muted-foreground" />
                <div className="flex items-center gap-1">
                  {teamMembers.slice(0, 4).map((member, index) => (
                    <Avatar key={index} className="w-6 h-6 border-2 border-background">
                      <AvatarFallback className="text-xs">{member.avatar}</AvatarFallback>
                    </Avatar>
                  ))}
                  {challenge.invited_user_ids.length > 3 && (
                    <Badge variant="outline" className="text-xs ml-1">
                      +{challenge.invited_user_ids.length - 3} more
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-2">
            <Progress value={progressPercentage} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                {participation.completed_days}/{challenge.duration_days} days completed
              </span>
              <span>
                Target: {challenge.target_value} {challenge.target_unit}/day
              </span>
            </div>
          </div>

          {/* Action buttons */}
          {challenge.status === 'active' && !isCompleted && (
            <div className="flex gap-2 pt-2">
              <Button 
                size="sm" 
                onClick={() => onUpdateProgress(challenge.id, 1)}
                className="flex-1"
              >
                Log Today's Progress
              </Button>
              <Button 
                size="sm" 
                variant="outline"
              >
                Chat
              </Button>
            </div>
          )}

          {challenge.status === 'pending' && (
            <div className="text-xs text-muted-foreground pt-2 border-t">
              Waiting for challenge to start on {new Date(challenge.start_date).toLocaleDateString()}
            </div>
          )}

          {isCompleted && participation.completed_at && (
            <div className="text-xs text-muted-foreground pt-2 border-t">
              Completed on {new Date(participation.completed_at).toLocaleDateString()}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
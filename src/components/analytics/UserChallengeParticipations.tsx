import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Clock, Target, Trophy, Flame } from 'lucide-react';
import { usePublicChallenges } from '@/hooks/usePublicChallenges';

export const UserChallengeParticipations: React.FC = () => {
  const { 
    userParticipations, 
    challenges,
    updateProgress,
    leaveChallenge,
    loading 
  } = usePublicChallenges();

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

  if (userParticipations.length === 0) {
    return (
      <Card className="border-2 border-dashed border-muted">
        <CardContent className="text-center py-8">
          <Target className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <h3 className="font-semibold mb-2">No Active Public Challenges</h3>
          <p className="text-muted-foreground text-sm mb-3">
            Browse and join challenges to start your journey!
          </p>
          <Button variant="outline" size="sm">
            Browse Challenges
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Trophy className="h-5 w-5 text-yellow-500" />
        <h3 className="text-lg font-bold">Public Challenges</h3>
        <Badge variant="secondary">{userParticipations.length} active</Badge>
      </div>

      <div className="space-y-3">
        {userParticipations.map((participation) => {
          const challenge = challenges.find(c => c.id === participation.challenge_id);
          if (!challenge) return null;

          const isCompleted = participation.is_completed;
          const progressPercentage = participation.completion_percentage;
          const daysLeft = Math.max(0, Math.ceil(
            (new Date(participation.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
          ));

          return (
            <Card 
              key={participation.id} 
              className={`transition-all duration-200 ${
                isCompleted 
                  ? 'border-green-500/50 bg-green-50/50 dark:bg-green-950/20' 
                  : 'hover:shadow-md'
              }`}
            >
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
                        <Badge 
                          variant={isCompleted ? "default" : "secondary"}
                          className={isCompleted ? "bg-green-500 text-white" : ""}
                        >
                          {isCompleted ? 'Completed' : `${Math.round(progressPercentage)}% Complete`}
                        </Badge>
                        
                        {!isCompleted && (
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
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-2">
                    <Progress value={progressPercentage} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>
                        {participation.current_progress}/{participation.total_target} 
                        {challenge.target_unit || 'days'}
                      </span>
                      <span>Best streak: {participation.best_streak} days</span>
                    </div>
                  </div>

                  {/* Action buttons */}
                  {!isCompleted && (
                    <div className="flex gap-2 pt-2">
                      <Button 
                        size="sm" 
                        onClick={() => updateProgress(challenge.id, 1)}
                        className="flex-1"
                      >
                        Log Today's Progress
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => leaveChallenge(challenge.id)}
                      >
                        Leave
                      </Button>
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
        })}
      </div>
    </div>
  );
};
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trophy, Flame, Calendar, Target, RefreshCw, Award } from 'lucide-react';
import { useWorkoutTrophy, getAwardConfig } from '@/hooks/useWorkoutTrophy';

interface WorkoutTrophyCardProps {
  className?: string;
  showFullStats?: boolean;
}

export const WorkoutTrophyCard = ({ className, showFullStats = true }: WorkoutTrophyCardProps) => {
  const { currentMonthAward, streak, isLoading, error } = useWorkoutTrophy();

  // Loading skeleton
  if (isLoading) {
    return (
      <Card className={`relative overflow-hidden ${className}`}>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <Trophy className="h-5 w-5 animate-pulse" />
            <span>Monthly Achievement</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {/* Trophy skeleton */}
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 bg-muted animate-pulse rounded-full"></div>
            <div className="space-y-2">
              <div className="h-4 bg-muted animate-pulse rounded-md w-24"></div>
              <div className="h-3 bg-muted animate-pulse rounded-md w-16"></div>
            </div>
          </div>
          
          {/* Stats skeleton */}
          {showFullStats && (
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
              <div className="space-y-2">
                <div className="h-3 bg-muted animate-pulse rounded-md w-1/2"></div>
                <div className="h-6 bg-muted animate-pulse rounded-md w-3/4"></div>
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-muted animate-pulse rounded-md w-1/2"></div>
                <div className="h-6 bg-muted animate-pulse rounded-md w-3/4"></div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className={`bg-gradient-to-br from-destructive/5 to-destructive/10 border-destructive/20 ${className}`}>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <Trophy className="h-5 w-5 text-destructive" />
            <span>Monthly Achievement</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground">
            Unable to load achievement data right now.
          </p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => window.location.reload()}
            className="w-full"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  const awardConfig = getAwardConfig(currentMonthAward.awardLevel);
  const currentMonth = new Date().toLocaleString('default', { month: 'long' });

  // Get motivational message based on progress
  const getMotivationalMessage = () => {
    const { awardLevel, workoutCount } = currentMonthAward;
    const remaining = Math.max(0, 8 - workoutCount);
    
    switch (awardLevel) {
      case 'gold':
        return "🔥 Absolutely crushing it! You're a fitness legend!";
      case 'silver':
        return "⭐ Fantastic work! You're in the champion zone!";
      case 'bronze':
        return "💪 Great progress! You've earned your warrior status!";
      default:
        if (workoutCount >= 5) {
          return `🚀 You're on fire! Just ${remaining} more workouts for Bronze!`;
        } else if (workoutCount >= 1) {
          return `💪 Good start! Keep the momentum going - ${remaining} more for Bronze!`;
        } else {
          return "🎯 Ready to start your fitness journey? Let's crush those goals!";
        }
    }
  };

  const getNextGoalText = () => {
    const { awardLevel, workoutCount } = currentMonthAward;
    
    switch (awardLevel) {
      case 'gold':
        return "🏆 Gold Standard Achieved!";
      case 'silver':
        return `🥇 ${16 - workoutCount} workouts to Gold!`;
      case 'bronze':
        return `🥈 ${12 - workoutCount} workouts to Silver!`;
      default:
        if (workoutCount >= 1) {
          return `🥉 ${8 - workoutCount} workouts to Bronze!`;
        } else {
          return "🎯 Start your first workout!";
        }
    }
  };

  return (
    <Card className={`relative overflow-hidden bg-gradient-to-br ${awardConfig.bgColor} ${awardConfig.borderColor} !border-2 !border-indigo-500/60 bg-gradient-to-r from-indigo-500/30 to-purple-500/30 ${className}`}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between text-lg font-semibold">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            <span>Monthly Achievement</span>
          </div>
          <Badge variant="outline" className={`${awardConfig.bgColor} ${awardConfig.textColor} border-current`}>
            {currentMonth}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-6">
        <div className="space-y-2">
          {/* Trophy Display */}
          <div className="flex items-center gap-4">
            <div className={`h-16 w-16 rounded-full bg-gradient-to-br ${awardConfig.gradient} flex items-center justify-center text-3xl shadow-lg`}>
              {awardConfig.emoji}
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-foreground">
                {awardConfig.title}
              </h3>
              <p className="text-sm text-muted-foreground">
                {currentMonthAward.workoutCount} workouts this month
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {getNextGoalText()}
              </p>
            </div>
          </div>

          {/* Motivational Message */}
          <div className={`p-3 rounded-lg ${awardConfig.bgColor} border ${awardConfig.borderColor}`}>
            <p className="text-sm font-medium text-center text-foreground">
              {getMotivationalMessage()}
            </p>
          </div>

          {/* Stats Grid */}
          {showFullStats && (
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Flame className="h-4 w-4 text-orange-500" />
                  <span className="text-xs text-muted-foreground">Current Streak</span>
                </div>
                <p className="text-lg font-bold text-foreground">
                  {streak.currentStreak}
                  <span className="text-sm font-normal text-muted-foreground ml-1">days</span>
                </p>
              </div>
              
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Award className="h-4 w-4 text-purple-500" />
                  <span className="text-xs text-muted-foreground">Best Streak</span>
                </div>
                <p className="text-lg font-bold text-foreground">
                  {streak.longestStreak}
                  <span className="text-sm font-normal text-muted-foreground ml-1">days</span>
                </p>
              </div>
            </div>
          )}

          {/* Progress towards next level */}
          {currentMonthAward.awardLevel !== 'gold' && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Progress to next level</span>
                <span>
                  {currentMonthAward.workoutCount}/
                  {currentMonthAward.awardLevel === 'silver' ? '16' : 
                   currentMonthAward.awardLevel === 'bronze' ? '12' : '8'}
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className={`h-full bg-gradient-to-r ${awardConfig.gradient} transition-all duration-500`}
                  style={{
                    width: `${Math.min(100, (currentMonthAward.workoutCount / 
                      (currentMonthAward.awardLevel === 'silver' ? 16 : 
                       currentMonthAward.awardLevel === 'bronze' ? 12 : 8)) * 100)}%`
                  }}
                />
              </div>
            </div>
          )}

          {/* Last Workout Info */}
          {streak.lastWorkoutDate && (
            <div className="text-center pt-2 border-t border-border/50">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Calendar className="h-4 w-4 text-green-500" />
                <span className="text-xs text-muted-foreground">Last Workout</span>
              </div>
              <p className="text-sm font-medium text-foreground">
                {new Date(streak.lastWorkoutDate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
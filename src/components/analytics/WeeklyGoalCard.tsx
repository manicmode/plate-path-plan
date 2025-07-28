import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Target, Clock, Calendar, Settings, TrendingUp } from 'lucide-react';
import { useExerciseGoals } from '@/hooks/useExerciseGoals';
import { useRealExerciseData } from '@/hooks/useRealExerciseData';

interface WeeklyGoalCardProps {
  className?: string;
}

export const WeeklyGoalCard = ({ className }: WeeklyGoalCardProps) => {
  const { goal, isLoading: goalLoading } = useExerciseGoals();
  const { summary, weeklyChartData, isLoading: dataLoading } = useRealExerciseData('7d');

  const isLoading = goalLoading || dataLoading;

  if (isLoading) {
    return (
      <Card className={`shadow-lg border-border bg-card animate-pulse ${className}`}>
        <CardContent className="p-6">
          <div className="h-32 bg-muted rounded"></div>
        </CardContent>
      </Card>
    );
  }

  if (!goal) {
    return (
      <Card className={`shadow-lg border-border bg-card dark:!border-2 dark:!border-purple-500/60 dark:bg-gradient-to-r dark:from-purple-500/30 dark:to-violet-500/30 ${className}`}>
        <CardContent className="p-6 text-center">
          <Target className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-muted-foreground">No workout goals set</p>
        </CardContent>
      </Card>
    );
  }

  // Calculate this week's progress
  const thisWeekMinutes = weeklyChartData.reduce((total, day) => total + day.duration, 0);
  const thisWeekSessions = weeklyChartData.filter(day => day.duration > 0).length;
  
  // Calculate progress percentages
  const minutesProgress = Math.min((thisWeekMinutes / goal.weeklyTargetMinutes) * 100, 100);
  const sessionsProgress = Math.min((thisWeekSessions / goal.sessionsPerWeekTarget) * 100, 100);
  
  // Determine if goals are met
  const minutesGoalMet = thisWeekMinutes >= goal.weeklyTargetMinutes;
  const sessionsGoalMet = thisWeekSessions >= goal.sessionsPerWeekTarget;
  const allGoalsMet = minutesGoalMet && sessionsGoalMet;

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return 'from-green-500 to-emerald-500';
    if (progress >= 75) return 'from-blue-500 to-cyan-500';
    if (progress >= 50) return 'from-yellow-500 to-orange-500';
    return 'from-gray-400 to-gray-500';
  };

  return (
    <Card className={`shadow-lg border-border bg-card dark:!border-2 dark:!border-purple-500/60 dark:bg-gradient-to-r dark:from-purple-500/30 dark:to-violet-500/30 ${className}`}>
      <CardHeader>
        <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          🎯 Your Weekly Goal
          {allGoalsMet && (
            <Badge className="bg-green-500 text-white ml-auto">
              ✅ Complete
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Minutes Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <span className="font-medium text-foreground">Weekly Minutes</span>
            </div>
            <span className="text-muted-foreground">
              {thisWeekMinutes} / {goal.weeklyTargetMinutes} min
            </span>
          </div>
          <div className="relative">
            <Progress value={minutesProgress} className="h-2" />
            <div 
              className={`absolute top-0 left-0 h-2 rounded-full bg-gradient-to-r ${getProgressColor(minutesProgress)} transition-all duration-500`}
              style={{ width: `${minutesProgress}%` }}
            />
          </div>
        </div>

        {/* Sessions Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-green-500" />
              <span className="font-medium text-foreground">Weekly Sessions</span>
            </div>
            <span className="text-muted-foreground">
              {thisWeekSessions} / {goal.sessionsPerWeekTarget} sessions
            </span>
          </div>
          <div className="relative">
            <Progress value={sessionsProgress} className="h-2" />
            <div 
              className={`absolute top-0 left-0 h-2 rounded-full bg-gradient-to-r ${getProgressColor(sessionsProgress)} transition-all duration-500`}
              style={{ width: `${sessionsProgress}%` }}
            />
          </div>
        </div>

        {/* Status Messages */}
        <div className="pt-2">
          {allGoalsMet ? (
            <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
              <p className="text-sm text-green-800 dark:text-green-200 font-medium flex items-center gap-2">
                <span className="text-lg">🎉</span>
                Fantastic! You've hit all your weekly goals!
              </p>
            </div>
          ) : (
            <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-800 dark:text-blue-200 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                {minutesProgress > 0 || sessionsProgress > 0 
                  ? "Great progress! Keep it up!" 
                  : "Ready to start your week strong?"
                }
              </p>
            </div>
          )}
        </div>

        {/* AI Adjusted Badge */}
        {goal.aiAdjusted && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="text-purple-500">🤖</span>
            <span>AI-optimized goals</span>
            {goal.lastAdjustedAt && (
              <span>• Updated {new Date(goal.lastAdjustedAt).toLocaleDateString()}</span>
            )}
          </div>
        )}

        {/* Settings Button */}
        <div className="pt-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full flex items-center gap-2"
            onClick={() => {
              // Future: Open goal settings modal
              console.log('Open goal settings');
            }}
          >
            <Settings className="h-4 w-4" />
            Adjust Goals
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useRealExerciseData } from '@/hooks/useRealExerciseData';

export const MonthlyGoalProgress = () => {
  const { summary, isLoading, error } = useRealExerciseData('30d');

  // Mock monthly goal - in a real app this would come from user preferences
  const monthlyWorkoutGoal = 12; // workouts per month
  const monthlyMinutesGoal = 600; // minutes per month

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🎯 Monthly Goal Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="animate-pulse">
              <div className="h-4 bg-muted rounded mb-2"></div>
              <div className="h-6 bg-muted rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🎯 Monthly Goal Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">
            <div className="text-4xl mb-2">📊</div>
            <p>Unable to load goal progress</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Estimate workouts based on duration (assume 50 min average per workout)
  const estimatedWorkouts = Math.floor(summary.totalDuration / 50);
  const workoutProgress = Math.min((estimatedWorkouts / monthlyWorkoutGoal) * 100, 100);
  const minutesProgress = Math.min((summary.totalDuration / monthlyMinutesGoal) * 100, 100);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🎯 Monthly Goal Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Workouts</span>
            <span className="text-sm text-muted-foreground">
              {estimatedWorkouts} / {monthlyWorkoutGoal}
            </span>
          </div>
          <Progress value={workoutProgress} className="h-3" />
          <div className="text-xs text-muted-foreground mt-1">
            {Math.round(workoutProgress)}% complete
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Exercise Minutes</span>
            <span className="text-sm text-muted-foreground">
              {summary.totalDuration} / {monthlyMinutesGoal}
            </span>
          </div>
          <Progress value={minutesProgress} className="h-3" />
          <div className="text-xs text-muted-foreground mt-1">
            {Math.round(minutesProgress)}% complete
          </div>
        </div>

        {(workoutProgress >= 100 || minutesProgress >= 100) && (
          <div className="text-center p-2 bg-success/10 text-success rounded-lg">
            <div className="text-lg">🎉</div>
            <div className="text-sm font-medium">Goal achieved!</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
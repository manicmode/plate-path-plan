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
    <Card className="w-full bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-700 shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-green-900 dark:text-green-100 flex items-center gap-2">
              🎯 Monthly Goal Progress
            </CardTitle>
            <p className="text-sm text-green-600 dark:text-green-300 mt-1">Track your monthly fitness goals</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-4 bg-white/50 dark:bg-white/5 rounded-lg border border-green-200/50">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-semibold text-green-800 dark:text-green-200">Workouts</span>
            <span className="text-sm font-bold text-green-600 dark:text-green-400">
              {estimatedWorkouts} / {monthlyWorkoutGoal}
            </span>
          </div>
          <Progress 
            value={workoutProgress} 
            className="h-3 bg-green-100 dark:bg-green-900/30" 
          />
          <div className="text-xs text-green-600 dark:text-green-400 mt-2 font-medium">
            {Math.round(workoutProgress)}% complete
          </div>
        </div>

        <div className="p-4 bg-white/50 dark:bg-white/5 rounded-lg border border-green-200/50">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-semibold text-green-800 dark:text-green-200">Exercise Minutes</span>
            <span className="text-sm font-bold text-green-600 dark:text-green-400">
              {summary.totalDuration} / {monthlyMinutesGoal}
            </span>
          </div>
          <Progress 
            value={minutesProgress} 
            className="h-3 bg-green-100 dark:bg-green-900/30" 
          />
          <div className="text-xs text-green-600 dark:text-green-400 mt-2 font-medium">
            {Math.round(minutesProgress)}% complete
          </div>
        </div>

        {(workoutProgress >= 100 || minutesProgress >= 100) && (
          <div className="text-center p-4 bg-gradient-to-r from-green-400 to-emerald-400 text-white rounded-lg shadow-lg">
            <div className="text-2xl mb-1">🎉</div>
            <div className="text-sm font-bold">Goal achieved! Keep up the great work!</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
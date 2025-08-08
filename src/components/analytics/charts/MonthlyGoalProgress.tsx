import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useWorkoutAnalytics } from '@/hooks/useWorkoutAnalytics';

export const MonthlyGoalProgress = () => {
  const { workoutHistory, isLoading, error } = useWorkoutAnalytics();

  if (isLoading) {
    return (
      <Card className="w-full shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
            🎯 Progress Toward Monthly Goal
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-32">
          <div className="text-center text-muted-foreground">
            Loading progress data...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !workoutHistory) {
    return (
      <Card className="w-full shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
            🎯 Progress Toward Monthly Goal
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-32">
          <div className="text-center text-muted-foreground">
            <div className="text-4xl mb-2">🎯</div>
            <p>No workout data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate monthly stats
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  const monthlyWorkouts = workoutHistory.filter(workout => {
    const workoutDate = new Date(workout.date);
    return workoutDate.getMonth() === currentMonth && workoutDate.getFullYear() === currentYear;
  });

  const completedWorkouts = monthlyWorkouts.length;
  const totalMinutes = monthlyWorkouts.reduce((sum, workout) => sum + (workout.duration || 0), 0);
  
  // Goals (these could be user-defined in the future)
  const targetWorkouts = 20; // 20 workouts per month
  const targetMinutes = 600; // 600 minutes per month (10 hours)
  
  const workoutProgress = Math.min((completedWorkouts / targetWorkouts) * 100, 100);
  const minuteProgress = Math.min((totalMinutes / targetMinutes) * 100, 100);

  return (
    <Card className="w-full shadow-lg">
      <CardHeader>
        <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
          🎯 Progress Toward Monthly Goal
        </CardTitle>
        <p className="text-sm text-muted-foreground">Track your monthly fitness targets</p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Workouts Goal */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-foreground">Workouts</span>
            <span className="text-sm text-muted-foreground">{completedWorkouts}/{targetWorkouts}</span>
          </div>
          <Progress value={workoutProgress} className="h-2" />
          <div className="text-xs text-muted-foreground text-right">
            {workoutProgress.toFixed(1)}% complete
          </div>
        </div>

        {/* Minutes Goal */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-foreground">Minutes</span>
            <span className="text-sm text-muted-foreground">{totalMinutes}/{targetMinutes} min</span>
          </div>
          <Progress value={minuteProgress} className="h-2" />
          <div className="text-xs text-muted-foreground text-right">
            {minuteProgress.toFixed(1)}% complete
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
          <div className="text-center">
            <div className="text-lg font-bold text-primary">{completedWorkouts}</div>
            <div className="text-xs text-muted-foreground">Workouts</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-primary">{Math.round(totalMinutes / 60 * 10) / 10}h</div>
            <div className="text-xs text-muted-foreground">Total Time</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Activity, Calendar, Target, TrendingUp } from 'lucide-react';
import { WorkoutTypesChart } from '@/components/analytics/WorkoutTypesChart';
import { ExerciseProgressChart } from '@/components/analytics/ExerciseProgressChart';
import { ExerciseStatsCard } from '@/components/analytics/ExerciseStatsCard';
import { MonthlyExerciseReportCard } from '@/components/exercise/MonthlyExerciseReportCard';
import { useRealExerciseData } from '@/hooks/useRealExerciseData';
import { useWeeklyExerciseInsights } from '@/hooks/useWeeklyExerciseInsights';

export const ExerciseAnalyticsSection = () => {
  const { summary, weeklyChartData, isLoading } = useRealExerciseData('30d');
  const { latestInsight } = useWeeklyExerciseInsights();

  // Mock data for workout types (would come from real data in production)
  const workoutTypesData = [
    { type: 'Strength', count: 8, emoji: '💪', color: '#3B82F6' },
    { type: 'Cardio', count: 5, emoji: '🏃', color: '#10B981' },
    { type: 'Yoga', count: 3, emoji: '🧘', color: '#8B5CF6' },
    { type: 'HIIT', count: 2, emoji: '🔥', color: '#EF4444' }
  ];

  // Mock muscle group data
  const muscleGroupData = [
    { group: 'Legs', frequency: 8 },
    { group: 'Arms', frequency: 6 },
    { group: 'Core', frequency: 5 },
    { group: 'Back', frequency: 4 },
    { group: 'Chest', frequency: 3 }
  ];

  // Format duration chart data
  const durationChartData = weeklyChartData.map((day, index) => ({
    date: `${new Date().getMonth() + 1}/${new Date().getDate() - (6 - index)}`,
    duration: day.duration
  }));

  // Calculate workout streak (mock calculation)
  const workoutStreak = 5;
  const weeklyFrequency = latestInsight?.workouts_completed || 3;
  const consistencyPercentage = Math.min((weeklyFrequency / 4) * 100, 100);

  const exerciseStats = [
    {
      icon: Activity,
      label: 'Total Workouts',
      value: summary.totalSteps > 0 ? Math.floor(summary.totalDuration / 45) : 0,
      color: 'from-blue-500 to-blue-600'
    },
    {
      icon: Calendar,
      label: 'Weekly Average',
      value: `${weeklyFrequency}/week`,
      color: 'from-green-500 to-green-600'
    },
    {
      icon: Target,
      label: 'Current Streak',
      value: `${workoutStreak} days`,
      color: 'from-purple-500 to-purple-600'
    },
    {
      icon: TrendingUp,
      label: 'Consistency',
      value: `${Math.round(consistencyPercentage)}%`,
      color: 'from-orange-500 to-orange-600'
    }
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-64 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Exercise Stats Overview */}
      <ExerciseStatsCard stats={exerciseStats} />

      {/* Workout Frequency & Duration Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-lg border-border bg-card">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              📅 Weekly Workout Frequency
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">This Week</span>
                <span className="text-2xl font-bold text-foreground">{weeklyFrequency}</span>
              </div>
              <Progress value={consistencyPercentage} className="h-3" />
              <p className="text-sm text-muted-foreground">
                You're staying consistent with {weeklyFrequency} workouts per week
              </p>
            </div>
          </CardContent>
        </Card>

        <ExerciseProgressChart data={durationChartData} />
      </div>

      {/* Workout Types & Muscle Groups */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <WorkoutTypesChart data={workoutTypesData} />
        
        <Card className="shadow-lg border-border bg-card">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              🎯 Muscle Group Focus
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {muscleGroupData.map((muscle) => (
                <div key={muscle.group} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">{muscle.group}</span>
                  <div className="flex items-center gap-2 flex-1 ml-4">
                    <Progress value={(muscle.frequency / 8) * 100} className="h-2" />
                    <span className="text-xs text-muted-foreground min-w-8">{muscle.frequency}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Report */}
      <MonthlyExerciseReportCard />

      {/* Workout Trends Summary */}
      {latestInsight && (
        <Card className="shadow-lg border-border bg-card">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              📈 Workout Trends & Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-muted/30 rounded-lg">
                <h4 className="font-semibold text-foreground mb-2">{latestInsight.motivational_headline}</h4>
                <p className="text-sm text-muted-foreground mb-3">{latestInsight.progress_message}</p>
                <div className="text-sm">
                  <span className="font-medium text-foreground">💡 Tip: </span>
                  <span className="text-muted-foreground">{latestInsight.suggestion_tip}</span>
                </div>
              </div>
              
              {latestInsight.most_frequent_muscle_groups?.length > 0 && (
                <div>
                  <h5 className="font-medium text-foreground mb-2">Most Worked Muscle Groups:</h5>
                  <div className="flex flex-wrap gap-2">
                    {latestInsight.most_frequent_muscle_groups.map((group, index) => (
                      <span 
                        key={index}
                        className="px-3 py-1 bg-primary/10 text-primary text-xs rounded-full"
                      >
                        {group}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
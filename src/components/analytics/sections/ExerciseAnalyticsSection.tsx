import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Activity, Calendar, Target, TrendingUp } from 'lucide-react';
import { WorkoutTypesChart } from '@/components/analytics/WorkoutTypesChart';
import { ExerciseProgressChart } from '@/components/analytics/ExerciseProgressChart';
import { ExerciseStatsCard } from '@/components/analytics/ExerciseStatsCard';
import { WorkoutFrequencyChart } from '@/components/analytics/WorkoutFrequencyChart';
import { MuscleGroupRadarChart } from '@/components/analytics/MuscleGroupRadarChart';
import { WorkoutConsistencyChart } from '@/components/analytics/WorkoutConsistencyChart';
import { StreakTrackerCard } from '@/components/analytics/StreakTrackerCard';
import { SmartTrendInsightsCard } from '@/components/analytics/SmartTrendInsightsCard';
import { MonthlyExerciseReportCard } from '@/components/exercise/MonthlyExerciseReportCard';
import { PerformanceChartsSection } from '@/components/analytics/PerformanceChartsSection';
import { useWorkoutAnalytics } from '@/hooks/useWorkoutAnalytics';

export const ExerciseAnalyticsSection = () => {
  const {
    workoutHistory,
    streaks,
    muscleGroupData,
    trendData,
    insights: aiInsights,
    isLoading,
    summary,
    weeklyChartData,
    latestInsight,
  } = useWorkoutAnalytics();

  // Format workout frequency data from real exercise data
  const workoutFrequencyData = weeklyChartData.map((day) => ({
    day: day.day,
    workouts: day.duration > 0 ? 1 : 0, // Count days with any workout
    calories: day.calories,
    duration: day.duration
  }));

  // Format duration chart data
  const durationChartData = weeklyChartData.map((day, index) => ({
    date: `${new Date().getMonth() + 1}/${new Date().getDate() - (6 - index)}`,
    duration: day.duration
  }));

  // Calculate workout metrics from real data
  const totalWorkouts = workoutHistory.length;
  const weeklyFrequency = latestInsight?.workouts_completed || Math.round(totalWorkouts / 4.3); // 30 days ≈ 4.3 weeks
  const workoutStreak = streaks.current;
  const longestStreak = streaks.longest;
  const plannedWorkouts = 20; // Keep as configurable goal
  const consistencyPercentage = Math.min((weeklyFrequency / 4) * 100, 100);

  const exerciseStats = [
    {
      icon: Activity,
      label: 'Total Workouts',
      value: totalWorkouts,
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
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-32 bg-muted rounded"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

return (
  <div className="space-y-4">
    {/* Quick Action Button */}
    <Card className="w-full shadow-lg bg-card dark:!border-2 dark:!border-purple-500/60 dark:bg-gradient-to-r dark:from-purple-500/30 dark:to-blue-500/30">
      <CardContent className="p-6 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-2xl">📅</div>
            <div>
              <h4 className="font-semibold text-foreground">AI Workout Plan</h4>
              <p className="text-sm text-muted-foreground">View your complete 8-week routine</p>
            </div>
          </div>
          <Button 
            onClick={() => window.location.href = '/ai-routine-viewer'}
            className="bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700"
          >
            View Plan
          </Button>
        </div>
      </CardContent>
    </Card>

    {/* Exercise Stats Overview */}
    <ExerciseStatsCard stats={exerciseStats} />

    {/* Workout Frequency & Duration Charts */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      <WorkoutFrequencyChart data={workoutFrequencyData} />
      <ExerciseProgressChart data={durationChartData} />
    </div>

    {/* Muscle Groups & Consistency */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      {totalWorkouts > 0 && muscleGroupData.length > 0 ? (
        <MuscleGroupRadarChart data={muscleGroupData} />
      ) : (
        <Card className="w-full shadow-lg dark:!border-2 dark:!border-orange-500/60 dark:bg-gradient-to-r dark:from-orange-500/30 dark:to-red-500/30 bg-card">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              🎯 Muscle Group Coverage
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 pb-4">
            <div className="opacity-60 mb-4">
              <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center mb-3">
                <span className="text-2xl">💪</span>
              </div>
            </div>
            <p className="text-muted-foreground">Complete workouts to see your muscle group distribution!</p>
          </CardContent>
        </Card>
      )}
      <WorkoutConsistencyChart 
        completedWorkouts={totalWorkouts} 
        plannedWorkouts={plannedWorkouts} 
      />
    </div>

    {/* Streak Tracker */}
    <StreakTrackerCard 
      currentStreak={workoutStreak}
      longestStreak={longestStreak}
      weeklyGoal={4}
      thisWeekWorkouts={weeklyFrequency}
    />

    {/* Smart Trend Insights */}
    <SmartTrendInsightsCard 
      trends={trendData}
      insights={aiInsights}
    />

    {/* Monthly Exercise Report */}
    <MonthlyExerciseReportCard />

    {/* Performance Charts Section */}
    <PerformanceChartsSection />
  </div>
);

};
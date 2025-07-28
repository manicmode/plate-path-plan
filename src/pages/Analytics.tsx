import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Activity, Calendar, Target, TrendingUp } from 'lucide-react';
import { DailyProgressSection } from '@/components/analytics/sections/DailyProgressSection';
import { DailyAveragesSection } from '@/components/analytics/sections/DailyAveragesSection';
import { MealQualityAnalyticsSection } from '@/components/analytics/sections/MealQualityAnalyticsSection';
import { SmartInsightsSection } from '@/components/analytics/sections/SmartInsightsSection';
import { TagInsightsSection } from '@/components/analytics/sections/TagInsightsSection';
import { MacrosHydrationSection } from '@/components/analytics/sections/MacrosHydrationSection';
import { ActivityExerciseSection } from '@/components/analytics/sections/ActivityExerciseSection';
import { AchievementsSection } from '@/components/analytics/sections/AchievementsSection';
import { GamificationSection } from '@/components/analytics/sections/GamificationSection';
import { MonthlySummaryViewer } from '@/components/analytics/MonthlySummaryViewer';
import { MoodWellnessTrendChart } from '@/components/analytics/MoodWellnessTrendChart';
import { ExerciseProgressChart } from '@/components/analytics/ExerciseProgressChart';
import { ExerciseStatsCard } from '@/components/analytics/ExerciseStatsCard';
import { WorkoutFrequencyChart } from '@/components/analytics/WorkoutFrequencyChart';
import { MuscleGroupRadarChart } from '@/components/analytics/MuscleGroupRadarChart';
import { WorkoutConsistencyChart } from '@/components/analytics/WorkoutConsistencyChart';
import { StreakTrackerCard } from '@/components/analytics/StreakTrackerCard';
import { SmartTrendInsightsCard } from '@/components/analytics/SmartTrendInsightsCard';
import { MonthlyExerciseReportCard } from '@/components/exercise/MonthlyExerciseReportCard';
import { MotivationCard } from '@/components/analytics/MotivationCard';
import { WorkoutTrophyCard } from '@/components/analytics/WorkoutTrophyCard';
import { useAnalyticsCalculations } from '@/components/analytics/utils/analyticsCalculations';
import { useRealExerciseData } from '@/hooks/useRealExerciseData';
import { useWeeklyExerciseInsights } from '@/hooks/useWeeklyExerciseInsights';
import { useMilestoneTracker } from '@/hooks/useMilestoneTracker';

export default function Analytics() {
  const [activeTab, setActiveTab] = useState('nutrition');
  const {
    progress,
    weeklyAverage,
    macroData,
    stepsData,
    exerciseCaloriesData
  } = useAnalyticsCalculations();

  // Exercise analytics data
  const { summary, weeklyChartData, isLoading: exerciseLoading } = useRealExerciseData('30d');
  const { latestInsight } = useWeeklyExerciseInsights();

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

  // Muscle group data based on insights
  const muscleGroupData = latestInsight?.most_frequent_muscle_groups?.map(group => ({
    muscle: group,
    frequency: Math.floor(Math.random() * 10) + 5, // Mock frequency, would come from real data
    fullMark: 15
  })) || [
    { muscle: 'Legs', frequency: 12, fullMark: 15 },
    { muscle: 'Arms', frequency: 8, fullMark: 15 },
    { muscle: 'Core', frequency: 10, fullMark: 15 },
    { muscle: 'Back', frequency: 6, fullMark: 15 },
    { muscle: 'Chest', frequency: 5, fullMark: 15 },
    { muscle: 'Shoulders', frequency: 7, fullMark: 15 }
  ];

  // Calculate workout metrics
  const totalWorkouts = workoutFrequencyData.reduce((sum, day) => sum + day.workouts, 0);
  const weeklyFrequency = latestInsight?.workouts_completed || totalWorkouts;
  const workoutStreak = 5; // Mock - would come from real calculation
  const longestStreak = 12; // Mock - would come from user data
  const plannedWorkouts = 20; // Mock monthly goal
  const consistencyPercentage = Math.min((weeklyFrequency / 4) * 100, 100);

  // Trend data for insights
  const trendData = [
    {
      metric: 'Avg Duration',
      value: Math.round(summary.totalDuration / Math.max(totalWorkouts, 1)),
      change: 15,
      trend: 'up' as const,
      unit: 'min'
    },
    {
      metric: 'Weekly Frequency',
      value: weeklyFrequency,
      change: -5,
      trend: 'down' as const,
      unit: 'workouts'
    },
    {
      metric: 'Calories/Session',
      value: Math.round(summary.totalCalories / Math.max(totalWorkouts, 1)),
      change: 8,
      trend: 'up' as const,
      unit: 'kcal'
    },
    {
      metric: 'Consistency',
      value: Math.round(consistencyPercentage),
      change: 0,
      trend: 'stable' as const,
      unit: '%'
    }
  ];

  const aiInsights = [
    "Your workout duration has increased by 15% this month - great progress!",
    "Consider adding more leg exercises to balance your muscle group coverage.",
    "Your consistency is strong, but try to maintain at least 4 workouts per week.",
    "Your calories burned per session is trending upward, indicating improved intensity."
  ];

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

  // Initialize milestone tracking to check for new achievements
  useMilestoneTracker();

  return (
    <div className="p-4 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Analytics Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Track your progress and patterns</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
          <TabsTrigger value="nutrition" className="text-sm font-medium">
            🍎 Nutrition
          </TabsTrigger>
          <TabsTrigger value="exercise" className="text-sm font-medium">
            💪 Exercise
          </TabsTrigger>
        </TabsList>

        <TabsContent value="nutrition" className="space-y-6 mt-6">
          <DailyProgressSection progress={progress} weeklyAverage={weeklyAverage} />
          <DailyAveragesSection weeklyAverage={weeklyAverage} />
          <MealQualityAnalyticsSection />
          <SmartInsightsSection />
          <TagInsightsSection />
          <MacrosHydrationSection macroData={macroData} progress={progress} />
          <ActivityExerciseSection stepsData={stepsData} exerciseCaloriesData={exerciseCaloriesData} weeklyAverage={weeklyAverage} />
          <AchievementsSection />
          <GamificationSection />
          <MonthlySummaryViewer />
          <MoodWellnessTrendChart />
        </TabsContent>

        <TabsContent value="exercise" className="space-y-4 pt-4 pb-20">
          {exerciseLoading ? (
            <>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="space-y-2">
                      <div className="h-4 bg-muted rounded w-3/4"></div>
                      <div className="h-32 bg-muted rounded"></div>
                      <div className="h-3 bg-muted rounded w-1/2"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          ) : (
            <>
              {/* AI Workout Plan and Exercise Stats - tight spacing */}
              <div className="space-y-2">
                {/* AI Workout Plan Card */}
                <Card className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-purple-200 dark:border-purple-800">
                  <CardContent className="p-6">
                    <div className="space-y-2">
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
                    </div>
                  </CardContent>
                </Card>

                {/* Exercise Stats */}
                <ExerciseStatsCard stats={exerciseStats} />
              </div>

              {/* Charts with tight spacing */}
              <div className="space-y-2">
                {/* Charts Row 1 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <WorkoutFrequencyChart data={workoutFrequencyData} />
                  <ExerciseProgressChart data={durationChartData} />
                </div>

                {/* Charts Row 2 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {totalWorkouts > 0 ? (
                    <MuscleGroupRadarChart data={muscleGroupData} />
                  ) : (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                          🎯 Muscle Group Coverage
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6">
                        <div className="space-y-2">
                          <div className="text-center py-8">
                            <div className="opacity-60 mb-3">
                              <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center mb-3">
                                <span className="text-2xl">💪</span>
                              </div>
                            </div>
                            <p className="text-muted-foreground">Start logging workouts to see your muscle group stats!</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  <WorkoutConsistencyChart completedWorkouts={totalWorkouts} plannedWorkouts={plannedWorkouts} />
                </div>
              </div>

              {/* Streak Tracker */}
              <StreakTrackerCard 
                currentStreak={workoutStreak}
                longestStreak={longestStreak}
                weeklyGoal={4}
                thisWeekWorkouts={weeklyFrequency}
              />

              {/* Smart Insights and Monthly Report - tight spacing */}
              <div className="space-y-2">
                {/* Smart Insights */}
                <SmartTrendInsightsCard 
                  trends={trendData}
                  insights={aiInsights}
                />

                {/* Monthly Report */}
                <MonthlyExerciseReportCard />
              </div>

              {/* Trophy & Motivation */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <WorkoutTrophyCard showFullStats={false} />
                <MotivationCard />
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

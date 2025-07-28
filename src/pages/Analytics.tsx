import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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
import { ExerciseAnalyticsSection } from '@/components/analytics/sections/ExerciseAnalyticsSection';
import { MotivationCard } from '@/components/analytics/MotivationCard';
import { WorkoutTrophyCard } from '@/components/analytics/WorkoutTrophyCard';
import { useAnalyticsCalculations } from '@/components/analytics/utils/analyticsCalculations';
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

<TabsContent value="exercise">
  <div className="flex flex-col gap-6 pb-24">
    {/* Place all exercise components inside this container */}
    <WorkoutPlanCard />
    <ExerciseStatsCard />
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
      <WorkoutFrequencyChart />
      <WorkoutDurationTrend />
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
      <MuscleGroupRadarChart />
      <WorkoutConsistencyChart />
    </div>
    <StreakTrackerCard />
    <SmartTrendInsightsCard />
    <MonthlyExerciseReportCard />
    <WorkoutTrophyCard />
    <MotivationCard />
    <CoachSaysCard />
  </div>
</TabsContent>

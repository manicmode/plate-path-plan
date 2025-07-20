import React, { useState, useEffect } from 'react';
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
import { useAnalyticsCalculations } from '@/components/analytics/utils/analyticsCalculations';

export default function Analytics() {
  const {
    progress,
    weeklyAverage,
    macroData,
    stepsData,
    exerciseCaloriesData
  } = useAnalyticsCalculations();

  return (
    <div className="p-4 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Analytics Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Track your nutrition progress and patterns</p>
      </div>

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
    </div>
  );
}

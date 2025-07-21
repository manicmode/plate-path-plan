
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
import { useRealNutritionData } from '@/hooks/useRealNutritionData';
import { useRealHydrationData } from '@/hooks/useRealHydrationData';

export default function Analytics() {
  const { todayTotal: nutritionToday } = useRealNutritionData(1);
  const { todayTotal: hydrationToday } = useRealHydrationData(1);

  // Real macro data from today's nutrition
  const macroData = [
    { name: 'Protein', value: nutritionToday.protein, color: '#10B981', percentage: 30 },
    { name: 'Carbs', value: nutritionToday.carbs, color: '#F59E0B', percentage: 45 },
    { name: 'Fat', value: nutritionToday.fat, color: '#8B5CF6', percentage: 25 },
  ];

  return (
    <div className="p-4 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Analytics Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Track your nutrition progress and patterns</p>
      </div>

      <DailyProgressSection />
      <DailyAveragesSection weeklyAverage={{}} />
      <MealQualityAnalyticsSection />
      <SmartInsightsSection />
      <TagInsightsSection />
      <MacrosHydrationSection macroData={macroData} progress={{ hydration: hydrationToday }} />
      <ActivityExerciseSection />
      <AchievementsSection />
      <GamificationSection />
      <MonthlySummaryViewer />
      <MoodWellnessTrendChart />
    </div>
  );
}

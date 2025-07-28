import React, { useState } from 'react';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs';

import DailyProgressSection from '@/sections/analytics/DailyProgressSection';
import DailyAveragesSection from '@/sections/analytics/DailyAveragesSection';
import MealQualityAnalyticsSection from '@/sections/analytics/MealQualityAnalyticsSection';
import SmartInsightsSection from '@/sections/analytics/SmartInsightsSection';
import TagInsightsSection from '@/sections/analytics/TagInsightsSection';
import MacrosHydrationSection from '@/sections/analytics/MacrosHydrationSection';
import ActivityExerciseSection from '@/sections/analytics/ActivityExerciseSection';
import AchievementsSection from '@/sections/analytics/AchievementsSection';
import GamificationSection from '@/sections/analytics/GamificationSection';
import MonthlySummaryViewer from '@/sections/analytics/MonthlySummaryViewer';
import MoodWellnessTrendChart from '@/sections/analytics/MoodWellnessTrendChart';

import WorkoutPlanCard from '@/components/WorkoutPlanCard';
import ExerciseStatsCard from '@/components/ExerciseStatsCard';
import WorkoutFrequencyChart from '@/components/WorkoutFrequencyChart';
import WorkoutDurationTrend from '@/components/WorkoutDurationTrend';
import MuscleGroupRadarChart from '@/components/MuscleGroupRadarChart';
import WorkoutConsistencyChart from '@/components/WorkoutConsistencyChart';
import StreakTrackerCard from '@/components/StreakTrackerCard';
import SmartTrendInsightsCard from '@/components/SmartTrendInsightsCard';
import MonthlyExerciseReportCard from '@/components/MonthlyExerciseReportCard';
import WorkoutTrophyCard from '@/components/WorkoutTrophyCard';
import MotivationCard from '@/components/MotivationCard';
import CoachSaysCard from '@/components/CoachSaysCard';

import { useWeeklyAverage } from '@/hooks/useWeeklyAverage';
import { useProgress } from '@/hooks/useProgress';
import { useMacroData } from '@/hooks/useMacroData';
import { useStepsData } from '@/hooks/useStepsData';
import { useExerciseCaloriesData } from '@/hooks/useExerciseCaloriesData';

export default function Analytics() {
  const [activeTab, setActiveTab] = useState('nutrition');

  const progress = useProgress();
  const weeklyAverage = useWeeklyAverage();
  const macroData = useMacroData();
  const stepsData = useStepsData();
  const exerciseCaloriesData = useExerciseCaloriesData();

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

        {/* Nutrition Content */}
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

        {/* Exercise Content */}
        <TabsContent value="exercise" className="space-y-6 mt-6 pb-24">
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
        </TabsContent>
      </Tabs>
    </div>
  );
}

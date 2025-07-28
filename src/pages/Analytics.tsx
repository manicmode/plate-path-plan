import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

import DailyProgressSection from '../components/DailyProgressSection';
import DailyAveragesSection from '../components/DailyAveragesSection';
import MealQualityAnalyticsSection from '../components/MealQualityAnalyticsSection';
import SmartInsightsSection from '../components/SmartInsightsSection';
import TagInsightsSection from '../components/TagInsightsSection';
import MacrosHydrationSection from '../components/MacrosHydrationSection';
import ActivityExerciseSection from '../components/ActivityExerciseSection';
import AchievementsSection from '../components/AchievementsSection';
import GamificationSection from '../components/GamificationSection';
import MonthlySummaryViewer from '../components/MonthlySummaryViewer';
import MoodWellnessTrendChart from '../components/MoodWellnessTrendChart';

import WorkoutPlanCard from '../components/WorkoutPlanCard';
import ExerciseStatsCard from '../components/ExerciseStatsCard';
import WorkoutFrequencyChart from '../components/WorkoutFrequencyChart';
import WorkoutDurationTrend from '../components/WorkoutDurationTrend';
import MuscleGroupRadarChart from '../components/MuscleGroupRadarChart';
import WorkoutConsistencyChart from '../components/WorkoutConsistencyChart';
import StreakTrackerCard from '../components/StreakTrackerCard';
import SmartTrendInsightsCard from '../components/SmartTrendInsightsCard';
import MonthlyExerciseReportCard from '../components/MonthlyExerciseReportCard';
import WorkoutTrophyCard from '../components/WorkoutTrophyCard';
import MotivationCard from '../components/MotivationCard';
import CoachSaysCard from '../components/CoachSaysCard';

const Analytics = () => {
  const [activeTab, setActiveTab] = useState('nutrition');

  // Placeholder data (replace with real data)
  const progress = {};
  const weeklyAverage = {};
  const macroData = {};
  const stepsData = {};
  const exerciseCaloriesData = {};

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

        {/* Nutrition Tab */}
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

        {/* Exercise Tab */}
        <TabsContent value="exercise" className="space-y-6 mt-6">
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
};

export default Analytics;

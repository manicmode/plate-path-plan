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
import { RecoveryAnalyticsSection } from '@/components/analytics/sections/RecoveryAnalyticsSection';
import { MealQualityTrendChart } from '@/components/analytics/charts/MealQualityTrendChart';
import { FlaggedIngredientHistoryChart } from '@/components/analytics/charts/FlaggedIngredientHistoryChart';
import { TopFoodsWeekChart } from '@/components/analytics/charts/TopFoodsWeekChart';
import { WeeklyWorkoutDurationChart } from '@/components/analytics/charts/WeeklyWorkoutDurationChart';
import { CaloriesBurnedChart } from '@/components/analytics/charts/CaloriesBurnedChart';
import { MuscleGroupDistributionChart } from '@/components/analytics/charts/MuscleGroupDistributionChart';
import { MonthlyGoalProgress } from '@/components/analytics/charts/MonthlyGoalProgress';
import { BestStreakHistoryChart } from '@/components/analytics/charts/BestStreakHistoryChart';
import { useAnalyticsCalculations } from '@/components/analytics/utils/analyticsCalculations';
import { useMilestoneTracker } from '@/hooks/useMilestoneTracker';
import { SectionHeader } from '@/components/analytics/ui/SectionHeader';
import { Activity, Apple, Heart } from 'lucide-react';

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
        <TabsList className="grid w-full grid-cols-3 max-w-lg mx-auto">
          <TabsTrigger value="nutrition" className="text-sm font-medium">
            🍎 Nutrition
          </TabsTrigger>
          <TabsTrigger value="exercise" className="text-sm font-medium">
            💪 Exercise
          </TabsTrigger>
          <TabsTrigger value="recovery" className="text-sm font-medium">
            🧘 Recovery
          </TabsTrigger>
        </TabsList>

        <TabsContent value="nutrition" className="space-y-6 mt-6">
          <SectionHeader 
            icon={Apple} 
            title="Daily Overview" 
            subtitle="Today's nutrition progress and breakdown" 
          />
          <DailyProgressSection progress={progress} weeklyAverage={weeklyAverage} />
          <MacrosHydrationSection macroData={macroData} progress={progress} />
          
          <SectionHeader 
            icon={Apple} 
            title="Meal Quality & Trends" 
            subtitle="Food quality insights and consumption patterns" 
          />
          <MealQualityAnalyticsSection />
          <MealQualityTrendChart />
          <FlaggedIngredientHistoryChart />
          <TopFoodsWeekChart />
          
          <SectionHeader 
            icon={Apple} 
            title="Insights & Analysis" 
            subtitle="AI-powered recommendations and behavioral patterns" 
          />
          <TagInsightsSection />
          <SmartInsightsSection />
          <DailyAveragesSection weeklyAverage={weeklyAverage} />
          
          <SectionHeader 
            icon={Apple} 
            title="Progress & Achievements" 
            subtitle="Your nutrition journey and milestones" 
          />
          <AchievementsSection />
          <GamificationSection />
          <MonthlySummaryViewer />
        </TabsContent>

        <TabsContent value="exercise" className="space-y-6 mt-6">
          <SectionHeader 
            icon={Activity} 
            title="Workout Performance" 
            subtitle="Recent training activity and daily metrics" 
          />
          <WeeklyWorkoutDurationChart />
          <ActivityExerciseSection stepsData={stepsData} exerciseCaloriesData={exerciseCaloriesData} weeklyAverage={weeklyAverage} progress={progress} />
          
          <SectionHeader 
            icon={Activity} 
            title="Training Breakdown" 
            subtitle="Detailed analysis of your workout patterns" 
          />
          <ExerciseAnalyticsSection />
          <CaloriesBurnedChart />
          <MuscleGroupDistributionChart />
          
          <SectionHeader 
            icon={Activity} 
            title="Goals & Achievements" 
            subtitle="Progress tracking and motivational insights" 
          />
          <MonthlyGoalProgress />
          <BestStreakHistoryChart />
          <WorkoutTrophyCard />
          <MotivationCard />
        </TabsContent>

        <TabsContent value="recovery" className="space-y-6 mt-6">
          <SectionHeader 
            icon={Heart} 
            title="Mind & Body Wellness" 
            subtitle="Mood trends and recovery insights" 
          />
          <MoodWellnessTrendChart />
          <RecoveryAnalyticsSection weeklyAverage={weeklyAverage} />
        </TabsContent>

      </Tabs>
    </div>
  );
}

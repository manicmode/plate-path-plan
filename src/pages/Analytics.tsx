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

import { ExerciseAnalyticsSection } from '@/components/analytics/sections/ExerciseAnalyticsSection';
import { MotivationCard } from '@/components/analytics/MotivationCard';
import { WorkoutTrophyCard } from '@/components/analytics/WorkoutTrophyCard';
import { RecoveryAnalyticsSection } from '@/components/analytics/sections/RecoveryAnalyticsSection';
import { MealQualityTrendChart } from '@/components/analytics/charts/MealQualityTrendChart';
import { FlaggedIngredientHistoryChart } from '@/components/analytics/charts/FlaggedIngredientHistoryChart';
import { TopFoodsWeekChart } from '@/components/analytics/charts/TopFoodsWeekChart';
import { WeeklyWorkoutDurationChart } from '@/components/analytics/charts/WeeklyWorkoutDurationChart';
import { CaloriesBurnedChart } from '@/components/analytics/charts/CaloriesBurnedChart';

import { MonthlyGoalProgress } from '@/components/analytics/charts/MonthlyGoalProgress';
import { BestStreakHistoryChart } from '@/components/analytics/charts/BestStreakHistoryChart';
import { MuscleGroupAnalytics } from '@/components/analytics/MuscleGroupAnalytics';
import { useAnalyticsCalculations } from '@/components/analytics/utils/analyticsCalculations';
import { useMilestoneTracker } from '@/hooks/useMilestoneTracker';
import { SectionHeader } from '@/components/analytics/ui/SectionHeader';
import { WeeklyOverviewChart } from '@/components/analytics/WeeklyOverviewChart';
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
          {/* Section 1: Today's Breakdown */}
          <div className="mb-12">
            <SectionHeader 
              icon={Apple} 
              title="Today's Breakdown" 
              subtitle="Today's nutrition progress and breakdown" 
            />
            <div className="space-y-6">
              <DailyProgressSection progress={progress} weeklyAverage={weeklyAverage} />
              <MacrosHydrationSection macroData={macroData} progress={progress} />
            </div>
          </div>
          
          {/* Section 2: Quality & Trends */}
          <div className="mb-12">
            <SectionHeader 
              icon={Apple} 
              title="Quality & Trends" 
              subtitle="Meal quality patterns and consumption trends" 
            />
            <div className="space-y-6">
              <MealQualityTrendChart />
              <MealQualityAnalyticsSection />
            </div>
          </div>
          
          {/* Section 3: Insights */}
          <div className="mb-12">
            <SectionHeader 
              icon={Apple} 
              title="Insights" 
              subtitle="Smart analysis and pattern recognition" 
            />
            <div className="space-y-6">
              <SmartInsightsSection />
              <TagInsightsSection />
            </div>
          </div>
          
          {/* Section 4: Averages & Performance */}
          <div className="mb-12">
            <SectionHeader 
              icon={Apple} 
              title="Averages & Performance" 
              subtitle="Weekly trends and average daily metrics" 
            />
            <div className="space-y-6">
              <DailyAveragesSection weeklyAverage={weeklyAverage} />
              <WeeklyOverviewChart />
              <FlaggedIngredientHistoryChart />
              <TopFoodsWeekChart />
            </div>
          </div>
          
          {/* Section 5: Progress & Achievements */}
          <div className="mb-12">
            <SectionHeader 
              icon={Apple} 
              title="Progress & Achievements" 
              subtitle="Milestones, streaks, and nutrition journey" 
            />
            <div className="space-y-6">
              <AchievementsSection />
              <GamificationSection />
              <MonthlySummaryViewer />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="exercise" className="space-y-6 mt-6">
          {/* Section 1: Daily Overview */}
          <div className="mb-12">
            <SectionHeader 
              icon={Activity} 
              title="Daily Overview" 
              subtitle="Total workouts, exercise time, and calories burned" 
            />
            <div className="space-y-6">
              <ActivityExerciseSection stepsData={stepsData} exerciseCaloriesData={exerciseCaloriesData} weeklyAverage={weeklyAverage} progress={progress} />
            </div>
          </div>

          {/* Section 2: Performance Analysis */}
          <div className="mb-12">
            <SectionHeader 
              icon={Activity} 
              title="Weekly & Monthly Trends" 
              subtitle="Exercise patterns and progress over time" 
            />
            <div className="space-y-6">
              <WeeklyWorkoutDurationChart />
              <CaloriesBurnedChart />
              <MonthlyGoalProgress />
              <WorkoutTrophyCard />
              <ExerciseAnalyticsSection />
            </div>
          </div>

          {/* Section 3: Achievements & Milestones */}
          <div className="mb-12">
            <SectionHeader 
              icon={Activity} 
              title="AI Insights & Recommendations" 
              subtitle="Personalized tips & muscle insights" 
            />
            <div className="space-y-6">
              <MotivationCard />
              <MuscleGroupAnalytics />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="recovery" className="space-y-6 mt-6">
          <SectionHeader 
            icon={Heart} 
            title="Mind & Body Wellness" 
            subtitle="Mood trends and recovery insights" 
          />
          
          <RecoveryAnalyticsSection weeklyAverage={weeklyAverage} />
        </TabsContent>

      </Tabs>
    </div>
  );
}

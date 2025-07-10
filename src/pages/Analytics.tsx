
import React, { useState, useEffect } from 'react';
import { useScrollToTop } from '@/hooks/useScrollToTop';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSearchParams } from 'react-router-dom';

// Import new utility and components
import { useAnalyticsCalculations } from '@/components/analytics/utils/analyticsCalculations';
import { WeeklyProgressRing } from '@/components/analytics/WeeklyProgressRing';
import { LoggingStreakTracker } from '@/components/analytics/LoggingStreakTracker';
import { WeeklyOverviewChart } from '@/components/analytics/WeeklyOverviewChart';
import { DailyProgressSection } from '@/components/analytics/sections/DailyProgressSection';
import { DailyAveragesSection } from '@/components/analytics/sections/DailyAveragesSection';
import { MacrosHydrationSection } from '@/components/analytics/sections/MacrosHydrationSection';
import { ActivityExerciseSection } from '@/components/analytics/sections/ActivityExerciseSection';
import { AchievementsSection } from '@/components/analytics/sections/AchievementsSection';
import { SmartInsightsSection } from '@/components/analytics/sections/SmartInsightsSection';
import { GamificationSection } from '@/components/analytics/sections/GamificationSection';
import { StepsProgressSection } from '@/components/analytics/sections/StepsProgressSection';
import { ExerciseProgressSection } from '@/components/analytics/sections/ExerciseProgressSection';

const Analytics = () => {
  const isMobile = useIsMobile();
  const [animationDelay, setAnimationDelay] = useState(0);
  const [searchParams] = useSearchParams();
  const view = searchParams.get('view');
  
  useScrollToTop();

  useEffect(() => {
    setAnimationDelay(100);
  }, []);

  // Get all calculated data using the custom hook
  const {
    progress,
    weeklyAverage,
    weeklyChartData,
    hydrationWeeklyData,
    stepsData,
    exerciseCaloriesData,
    macroData,
    user
  } = useAnalyticsCalculations();

  // If a specific view is requested, show that section
  if (view === 'steps') {
    return (
      <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 ${isMobile ? 'pb-20' : 'pb-8'}`}>
        <div className="space-y-6 p-4 animate-fade-in">
          <StepsProgressSection className="mb-8" />
        </div>
      </div>
    );
  }

  if (view === 'exercise') {
    return (
      <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 ${isMobile ? 'pb-20' : 'pb-8'}`}>
        <div className="space-y-6 p-4 animate-fade-in">
          <ExerciseProgressSection className="mb-8" />
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 ${isMobile ? 'pb-20' : 'pb-8'}`}>
      <div className="space-y-6 p-4 animate-fade-in">
        {/* Simplified Header */}
        <div className="text-center pt-4">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
            🏆 Your Progress Journey
          </h1>
          
          {/* Weekly Progress Ring - Hero Element */}
          <div className="mb-8">
            <WeeklyProgressRing />
          </div>
        </div>

        {/* Daily Progress Cards - Enhanced with Real Data */}
        <DailyProgressSection progress={progress} weeklyAverage={weeklyAverage} />

        {/* Enhanced Daily Averages with Fixed Spacing */}
        <DailyAveragesSection weeklyAverage={weeklyAverage} />

        {/* Logging Consistency Tracker - Increased separation with visual distinction */}
        <div className="mt-20 pt-8 border-t border-gray-200 dark:border-gray-700">
          <LoggingStreakTracker />
        </div>

        {/* Weekly Overview Chart - Enhanced */}
        <div>
          <WeeklyOverviewChart />
        </div>

        {/* Macros and Hydration - Enhanced */}
        <MacrosHydrationSection macroData={macroData} progress={progress} />

        {/* Activity Tracking - Enhanced */}
        <ActivityExerciseSection 
          stepsData={stepsData} 
          exerciseCaloriesData={exerciseCaloriesData} 
          weeklyAverage={weeklyAverage} 
        />

        {/* Achievements & Streaks - Enhanced */}
        <AchievementsSection />

        {/* Smart Insights - Enhanced */}
        <SmartInsightsSection />

        {/* Future Gamification - Enhanced */}
        <GamificationSection />
      </div>
    </div>
  );
};

export default Analytics;

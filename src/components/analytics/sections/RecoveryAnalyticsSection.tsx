import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Waves } from 'lucide-react';
import { RecoveryOverviewCard } from '@/components/analytics/recovery/RecoveryOverviewCard';
import { MoodStressChart } from '@/components/analytics/recovery/MoodStressChart';
import { RecoveryTypesPieChart } from '@/components/analytics/recovery/RecoveryTypesPieChart';
import { StreakTrackerCard } from '@/components/analytics/recovery/StreakTrackerCard';
import { RecoveryInsightsCard } from '@/components/analytics/recovery/RecoveryInsightsCard';

export const RecoveryAnalyticsSection = () => {
  return (
    <div className="max-w-md mx-auto w-full space-y-6">
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl shadow-lg">
          <Waves className="h-6 w-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Recovery & Wellness</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">Sessions, trends, and progress</p>
        </div>
      </div>

      {/* Recovery Overview Card */}
      <RecoveryOverviewCard />
      
      {/* Mood & Stress Graph */}
      <MoodStressChart />
      
      {/* Recovery Types Pie Chart */}
      <RecoveryTypesPieChart />
      
      {/* Streak Tracker & Session Logs */}
      <StreakTrackerCard />
      
      {/* Insights & Nudges */}
      <RecoveryInsightsCard />
    </div>
  );
};
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RecoveryOverviewCard } from '@/components/analytics/recovery/RecoveryOverviewCard';
import { MoodStressChart } from '@/components/analytics/recovery/MoodStressChart';
import { RecoveryTypesPieChart } from '@/components/analytics/recovery/RecoveryTypesPieChart';
import { StreakTrackerCard } from '@/components/analytics/recovery/StreakTrackerCard';
import { RecoveryInsightsCard } from '@/components/analytics/recovery/RecoveryInsightsCard';

export const RecoveryAnalyticsSection = () => {
  return (
    <div className="max-w-md mx-auto w-full space-y-6">
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
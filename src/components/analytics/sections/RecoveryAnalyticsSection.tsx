import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DailyProgressCard } from '@/components/analytics/DailyProgressCard';
import { RecoveryOverviewCard } from '@/components/analytics/recovery/RecoveryOverviewCard';
import { MoodStressChart } from '@/components/analytics/recovery/MoodStressChart';
import { RecoveryTypesPieChart } from '@/components/analytics/recovery/RecoveryTypesPieChart';
import { StreakTrackerCard } from '@/components/analytics/recovery/StreakTrackerCard';
import { RecoveryInsightsCard } from '@/components/analytics/recovery/RecoveryInsightsCard';
import { Star } from 'lucide-react';

interface RecoveryAnalyticsSectionProps {
  weeklyAverage?: any;
}

export const RecoveryAnalyticsSection = ({ weeklyAverage }: RecoveryAnalyticsSectionProps = {}) => {
  return (
    <div className="max-w-md mx-auto w-full space-y-6">
      {/* Supplements Progress Card */}
      {weeklyAverage && (
        <div className="mb-6">
          <DailyProgressCard
            title="Daily Supplements"
            value={weeklyAverage.supplements || 0}
            target={5}
            unit="taken"
            icon={<Star className="h-6 w-6" />}
            color="#EC4899"
          />
        </div>
      )}
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
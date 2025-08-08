import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DailyProgressCard } from '@/components/analytics/DailyProgressCard';
import { RecoveryOverviewCard } from '@/components/analytics/recovery/RecoveryOverviewCard';
import { MoodStressChart } from '@/components/analytics/recovery/MoodStressChart';
import { RecoveryTypesPieChart } from '@/components/analytics/recovery/RecoveryTypesPieChart';
import { StreakTrackerCard } from '@/components/analytics/recovery/StreakTrackerCard';
import { RecoveryInsightsCard } from '@/components/analytics/recovery/RecoveryInsightsCard';
import { SectionHeader } from '@/components/analytics/ui/SectionHeader';
import { MoodWellnessTrendChart } from '@/components/analytics/MoodWellnessTrendChart';
import { RecoveryActivityTrends } from '@/components/analytics/recovery/RecoveryActivityTrends';
import { TrendingUp, Pill, Gauge, Brain, PieChart as PieChartIcon, History, Lightbulb, Star, BarChart3 } from 'lucide-react';

interface RecoveryAnalyticsSectionProps {
  weeklyAverage?: any;
}

export const RecoveryAnalyticsSection = ({ weeklyAverage }: RecoveryAnalyticsSectionProps = {}) => {
  return (
    <div className="max-w-md mx-auto w-full space-y-6">
      {/* Mood & Wellness Trends (Hero) */}
      <MoodWellnessTrendChart />

      {/* Supplement Tracking */}
      {weeklyAverage && (
        <>
          <SectionHeader 
            icon={Pill}
            title="Supplement Tracking"
            subtitle="Daily supplements taken"
          />
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
        </>
      )}

      {/* Recovery Overview */}
      <SectionHeader 
        icon={Gauge}
        title="Recovery Overview"
        subtitle="Streaks and recovery score"
      />
      <RecoveryOverviewCard />
      
      {/* Mood & Stress Trends */}
      <SectionHeader 
        icon={Brain}
        title="Mood & Stress Trends"
        subtitle="Weekly mood and stress chart"
      />
      <MoodStressChart />
      
      {/* Recovery Activity Trends */}
      <SectionHeader 
        icon={BarChart3}
        title="Recovery Activity Trends"
        subtitle="Current vs previous period"
      />
      <RecoveryActivityTrends />
      
      {/* Recovery Activity Breakdown */}
      <SectionHeader 
        icon={PieChartIcon}
        title="Recovery Activity Breakdown"
        subtitle="Meditation, Breathing, Sleep, Yoga, Thermotherapy"
      />
      <RecoveryTypesPieChart />
      
      {/* Streaks & Session History */}
      <SectionHeader 
        icon={History}
        title="Streaks & Session History"
      />
      <StreakTrackerCard />
      
      {/* Smart Insights & Suggestions */}
      <SectionHeader 
        icon={Lightbulb}
        title="Smart Insights & Suggestions"
      />
      <RecoveryInsightsCard />
    </div>
  );
};
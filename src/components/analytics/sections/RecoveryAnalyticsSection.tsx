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
import { Pill, Gauge, Lightbulb, Star, BarChart3 } from 'lucide-react';
import { SupplementTrendsChart } from '@/components/analytics/recovery/SupplementTrendsChart';
import { useState } from 'react';
import { TrackerInsightsPopup } from '@/components/tracker-insights/TrackerInsightsPopup';

interface RecoveryAnalyticsSectionProps {
  weeklyAverage?: any;
}

export const RecoveryAnalyticsSection = ({ weeklyAverage }: RecoveryAnalyticsSectionProps = {}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tracker, setTracker] = useState<{ type: string; name: string; color: string } | null>(null);
  const openChart = (type: string, name: string, color: string) => { setTracker({ type, name, color }); setIsOpen(true); };

  return (
    <div className="max-w-md mx-auto w-full space-y-6">
      {/* Mood & Stress Trends (Hero) */}
      <MoodStressChart />

      {/* Mood & Wellness Trends */}
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
              onClick={() => openChart('supplements', 'Supplements', '#EC4899')}
            />
          </div>
          <SupplementTrendsChart />
        </>
      )}

      {/* Recovery Overview */}
      <SectionHeader 
        icon={Gauge}
        title="Recovery Overview"
        subtitle="Streaks and recovery score"
      />
      <RecoveryOverviewCard />
      <RecoveryTypesPieChart />
      <StreakTrackerCard />
      

      {/* Recovery Activity Trends */}
      <SectionHeader 
        icon={BarChart3}
        title="Recovery Activity Trends"
        subtitle="Compare current vs previous periods"
      />
      <RecoveryActivityTrends />
      
      {/* Recovery Activity Breakdown */}
      
      
      {/* Smart Insights & Suggestions */}
      <SectionHeader 
        icon={Lightbulb}
        title="AI Coach Recommendations"
      />
      <RecoveryInsightsCard />

      {tracker && (
        <TrackerInsightsPopup
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          trackerType={tracker.type}
          trackerName={tracker.name}
          trackerColor={tracker.color}
        />
      )}
    </div>
  );
};
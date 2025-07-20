
import React from 'react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { RefreshCw, Target } from 'lucide-react';
import { useHomeData } from './HomeDataProvider';
import { useHomePreferences } from './HomePreferences';

// Import components directly to avoid lazy loading issues
import HomeAIInsights from '@/components/HomeAIInsights';
import { HomeCtaTicker } from '@/components/HomeCtaTicker';
import { DailyScoreCard } from '@/components/analytics/DailyScoreCard';
import { DailyProgressCard } from '@/components/analytics/DailyProgressCard';

const LoadingSkeleton = () => (
  <div className="space-y-6">
    <Skeleton className="h-32 w-full" />
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
    <Skeleton className="h-48 w-full" />
  </div>
);

const ErrorFallback = ({ error, onRetry }: { error: string; onRetry: () => void }) => (
  <Card className="p-6 text-center">
    <p className="text-red-600 mb-4">{error}</p>
    <Button onClick={onRetry} variant="outline" size="sm">
      <RefreshCw className="w-4 h-4 mr-2" />
      Try Again
    </Button>
  </Card>
);

export const HomeContent = () => {
  const { loading, error, refreshData, dailyScore } = useHomeData();
  const { preferences, loading: prefsLoading } = useHomePreferences();

  if (prefsLoading || loading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return <ErrorFallback error={error} onRetry={refreshData} />;
  }

  return (
    <div className="space-y-6">
      {preferences.showAIInsights && <HomeAIInsights />}
      {preferences.showTicker && <HomeCtaTicker />}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DailyScoreCard score={dailyScore} />
        <DailyProgressCard 
          title="Daily Progress"
          value={dailyScore}
          target={100}
          unit="score"
          icon={<Target className="h-6 w-6" />}
          color="#10B981"
        />
      </div>
    </div>
  );
};

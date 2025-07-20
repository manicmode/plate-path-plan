
import { Suspense, lazy } from 'react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { useHomeData } from './HomeDataProvider';
import { useHomePreferences } from './HomePreferences';

// Lazy load heavy components
const HomeAIInsights = lazy(() => import('@/components/HomeAIInsights'));
const HomeCtaTicker = lazy(() => import('@/components/HomeCtaTicker'));
const DailyScoreCard = lazy(() => import('@/components/analytics/DailyScoreCard'));
const DailyProgressCard = lazy(() => import('@/components/analytics/DailyProgressCard'));

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
  const { loading, error, refreshData } = useHomeData();
  const { preferences, loading: prefsLoading } = useHomePreferences();

  if (prefsLoading || loading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return <ErrorFallback error={error} onRetry={refreshData} />;
  }

  return (
    <div className="space-y-6">
      <Suspense fallback={<Skeleton className="h-32 w-full" />}>
        {preferences.showAIInsights && <HomeAIInsights />}
      </Suspense>

      <Suspense fallback={<Skeleton className="h-16 w-full" />}>
        {preferences.showTicker && <HomeCtaTicker />}
      </Suspense>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Suspense fallback={<Skeleton className="h-24 w-full" />}>
          <DailyScoreCard />
        </Suspense>
        
        <Suspense fallback={<Skeleton className="h-24 w-full" />}>
          <DailyProgressCard />
        </Suspense>
      </div>
    </div>
  );
};

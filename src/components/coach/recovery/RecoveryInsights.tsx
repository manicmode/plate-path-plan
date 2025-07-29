import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/contexts/auth';
import { TrendingUp, TrendingDown, BarChart3, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface RecoveryData {
  meditationSessions: number;
  breathingExercises: number;
  sleepQuality: number;
  stressLevel: number;
  weeklyTrend: 'up' | 'down' | 'stable';
}

export const RecoveryInsights = () => {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const [recoveryData, setRecoveryData] = useState<RecoveryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchRecoveryInsights();
    }
  }, [user]);

  const fetchRecoveryInsights = async () => {
    try {
      setIsLoading(true);
      
      // Mock data for now - in a real app, this would fetch from Supabase
      const mockData: RecoveryData = {
        meditationSessions: Math.floor(Math.random() * 10) + 1,
        breathingExercises: Math.floor(Math.random() * 15) + 1,
        sleepQuality: Math.floor(Math.random() * 10) + 1,
        stressLevel: Math.floor(Math.random() * 10) + 1,
        weeklyTrend: ['up', 'down', 'stable'][Math.floor(Math.random() * 3)] as 'up' | 'down' | 'stable'
      };
      
      setRecoveryData(mockData);
    } catch (error) {
      console.error('Error fetching recovery insights:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <BarChart3 className="h-4 w-4 text-orange-500" />;
    }
  };

  const getTrendMessage = (trend: string) => {
    switch (trend) {
      case 'up':
        return "Your recovery habits are improving! Keep up the great work.";
      case 'down':
        return "Consider focusing more on your recovery practices this week.";
      default:
        return "Your recovery routine is stable. Consider trying new techniques.";
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up':
        return "from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-700";
      case 'down':
        return "from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 border-red-200 dark:border-red-700";
      default:
        return "from-orange-50 to-pink-50 dark:from-orange-900/20 dark:to-pink-900/20 border-orange-200 dark:border-orange-700";
    }
  };

  if (isLoading) {
    return (
      <Card className="glass-card border-0 rounded-3xl">
        <CardContent className={`${isMobile ? 'p-4' : 'p-6'}`}>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!recoveryData) {
    return (
      <Card className="glass-card border-0 rounded-3xl">
        <CardContent className={`${isMobile ? 'p-4' : 'p-6'}`}>
          <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
            <AlertCircle className="h-4 w-4" />
            <p className={`${isMobile ? 'text-sm' : 'text-base'}`}>
              Unable to load recovery insights
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card border-0 rounded-3xl">
      <CardHeader className={`${isMobile ? 'pb-3' : 'pb-4'}`}>
        <CardTitle className={`flex items-center space-x-2 ${isMobile ? 'text-base' : 'text-lg'}`}>
          <BarChart3 className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-orange-500`} />
          <span>📊 Recovery Insights</span>
        </CardTitle>
      </CardHeader>
      <CardContent className={`${isMobile ? 'p-4' : 'p-6'} pt-0 space-y-4`}>
        {/* Weekly Trend */}
        <div className={`bg-gradient-to-r ${getTrendColor(recoveryData.weeklyTrend)} rounded-2xl p-4 border`}>
          <div className="flex items-center justify-between mb-2">
            <h3 className={`${isMobile ? 'text-sm' : 'text-base'} font-semibold`}>
              Weekly Progress
            </h3>
            {getTrendIcon(recoveryData.weeklyTrend)}
          </div>
          <p className={`${isMobile ? 'text-xs' : 'text-sm'} opacity-80`}>
            {getTrendMessage(recoveryData.weeklyTrend)}
          </p>
        </div>

        {/* Recovery Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
            <div className="text-center">
              <div className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-orange-500`}>
                {recoveryData.meditationSessions}
              </div>
              <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600 dark:text-gray-400`}>
                Meditation Sessions
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
            <div className="text-center">
              <div className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-pink-500`}>
                {recoveryData.breathingExercises}
              </div>
              <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600 dark:text-gray-400`}>
                Breathing Exercises
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
            <div className="text-center">
              <div className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-rose-500`}>
                {recoveryData.sleepQuality}/10
              </div>
              <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600 dark:text-gray-400`}>
                Sleep Quality
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
            <div className="text-center">
              <div className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-amber-500`}>
                {recoveryData.stressLevel}/10
              </div>
              <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600 dark:text-gray-400`}>
                Stress Level
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
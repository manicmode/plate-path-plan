import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sparkles, TrendingUp, Target, Calendar } from 'lucide-react';

interface RecoveryStats {
  totalSessions: number;
  currentStreak: number;
  recoveryScore: number;
  weeklyTrend: 'up' | 'down' | 'stable';
}

export const RecoveryOverviewCard = () => {
  const isMobile = useIsMobile();
  const [stats, setStats] = useState<RecoveryStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Mock data - in real app, fetch from Supabase
    const mockStats: RecoveryStats = {
      totalSessions: Math.floor(Math.random() * 50) + 10,
      currentStreak: Math.floor(Math.random() * 14) + 1,
      recoveryScore: Math.floor(Math.random() * 30) + 70,
      weeklyTrend: ['up', 'down', 'stable'][Math.floor(Math.random() * 3)] as 'up' | 'down' | 'stable'
    };
    
    setTimeout(() => {
      setStats(mockStats);
      setIsLoading(false);
    }, 500);
  }, []);

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up': return 'text-green-600';
      case 'down': return 'text-red-500';
      default: return 'text-blue-600';
    }
  };

  const getTrendIcon = (trend: string) => {
    return <TrendingUp className={`h-4 w-4 ${getTrendColor(trend)}`} />;
  };

  if (isLoading) {
    return (
      <Card className="glass-card border-0 rounded-3xl animate-fade-in">
        <CardContent className={`${isMobile ? 'p-4' : 'p-6'}`}>
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) return null;

  return (
    <Card className="glass-card border-0 rounded-3xl animate-fade-in">
      <CardHeader className={`${isMobile ? 'pb-3' : 'pb-4'}`}>
        <CardTitle className={`flex items-center space-x-2 ${isMobile ? 'text-base' : 'text-lg'}`}>
          <Sparkles className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-blue-600`} />
          <span>🧘 Recovery Overview</span>
        </CardTitle>
      </CardHeader>
      <CardContent className={`${isMobile ? 'p-4' : 'p-6'} pt-0 space-y-4`}>
        {/* Weekly Summary */}
        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-2xl p-4 border border-blue-200 dark:border-blue-700">
          <div className="flex items-center justify-between mb-2">
            <h3 className={`${isMobile ? 'text-sm' : 'text-base'} font-semibold text-blue-800 dark:text-blue-200`}>
              This Week's Progress
            </h3>
            {getTrendIcon(stats.weeklyTrend)}
          </div>
          <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-blue-700 dark:text-blue-300`}>
            You've been consistent with your recovery practices
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-2 mb-1">
              <Target className="h-4 w-4 text-blue-600" />
              <span className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600 dark:text-gray-400`}>
                Total Sessions
              </span>
            </div>
            <div className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-blue-600`}>
              {stats.totalSessions}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-2 mb-1">
              <Calendar className="h-4 w-4 text-cyan-600" />
              <span className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600 dark:text-gray-400`}>
                Current Streak
              </span>
            </div>
            <div className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-cyan-600`}>
              {stats.currentStreak} days
            </div>
          </div>
        </div>

        {/* Recovery Score */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className={`${isMobile ? 'text-sm' : 'text-base'} font-medium text-gray-700 dark:text-gray-300`}>
              Recovery Score
            </span>
            <span className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-teal-600`}>
              {stats.recoveryScore}/100
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${stats.recoveryScore}%` }}
            ></div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
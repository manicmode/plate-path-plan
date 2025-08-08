import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useIsMobile } from '@/hooks/use-mobile';
import { Calendar, Flame, Clock } from 'lucide-react';

interface StreakData {
  type: string;
  streak: number;
  icon: string;
  color: string;
}

interface SessionLog {
  date: string;
  activities: string[];
  duration: number;
}

export const StreakTrackerCard = ({ hideTitle = false }: { hideTitle?: boolean }) => {
  const isMobile = useIsMobile();
  const [streaks, setStreaks] = useState<StreakData[]>([]);
  const [sessionLogs, setSessionLogs] = useState<SessionLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Mock streak data
    const mockStreaks: StreakData[] = [
      { type: 'Meditation', streak: 7, icon: '🧘‍♀️', color: 'text-blue-600' },
      { type: 'Breathing', streak: 12, icon: '🫁', color: 'text-cyan-600' },
      { type: 'Sleep', streak: 5, icon: '😴', color: 'text-purple-600' },
      { type: 'Yoga', streak: 3, icon: '🧘‍♂️', color: 'text-green-600' },
    ];

    // Mock session logs
    const mockLogs: SessionLog[] = [
      { date: 'Today', activities: ['Breathing', 'Meditation'], duration: 25 },
      { date: 'Yesterday', activities: ['Sleep Optimization'], duration: 15 },
      { date: 'Monday', activities: ['Yoga', 'Breathing'], duration: 35 },
      { date: 'Sunday', activities: ['Meditation'], duration: 20 },
      { date: 'Saturday', activities: ['Breathing', 'Thermotherapy'], duration: 30 },
    ];

    setTimeout(() => {
      setStreaks(mockStreaks);
      setSessionLogs(mockLogs);
      setIsLoading(false);
    }, 800);
  }, []);

  if (isLoading) {
    return (
      <Card className="glass-card border-0 rounded-3xl animate-fade-in">
        <CardContent className={`${isMobile ? 'p-4' : 'p-6'}`}>
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card border-0 rounded-3xl animate-fade-in">
{!hideTitle && (
        <CardHeader className={`${isMobile ? 'pb-3' : 'pb-4'}`}>
          <CardTitle className={`flex items-center space-x-2 ${isMobile ? 'text-base' : 'text-lg'}`}>
            <Flame className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-orange-500`} />
            <span>🔥 Streaks & Session History</span>
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className={`${isMobile ? 'p-4' : 'p-6'} pt-0 space-y-4`}>
        {/* Current Streaks */}
        <div>
          <h3 className={`${isMobile ? 'text-sm' : 'text-base'} font-semibold text-gray-700 dark:text-gray-300 mb-3`}>
            Current Streaks
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {streaks.map((streak, index) => (
              <div key={index} className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-lg">{streak.icon}</span>
                  <span className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600 dark:text-gray-400`}>
                    {streak.type}
                  </span>
                </div>
                <div className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold ${streak.color}`}>
                  {streak.streak} days
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Sessions */}
        <div>
          <h3 className={`${isMobile ? 'text-sm' : 'text-base'} font-semibold text-gray-700 dark:text-gray-300 mb-3`}>
            Recent Sessions
          </h3>
          <ScrollArea className="h-32">
            <div className="space-y-2">
              {sessionLogs.map((log, index) => (
                <div key={index} className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-700">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-blue-800 dark:text-blue-200`}>
                      {log.date}
                    </span>
                    <div className="flex items-center space-x-1">
                      <Clock className="h-3 w-3 text-blue-600" />
                      <span className={`${isMobile ? 'text-xs' : 'text-sm'} text-blue-600`}>
                        {log.duration}m
                      </span>
                    </div>
                  </div>
                  <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-blue-700 dark:text-blue-300`}>
                    {log.activities.join(' + ')}
                  </p>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
};
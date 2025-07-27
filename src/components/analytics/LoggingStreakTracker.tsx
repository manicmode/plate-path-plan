
import React from 'react';
import { useNutrition } from '@/contexts/NutritionContext';
import { Card, CardContent } from '@/components/ui/card';

export const LoggingStreakTracker = () => {
  const { weeklyData } = useNutrition();

  const getDailyStatus = () => {
    const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay() + 1); // Start from Monday

    return days.map((day, index) => {
      const dayDate = new Date(weekStart);
      dayDate.setDate(weekStart.getDate() + index);
      const dayString = dayDate.toISOString().split('T')[0];
      
      const dayData = weeklyData.find(d => d.date === dayString);
      const hasLogged = dayData && dayData.foods.length > 0;
      
      return {
        day,
        hasLogged,
        isToday: dayDate.toDateString() === today.toDateString(),
        isFuture: dayDate > today
      };
    });
  };

  const dailyStatus = getDailyStatus();
  const currentStreak = calculateCurrentStreak(dailyStatus);
  
  function calculateCurrentStreak(status: any[]) {
    let streak = 0;
    for (let i = status.length - 1; i >= 0; i--) {
      if (status[i].hasLogged && !status[i].isFuture) {
        streak++;
      } else if (!status[i].isFuture) {
        break;
      }
    }
    return streak;
  }

  const getStreakMessage = () => {
    if (currentStreak >= 5) return '🟢 5-Day Streak! You\'re on fire 🔥';
    if (currentStreak >= 3) return `🔥 ${currentStreak}-Day Streak! Keep it up!`;
    if (currentStreak >= 1) return '📅 Great start! 2 more days for a streak!';
    return '🎯 Start your logging streak today!';
  };

  return (
    <Card className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 shadow-lg mb-0 !mb-0">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Logging Consistency
          </h3>
          <div className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
            {getStreakMessage()}
          </div>
        </div>
        
        <div className="flex justify-center space-x-3">
          {dailyStatus.map((status, index) => (
            <div key={index} className="flex flex-col items-center space-y-2">
              <div
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium
                  ${status.isFuture 
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500' 
                    : status.hasLogged
                    ? 'bg-emerald-500 text-white shadow-lg' 
                    : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                  }
                  ${status.isToday ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-gray-800' : ''}
                  transition-all duration-300
                `}
              >
                {status.isFuture ? status.day : status.hasLogged ? '✅' : '❌'}
              </div>
              <span className="text-xs text-gray-600 dark:text-gray-300">
                {status.day}
              </span>
            </div>
          ))}
        </div>

        {/* Streak progress line */}
        {currentStreak >= 2 && (
          <div className="mt-4">
            <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-emerald-500 to-green-500 transition-all duration-1000 ease-out"
                style={{ width: `${Math.min(100, (currentStreak / 7) * 100)}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

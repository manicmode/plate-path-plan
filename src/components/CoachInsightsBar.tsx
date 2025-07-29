import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useMotivationMessage } from '@/hooks/useMotivationMessage';
import { useDailyScore } from '@/hooks/useDailyScore';
import { TrendingUp, Target, Calendar, RefreshCw } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

const CoachInsightsBar = () => {
  const { motivationData, isLoading } = useMotivationMessage();
  const { todayScore, weeklyScores, monthlyScores } = useDailyScore();
  const isMobile = useIsMobile();

  // Generate insights for each period
  const getDailyInsight = () => {
    const score = todayScore || 0;
    let message = "Start your day strong! 🌅";
    let emoji = "📅";
    
    if (score >= 80) {
      message = "You're crushing today! 🔥";
      emoji = "🔥";
    } else if (score >= 60) {
      message = "Good progress today! 💪";
      emoji = "💪";
    } else if (score >= 40) {
      message = "Keep pushing forward! 🎯";
      emoji = "🎯";
    }
    
    return { score, message, emoji, title: "Daily" };
  };

  const getWeeklyInsight = () => {
    const weekAvg = weeklyScores.length > 0 
      ? Math.round(weeklyScores.reduce((sum, s) => sum + s.daily_performance_score, 0) / weeklyScores.length)
      : 0;
    
    let message = "Fresh week ahead! 🚀";
    let emoji = "📊";
    
    if (weekAvg >= 75) {
      message = "Amazing week! Keep it up! ⭐";
      emoji = "⭐";
    } else if (weekAvg >= 60) {
      message = "Solid week progress! 💯";
      emoji = "💯";
    } else if (weekAvg >= 40) {
      message = "Building momentum! 📈";
      emoji = "📈";
    }
    
    return { score: weekAvg, message, emoji, title: "Weekly" };
  };

  const getMonthlyInsight = () => {
    const monthAvg = monthlyScores.length > 0 
      ? Math.round(monthlyScores.reduce((sum, s) => sum + s.daily_performance_score, 0) / monthlyScores.length)
      : 0;
    
    let message = "New month, new goals! 🌟";
    let emoji = "📱";
    
    if (monthAvg >= 75) {
      message = "Outstanding month! 🏆";
      emoji = "🏆";
    } else if (monthAvg >= 60) {
      message = "Great monthly trend! 🎊";
      emoji = "🎊";
    } else if (monthAvg >= 40) {
      message = "Steady improvement! 📊";
      emoji = "📊";
    }
    
    return { score: monthAvg, message, emoji, title: "Monthly" };
  };

  const insights = [getDailyInsight(), getWeeklyInsight(), getMonthlyInsight()];

  if (isLoading) {
    return (
      <div className={`${isMobile ? 'mx-2' : 'mx-4'} mb-6`}>
        <div className={`grid ${isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-3 gap-4'}`}>
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`${isMobile ? 'mx-2' : 'mx-4'} mb-6`}>
      <div className={`grid ${isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-3 gap-4'}`}>
        {insights.map((insight, index) => {
          const getCardStyle = (title: string) => {
            switch (title) {
              case 'Daily':
                return 'bg-gradient-to-br from-emerald-500/10 to-green-500/10 border-emerald-500/20 dark:border-emerald-500/40';
              case 'Weekly':
                return 'bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20 dark:border-blue-500/40';
              case 'Monthly':
                return 'bg-gradient-to-br from-purple-500/10 to-violet-500/10 border-purple-500/20 dark:border-purple-500/40';
              default:
                return 'bg-gradient-to-br from-gray-500/10 to-gray-500/10 border-gray-500/20';
            }
          };

          return (
            <Card 
              key={insight.title}
              className={`hover:scale-[1.02] transition-all duration-300 hover:shadow-lg ${getCardStyle(insight.title)}`}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{insight.emoji}</span>
                    <h3 className="font-semibold text-sm text-gray-900 dark:text-white">
                      {insight.title}
                    </h3>
                  </div>
                  <div className="text-xl font-bold text-gray-900 dark:text-white">
                    {insight.score}
                  </div>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-300 leading-tight">
                  {insight.message}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default CoachInsightsBar;
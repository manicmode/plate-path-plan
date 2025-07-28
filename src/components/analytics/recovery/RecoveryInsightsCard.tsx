import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useIsMobile } from '@/hooks/use-mobile';
import { Lightbulb, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';

interface Insight {
  type: 'success' | 'suggestion' | 'warning';
  message: string;
  icon: React.ReactNode;
  color: string;
}

export const RecoveryInsightsCard = () => {
  const isMobile = useIsMobile();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Generate random insights based on mock data
    const possibleInsights: Insight[] = [
      {
        type: 'success',
        message: 'Your sleep sessions improved this week! 🎉',
        icon: <CheckCircle className="h-4 w-4" />,
        color: 'from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-700'
      },
      {
        type: 'suggestion',
        message: 'Try adding a breathing session tomorrow to boost recovery.',
        icon: <Lightbulb className="h-4 w-4" />,
        color: 'from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-blue-200 dark:border-blue-700'
      },
      {
        type: 'success',
        message: 'You\'ve maintained a 12-day breathing streak! Keep it up!',
        icon: <TrendingUp className="h-4 w-4" />,
        color: 'from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-700'
      },
      {
        type: 'suggestion',
        message: 'Consider adding yoga to your routine for better flexibility.',
        icon: <Lightbulb className="h-4 w-4" />,
        color: 'from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-700'
      },
      {
        type: 'warning',
        message: 'Your stress levels seem elevated. Try a longer meditation session.',
        icon: <AlertCircle className="h-4 w-4" />,
        color: 'from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200 dark:border-amber-700'
      },
      {
        type: 'success',
        message: 'Excellent work! Your recovery score is above 85 this week.',
        icon: <CheckCircle className="h-4 w-4" />,
        color: 'from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-700'
      }
    ];

    // Randomly select 2-3 insights
    const selectedInsights = possibleInsights
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.floor(Math.random() * 2) + 2);

    setTimeout(() => {
      setInsights(selectedInsights);
      setIsLoading(false);
    }, 900);
  }, []);

  const getTextColor = (type: string) => {
    switch (type) {
      case 'success': return 'text-green-700 dark:text-green-300';
      case 'warning': return 'text-amber-700 dark:text-amber-300';
      default: return 'text-blue-700 dark:text-blue-300';
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case 'success': return 'text-green-600';
      case 'warning': return 'text-amber-600';
      default: return 'text-blue-600';
    }
  };

  if (isLoading) {
    return (
      <Card className="glass-card border-0 rounded-3xl animate-fade-in">
        <CardContent className={`${isMobile ? 'p-4' : 'p-6'}`}>
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            <div className="space-y-3">
              {[1, 2].map(i => (
                <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card border-0 rounded-3xl animate-fade-in">
      <CardHeader className={`${isMobile ? 'pb-3' : 'pb-4'}`}>
        <CardTitle className={`flex items-center space-x-2 ${isMobile ? 'text-base' : 'text-lg'}`}>
          <Lightbulb className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-blue-600`} />
          <span>💡 Smart Insights & Suggestions</span>
        </CardTitle>
      </CardHeader>
      <CardContent className={`${isMobile ? 'p-4' : 'p-6'} pt-0 space-y-3`}>
        {insights.map((insight, index) => (
          <div key={index} className={`bg-gradient-to-r ${insight.color} rounded-2xl p-4 border`}>
            <div className="flex items-start space-x-3">
              <div className={`mt-0.5 ${getIconColor(insight.type)}`}>
                {insight.icon}
              </div>
              <p className={`${isMobile ? 'text-sm' : 'text-base'} ${getTextColor(insight.type)} leading-relaxed flex-1`}>
                {insight.message}
              </p>
            </div>
          </div>
        ))}
        
        {/* Next Steps */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 mt-4">
          <h4 className={`${isMobile ? 'text-sm' : 'text-base'} font-semibold text-gray-700 dark:text-gray-300 mb-2`}>
            🎯 Recommended Next Steps
          </h4>
          <ul className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600 dark:text-gray-400 space-y-1`}>
            <li>• Try a 10-minute morning meditation</li>
            <li>• Practice breathing exercises before bed</li>
            <li>• Consider adding yoga to your routine</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
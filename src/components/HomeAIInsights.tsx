import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Brain, Sparkles, ChevronDown, Clock, Zap } from 'lucide-react';
import { useAuth } from '@/contexts/auth';
import { useNutrition } from '@/contexts/NutritionContext';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface FoodPrediction {
  id: string;
  name: string;
  calories: number;
  usualTime: string;
  frequency: number;
  dayPattern?: string;
}

interface RecentFood {
  id: string;
  name: string;
  calories: number;
  timestamp: Date;
  isSaved?: boolean;
}

const HomeAIInsights = () => {
  const { user } = useAuth();
  const { addFood } = useNutrition();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  
  const [predictions, setPredictions] = useState<FoodPrediction[]>([]);
  const [recentLogs, setRecentLogs] = useState<RecentFood[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRecentLogsOpen, setIsRecentLogsOpen] = useState(false);

  // Fetch user's nutrition history and generate predictions
  useEffect(() => {
    const generatePredictions = async () => {
      if (!user?.id) return;
      
      setIsLoading(true);
      
      try {
        // Fetch nutrition logs from the past 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const { data: nutritionLogs } = await supabase
          .from('nutrition_logs')
          .select('*')
          .eq('user_id', user.id)
          .gte('created_at', thirtyDaysAgo.toISOString())
          .order('created_at', { ascending: false });

        if (nutritionLogs && nutritionLogs.length > 0) {
          // Analyze patterns for predictions
          const foodPatterns = analyzeFoodPatterns(nutritionLogs);
          const contextualPredictions = getContextualPredictions(foodPatterns);
          setPredictions(contextualPredictions);

          // Set recent logs (last 10 items)
          const recent = nutritionLogs.slice(0, 10).map(log => ({
            id: log.id,
            name: log.food_name,
            calories: log.calories,
            timestamp: new Date(log.created_at),
            isSaved: false // Will be implemented in future when saving functionality is added
          }));
          setRecentLogs(recent);
        } else {
          // Fallback predictions for new users
          setPredictions(getFallbackPredictions());
          setRecentLogs([]);
        }
      } catch (error) {
        console.error('Error generating predictions:', error);
        setPredictions(getFallbackPredictions());
      } finally {
        setIsLoading(false);
      }
    };

    generatePredictions();
  }, [user?.id]);

  // Analyze user's food patterns to identify frequently logged items
  const analyzeFoodPatterns = (logs: any[]) => {
    const foodStats: Record<string, {
      count: number;
      calories: number;
      timeHours: number[];
      weekdays: number[];
    }> = {};

    logs.forEach(log => {
      const foodName = log.food_name;
      const logDate = new Date(log.created_at);
      const hour = logDate.getHours();
      const weekday = logDate.getDay();

      if (!foodStats[foodName]) {
        foodStats[foodName] = {
          count: 0,
          calories: log.calories,
          timeHours: [],
          weekdays: []
        };
      }

      foodStats[foodName].count++;
      foodStats[foodName].timeHours.push(hour);
      foodStats[foodName].weekdays.push(weekday);
    });

    return foodStats;
  };

  // Get contextual predictions based on current time and day
  const getContextualPredictions = (patterns: Record<string, any>) => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentWeekday = now.getDay();

    // Score foods based on frequency, time, and day patterns
    const scoredFoods = Object.entries(patterns).map(([foodName, stats]) => {
      let score = stats.count; // Base score from frequency

      // Time context scoring
      const avgTime = stats.timeHours.reduce((sum: number, h: number) => sum + h, 0) / stats.timeHours.length;
      const timeDistance = Math.abs(currentHour - avgTime);
      const timeScore = Math.max(0, 10 - timeDistance); // Higher score for closer times
      score += timeScore;

      // Day pattern scoring
      const dayFrequency = stats.weekdays.filter((d: number) => d === currentWeekday).length;
      const dayScore = (dayFrequency / stats.count) * 5; // Bonus for same day of week
      score += dayScore;

      // Format usual time
      const usualHour = Math.round(avgTime);
      const usualTime = formatTime(usualHour);

      return {
        id: Math.random().toString(36).substr(2, 9),
        name: foodName,
        calories: stats.calories,
        usualTime: `usually ${usualTime}`,
        frequency: stats.count,
        score
      };
    });

    // Sort by score and return top 6 predictions
    return scoredFoods
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);
  };

  // Fallback predictions for new users
  const getFallbackPredictions = (): FoodPrediction[] => {
    const currentHour = new Date().getHours();
    let predictions: FoodPrediction[] = [];

    if (currentHour < 10) {
      // Morning predictions
      predictions = [
        { id: '1', name: 'Oatmeal with Berries', calories: 320, usualTime: 'usually 7:15 AM', frequency: 0 },
        { id: '2', name: 'Greek Yogurt', calories: 150, usualTime: 'usually 8:30 AM', frequency: 0 },
        { id: '3', name: 'Scrambled Eggs', calories: 200, usualTime: 'usually 7:45 AM', frequency: 0 },
        { id: '4', name: 'Banana', calories: 95, usualTime: 'usually 9:00 AM', frequency: 0 },
        { id: '5', name: 'Coffee with Milk', calories: 60, usualTime: 'usually 8:00 AM', frequency: 0 },
        { id: '6', name: 'Whole Grain Toast', calories: 80, usualTime: 'usually 7:30 AM', frequency: 0 }
      ];
    } else if (currentHour < 15) {
      // Lunch predictions
      predictions = [
        { id: '1', name: 'Chicken Salad', calories: 420, usualTime: 'usually 12:45 PM', frequency: 0 },
        { id: '2', name: 'Turkey Sandwich', calories: 380, usualTime: 'usually 1:00 PM', frequency: 0 },
        { id: '3', name: 'Quinoa Bowl', calories: 350, usualTime: 'usually 12:30 PM', frequency: 0 },
        { id: '4', name: 'Apple', calories: 95, usualTime: 'usually 2:00 PM', frequency: 0 },
        { id: '5', name: 'Mixed Green Salad', calories: 180, usualTime: 'usually 1:15 PM', frequency: 0 },
        { id: '6', name: 'Protein Smoothie', calories: 250, usualTime: 'usually 11:30 AM', frequency: 0 }
      ];
    } else {
      // Evening predictions
      predictions = [
        { id: '1', name: 'Grilled Salmon', calories: 280, usualTime: 'usually 6:30 PM', frequency: 0 },
        { id: '2', name: 'Chicken Breast', calories: 220, usualTime: 'usually 7:00 PM', frequency: 0 },
        { id: '3', name: 'Protein Shake', calories: 280, usualTime: 'usually 6:00 PM', frequency: 0 },
        { id: '4', name: 'Steamed Vegetables', calories: 80, usualTime: 'usually 6:45 PM', frequency: 0 },
        { id: '5', name: 'Brown Rice', calories: 110, usualTime: 'usually 7:15 PM', frequency: 0 },
        { id: '6', name: 'Almonds', calories: 160, usualTime: 'usually 8:00 PM', frequency: 0 }
      ];
    }

    return predictions;
  };

  // Format time helper
  const formatTime = (hour: number): string => {
    if (hour === 0) return '12:00 AM';
    if (hour < 12) return `${hour}:00 AM`;
    if (hour === 12) return '12:00 PM';
    return `${hour - 12}:00 PM`;
  };

  // Handle prediction click
  const handlePredictionClick = async (prediction: FoodPrediction) => {
    try {
      // Navigate to log page with the predicted food name pre-filled
      navigate(`/log?food=${encodeURIComponent(prediction.name)}`);
    } catch (error) {
      console.error('Error handling prediction click:', error);
    }
  };

  // Handle recent log click
  const handleRecentLogClick = (recentFood: RecentFood) => {
    navigate(`/log?food=${encodeURIComponent(recentFood.name)}`);
  };

  return (
    <Card className={`modern-action-card ai-insights-card border-0 rounded-3xl animate-slide-up float-animation hover:scale-[1.02] transition-all duration-500 shadow-xl hover:shadow-2xl ${isMobile ? 'mx-2' : 'mx-4'}`}>
      <CardContent className={`${isMobile ? 'p-6' : 'p-8'}`}>
        {/* Header */}
        <div className={`flex items-center justify-between ${isMobile ? 'mb-4' : 'mb-6'}`}>
          <div className={`flex items-center ${isMobile ? 'space-x-3' : 'space-x-4'}`}>
            <div className={`${isMobile ? 'w-10 h-10' : 'w-12 h-12'} gradient-primary rounded-full flex items-center justify-center shadow-lg ai-glow`}>
              <Brain className={`${isMobile ? 'h-5 w-5' : 'h-6 w-6'} text-white`} />
            </div>
            <div>
              <h3 className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-gray-900 dark:text-white`}>AI Quick Predictions</h3>
              <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-500 dark:text-gray-400 flex items-center gap-1`}>
                <Clock className="h-3 w-3" />
                Smart suggestions
              </p>
            </div>
          </div>
        </div>

        {/* AI Predictions Grid */}
        <div className="space-y-4 mb-6">
          {isLoading ? (
            <div className="grid grid-cols-1 gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 animate-pulse">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {predictions.map((prediction) => (
                <div
                  key={prediction.id}
                  onClick={() => handlePredictionClick(prediction)}
                  className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 border border-gray-200 dark:border-gray-600 hover:shadow-md"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-white dark:bg-gray-600 rounded-full flex items-center justify-center shadow-sm">
                      <span className="text-lg">🍽️</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-gray-900 dark:text-white text-sm truncate">
                        {prediction.name}
                      </h4>
                      <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {prediction.usualTime}
                        </span>
                        <span className="flex items-center gap-1">
                          <Zap className="h-3 w-3" />
                          {prediction.calories} cal
                        </span>
                      </div>
                    </div>
                    <div className="text-emerald-500 dark:text-emerald-400 text-sm font-medium">
                      Tap to log
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Collapsible Recent & Saved Logs */}
        <Collapsible open={isRecentLogsOpen} onOpenChange={setIsRecentLogsOpen}>
          <CollapsibleTrigger className="w-full">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200">
              <h4 className="font-semibold text-gray-900 dark:text-white text-sm">Recent & Saved Logs</h4>
              <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${isRecentLogsOpen ? 'rotate-180' : ''}`} />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3">
            <div className="space-y-2">
              {recentLogs.length > 0 ? (
                recentLogs.map((recentFood) => (
                  <div
                    key={recentFood.id}
                    onClick={() => handleRecentLogClick(recentFood)}
                    className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 border border-gray-200 dark:border-gray-600"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-white dark:bg-gray-600 rounded-full flex items-center justify-center shadow-sm">
                        <span className="text-sm">🍽️</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h5 className="font-medium text-gray-900 dark:text-white text-sm truncate">
                          {recentFood.name}
                          {recentFood.isSaved && <span className="ml-2 text-xs text-emerald-500">★ Saved</span>}
                        </h5>
                        <div className="flex items-center space-x-3 text-xs text-gray-500 dark:text-gray-400">
                          <span>Usually {recentFood.timestamp.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
                          <span>{recentFood.calories} cal</span>
                        </div>
                      </div>
                      <div className="text-emerald-500 dark:text-emerald-400 text-xs font-medium">
                        Tap to log
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <p className="text-sm">No recent logs yet. Start logging to see your patterns!</p>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Action Button */}
        <div className="mt-6">
          <Button
            onClick={() => navigate('/coach')}
            className={`w-full bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white ${isMobile ? 'px-6 py-4 text-base' : 'px-8 py-5 text-lg'} rounded-3xl font-bold shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-105 coach-button-glow`}
          >
            <div className="flex items-center justify-center space-x-2">
              <span>Ask your AI coach</span>
              <Sparkles className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
              <span>→</span>
            </div>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default HomeAIInsights;
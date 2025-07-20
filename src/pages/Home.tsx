
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth';
import { useNutrition } from '@/contexts/NutritionContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Camera, Plus, Zap, Droplets, Activity, Target } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DailyProgressSection } from '@/components/analytics/sections/DailyProgressSection';
import { LoggingStreakTracker } from '@/components/analytics/LoggingStreakTracker';
import { HomeAIInsights } from '@/components/HomeAIInsights';
import { HomeCtaTicker } from '@/components/HomeCtaTicker';
import { useDailyScore } from '@/hooks/useDailyScore';

const Home = () => {
  const { user } = useAuth();
  const { currentDay, weeklyData } = useNutrition();
  const navigate = useNavigate();
  const { todayScore } = useDailyScore();

  // Calculate today's progress
  const todayProgress = {
    calories: currentDay.foods.reduce((sum, food) => sum + (food.calories || 0), 0),
    protein: currentDay.foods.reduce((sum, food) => sum + (food.protein || 0), 0),
    carbs: currentDay.foods.reduce((sum, food) => sum + (food.carbs || 0), 0),
    fat: currentDay.foods.reduce((sum, food) => sum + (food.fat || 0), 0),
    hydration: currentDay.hydration
  };

  // Calculate weekly averages
  const weeklyAverage = {
    calories: weeklyData.reduce((sum, day) => sum + day.foods.reduce((daySum, food) => daySum + (food.calories || 0), 0), 0) / Math.max(weeklyData.length, 1),
    protein: weeklyData.reduce((sum, day) => sum + day.foods.reduce((daySum, food) => daySum + (food.protein || 0), 0), 0) / Math.max(weeklyData.length, 1),
    carbs: weeklyData.reduce((sum, day) => sum + day.foods.reduce((daySum, food) => daySum + (food.carbs || 0), 0), 0) / Math.max(weeklyData.length, 1),
    fat: weeklyData.reduce((sum, day) => sum + day.foods.reduce((daySum, food) => daySum + (food.fat || 0), 0), 0) / Math.max(weeklyData.length, 1),
    hydration: weeklyData.reduce((sum, day) => sum + day.hydration, 0) / Math.max(weeklyData.length, 1),
    steps: weeklyData.reduce((sum, day) => sum + (day.steps || 0), 0) / Math.max(weeklyData.length, 1)
  };

  const handleQuickLog = () => {
    navigate('/camera');
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Quick Log Section - Back at the top */}
      <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-primary/20 shadow-lg">
        <CardContent className="p-8">
          <div className="text-center space-y-6">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                Ready to Log?
              </h2>
              <p className="text-lg text-muted-foreground">
                Snap a photo or manually add your meal
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center max-w-md mx-auto">
              <Button
                onClick={handleQuickLog}
                size="lg"
                className="w-full sm:w-auto h-14 px-8 text-lg font-semibold bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                <Camera className="w-6 h-6 mr-3" />
                Quick Log
              </Button>
              
              <div className="text-sm text-muted-foreground hidden sm:block">
                or
              </div>
              
              <Button
                onClick={() => navigate('/camera')}
                variant="outline"
                size="lg"
                className="w-full sm:w-auto h-14 px-8 text-lg font-semibold border-2 hover:bg-muted/50 transition-all duration-300"
              >
                <Plus className="w-6 h-6 mr-3" />
                Manual Entry
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Today's Performance Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-foreground">Today's Performance</h2>
          {todayScore !== null && (
            <div className="flex items-center space-x-2">
              <Target className="w-5 h-5 text-primary" />
              <span className="text-lg font-semibold text-primary">
                {Math.round(todayScore)}/100
              </span>
            </div>
          )}
        </div>
        
        <DailyProgressSection 
          progress={todayProgress}
          weeklyAverage={weeklyAverage}
        />
      </div>

      {/* Logging Streak Tracker */}
      <LoggingStreakTracker />

      {/* AI Insights */}
      <HomeAIInsights />

      {/* CTA Ticker */}
      <HomeCtaTicker />
    </div>
  );
};

export default Home;

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNutrition } from '@/contexts/NutritionContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Target, TrendingUp, Award, Droplets, Pill, Camera, BarChart3, User, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { useScrollToTop } from '@/hooks/useScrollToTop';

const Home = () => {
  const { user } = useAuth();
  const { getTodaysProgress, currentDay } = useNutrition();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  
  // Only scroll to top when coming from other pages, not on initial load
  const [shouldScrollToTop, setShouldScrollToTop] = useState(false);
  
  useScrollToTop(shouldScrollToTop);

  const progress = getTodaysProgress();

  // Detect if user navigated here from another page
  useEffect(() => {
    const hasNavigated = sessionStorage.getItem('hasNavigated');
    if (hasNavigated) {
      setShouldScrollToTop(true);
      // Reset the flag after scrolling
      setTimeout(() => setShouldScrollToTop(false), 200);
    }
    sessionStorage.setItem('hasNavigated', 'true');
  }, []);

  const trackers = user?.selectedTrackers || ['calories', 'hydration', 'supplements'];
  const showCalories = trackers.includes('calories');
  const showHydration = trackers.includes('hydration');
  const showSupplements = trackers.includes('supplements');

  const caloriesTarget = user?.targetCalories || 2000;

  const getCaloriesColor = () => {
    const percentage = (progress.calories / caloriesTarget) * 100;
    if (percentage >= 100) return 'text-green-600';
    if (percentage >= 80) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getProteinColor = () => {
    const proteinTarget = user?.targetProtein || 150;
    const percentage = (progress.protein / proteinTarget) * 100;
    if (percentage >= 100) return 'text-green-600';
    if (percentage >= 80) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getCarbsColor = () => {
    const carbsTarget = user?.targetCarbs || 200;
    const percentage = (progress.carbs / carbsTarget) * 100;
    if (percentage >= 100) return 'text-green-600';
    if (percentage >= 80) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getFatColor = () => {
    const fatTarget = user?.targetFat || 65;
    const percentage = (progress.fat / fatTarget) * 100;
    if (percentage >= 100) return 'text-green-600';
    if (percentage >= 80) return 'text-yellow-600';
    return 'text-red-600';
  };

  const quickActions = [
    {
      icon: Camera,
      label: 'Log Food',
      description: 'Scan or add meals',
      path: '/camera',
      color: 'bg-gradient-to-br from-blue-500 to-purple-600',
    },
    {
      icon: BarChart3,
      label: 'Analytics',
      description: 'View progress',
      path: '/analytics',
      color: 'bg-gradient-to-br from-emerald-500 to-teal-600',
    },
    {
      icon: MessageSquare,
      label: 'AI Coach',
      description: 'Get guidance',
      path: '/coach',
      color: 'bg-gradient-to-br from-purple-500 to-pink-600',
    },
    {
      icon: User,
      label: 'Profile',
      description: 'Settings & goals',
      path: '/profile',
      color: 'bg-gradient-to-br from-orange-500 to-red-600',
    },
  ];

  return (
    <div className={`space-y-6 ${isMobile ? 'pb-24' : 'pb-32'}`}>
      {/* Welcome Section - No auto scroll, let users see naturally */}
      <div className="text-center py-6">
        <div className="flex justify-center mb-4">
          <div className={`${isMobile ? 'w-16 h-16' : 'w-20 h-20'} bg-gradient-to-br from-emerald-400 via-blue-500 to-purple-600 rounded-full flex items-center justify-center animate-pulse shadow-2xl`}>
            <Target className={`${isMobile ? 'h-8 w-8' : 'h-10 w-10'} text-white animate-bounce`} />
          </div>
        </div>
        <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent mb-2`}>
          Welcome back, {user?.name || 'there'}! 👋
        </h1>
        <p className={`text-emerald-600 dark:text-emerald-400 font-semibold ${isMobile ? 'text-sm' : 'text-base'}`}>
          Let's make today count!
        </p>
      </div>

      {/* Progress Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {showCalories && (
          <Card className="glass-card border-0 rounded-2xl">
            <CardHeader className="space-y-1">
              <CardTitle className="text-sm font-medium">Calories</CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
              <div className="text-2xl font-semibold">
                {progress.calories} / {caloriesTarget}
                <span className={`ml-2 ${getCaloriesColor()}`}>
                  ({((progress.calories / caloriesTarget) * 100).toFixed(0)}%)
                </span>
              </div>
              <Progress value={(progress.calories / caloriesTarget) * 100} className="h-4 mt-2" />
            </CardContent>
          </Card>
        )}

        <Card className="glass-card border-0 rounded-2xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-sm font-medium">Protein</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="text-2xl font-semibold">
              {progress.protein} / {user?.targetProtein || 150}
              <span className={`ml-2 ${getProteinColor()}`}>
                ({((progress.protein / (user?.targetProtein || 150)) * 100).toFixed(0)}%)
              </span>
            </div>
            <Progress value={(progress.protein / (user?.targetProtein || 150)) * 100} className="h-4 mt-2" />
          </CardContent>
        </Card>

        <Card className="glass-card border-0 rounded-2xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-sm font-medium">Carbs</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="text-2xl font-semibold">
              {progress.carbs} / {user?.targetCarbs || 200}
              <span className={`ml-2 ${getCarbsColor()}`}>
                ({((progress.carbs / (user?.targetCarbs || 200)) * 100).toFixed(0)}%)
              </span>
            </div>
            <Progress value={(progress.carbs / (user?.targetCarbs || 200)) * 100} className="h-4 mt-2" />
          </CardContent>
        </Card>

        <Card className="glass-card border-0 rounded-2xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-sm font-medium">Fat</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="text-2xl font-semibold">
              {progress.fat} / {user?.targetFat || 65}
              <span className={`ml-2 ${getFatColor()}`}>
                ({((progress.fat / (user?.targetFat || 65)) * 100).toFixed(0)}%)
              </span>
            </div>
            <Progress value={(progress.fat / (user?.targetFat || 65)) * 100} className="h-4 mt-2" />
          </CardContent>
        </Card>

        {showHydration && (
          <Card className="glass-card border-0 rounded-2xl">
            <CardHeader className="space-y-1">
              <CardTitle className="text-sm font-medium">Hydration</CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
              <div className="text-2xl font-semibold">
                {currentDay.totalHydration} / {user?.targetHydration || 8}
                <span className="ml-2 text-blue-600">
                  ({((currentDay.totalHydration / (user?.targetHydration || 8)) * 100).toFixed(0)}%)
                </span>
              </div>
              <Progress value={(currentDay.totalHydration / (user?.targetHydration || 8)) * 100} className="h-4 mt-2" />
            </CardContent>
          </Card>
        )}

        {showSupplements && (
          <Card className="glass-card border-0 rounded-2xl">
            <CardHeader className="space-y-1">
              <CardTitle className="text-sm font-medium">Supplements</CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
              <div className="text-2xl font-semibold">
                {currentDay.supplements.length} / {user?.targetSupplements || 3}
                <span className="ml-2 text-yellow-600">
                  ({((currentDay.supplements.length / (user?.targetSupplements || 3)) * 100).toFixed(0)}%)
                </span>
              </div>
              <Progress value={(currentDay.supplements.length / (user?.targetSupplements || 3)) * 100} className="h-4 mt-2" />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {quickActions.map((action, index) => (
          <Card key={index} className="glass-card border-0 rounded-2xl hover:scale-105 transition-transform duration-200">
            <CardContent className="flex items-center space-x-4 p-4">
              <div className={`${action.color} w-12 h-12 rounded-full flex items-center justify-center text-white shadow-md`}>
                <action.icon className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-semibold">{action.label}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{action.description}</p>
                <Button variant="link" className="text-blue-500 hover:text-blue-700 p-0" onClick={() => navigate(action.path)}>
                  Go &rarr;
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Home;


import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Zap, Utensils, Clock, ChevronUp, BarChart3, Droplet } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNutrition } from '@/contexts/NutritionContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from "@/components/ui/use-toast"
import { useAppLifecycle } from '@/hooks/useAppLifecycle';
import { useLoadingTimeout } from '@/hooks/useLoadingTimeout';

const Home = () => {
  const { user, loading: authLoading } = useAuth();
  const { addFood } = useNutrition();
  const navigate = useNavigate();
  const { toast } = useToast()
  const [showAllPredictions, setShowAllPredictions] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  // Loading timeout with recovery
  const { hasTimedOut, showRecovery, retry } = useLoadingTimeout(authLoading, {
    timeoutMs: 10000,
    onTimeout: () => {
      console.warn('Home page loading timeout - showing recovery options');
    }
  });

  // App lifecycle awareness
  useAppLifecycle({
    onForeground: () => {
      console.log('Home page: App came to foreground');
      if (hasTimedOut) {
        console.log('Attempting automatic retry after foreground');
        handleRetry();
      }
    },
  });

  // Mock data for AI predictions and saved logs
  const mockPredictions = [
    { name: "Chicken Salad", time: "Lunch", calories: 450 },
    { name: "Protein Shake", time: "Post-workout", calories: 250 },
    { name: "Avocado Toast", time: "Breakfast", calories: 300 },
    { name: "Salmon with Quinoa", time: "Dinner", calories: 600 },
    { name: "Greek Yogurt", time: "Snack", calories: 150 },
  ];

  const mockSavedLogs = [
    { name: "Oatmeal with Berries", time: "Breakfast", calories: 350 },
    { name: "Turkey Sandwich", time: "Lunch", calories: 400 },
  ];

  const handleQuickLog = useCallback((food: { name: string; calories: number }) => {
    addFood({
      name: food.name,
      calories: food.calories,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      sugar: 0,
      sodium: 0,
    });
    toast({
      title: "Food Logged!",
      description: `Added ${food.name} to your food log.`,
    })
    navigate('/camera');
  }, [addFood, navigate, toast]);

  const handleRetry = useCallback(() => {
    setIsRetrying(true);
    retry();
    setTimeout(() => {
      setIsRetrying(false);
    }, 2000);
  }, [retry]);

  useEffect(() => {
    if (user) {
      console.log('User data loaded:', user);
    }
  }, [user]);

  // Show recovery UI if loading has timed out
  if (showRecovery && !user) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="glass-card border-0 max-w-md w-full">
          <CardContent className="card-spacing text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-red-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Loading Taking Too Long?
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              The app seems to be taking longer than usual to load. Try refreshing to get back on track.
            </p>
            <div className="space-y-3">
              <Button 
                onClick={handleRetry}
                disabled={isRetrying}
                className="w-full"
              >
                {isRetrying ? 'Retrying...' : 'Tap to Reload'}
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => window.location.reload()}
                className="w-full"
              >
                Force Refresh
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show loading state
  if (authLoading && !hasTimedOut) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading your nutrition dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <Card className="glass-card border-0">
        <CardContent className="card-spacing">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                Welcome back, {user?.user_metadata?.full_name || 'there'}! 👋
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Ready to track your nutrition today?
              </p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-emerald-400 to-blue-500 rounded-full flex items-center justify-center">
              <Zap className="h-6 w-6 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Quick Predictions */}
      <Card className="glass-card border-0">
        <CardHeader className="pb-3">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">AI Quick Predictions</CardTitle>
              <CardDescription className="text-sm">Smart suggestions</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="card-spacing pt-0">
          <div className="space-y-3">
            {mockPredictions.slice(0, showAllPredictions ? mockPredictions.length : 3).map((prediction, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                    <Utensils className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{prediction.name}</h3>
                    <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                      <Clock className="h-3 w-3" />
                      <span>{prediction.time}</span>
                      <span>{prediction.calories} cal</span>
                    </div>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                  onClick={() => handleQuickLog(prediction)}
                >
                  Tap to log
                </Button>
              </div>
            ))}
            
            {mockPredictions.length > 3 && (
              <>
                <Button
                  variant="ghost"
                  onClick={() => setShowAllPredictions(!showAllPredictions)}
                  className="w-full flex items-center justify-center space-x-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white py-3"
                >
                  <ChevronUp className={`h-4 w-4 transition-transform ${showAllPredictions ? 'rotate-180' : ''}`} />
                  <span>{showAllPredictions ? 'Recent & Saved Logs' : 'Recent & Saved Logs'}</span>
                </Button>

                {showAllPredictions && (
                  <div className="space-y-3 pt-2">
                    {mockSavedLogs.map((log, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                            <Utensils className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white">{log.name}</h3>
                            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                              <Clock className="h-3 w-3" />
                              <span>{log.time}</span>
                              <span>{log.calories} cal</span>
                            </div>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                          onClick={() => handleQuickLog(log)}
                        >
                          Tap to log
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Daily Progress */}
      <Card className="glass-card border-0">
        <CardHeader className="pb-3">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-full flex items-center justify-center">
              <BarChart3 className="h-4 w-4 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">Daily Progress</CardTitle>
              <CardDescription className="text-sm">Your goals for today</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="card-spacing">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">Calories</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">2000 / 2500 kcal</p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">Protein</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">120 / 150 g</p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">Carbs</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">250 / 300 g</p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">Fat</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">60 / 70 g</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hydration Tracking */}
      <Card className="glass-card border-0">
        <CardHeader className="pb-3">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full flex items-center justify-center">
              <Droplet className="h-4 w-4 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">Hydration Tracking</CardTitle>
              <CardDescription className="text-sm">Stay hydrated!</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="card-spacing">
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Water Intake</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">2 / 3 Liters</p>
            </div>
            <Button variant="ghost" size="sm" className="text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20">Add Water</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Home;

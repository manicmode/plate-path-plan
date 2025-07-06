import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Zap, Utensils, Clock, ChevronUp } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNutrition } from '@/contexts/NutritionContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from "@/components/ui/use-toast"

const Home = () => {
  const { user } = useAuth();
  const { addFoodLog } = useNutrition();
  const navigate = useNavigate();
  const { toast } = useToast()
  const [showAllPredictions, setShowAllPredictions] = useState(false);

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
    addFoodLog({
      name: food.name,
      calories: food.calories,
      protein: 0,
      carbs: 0,
      fat: 0,
      timestamp: new Date().toISOString(),
    });
    toast({
      title: "Food Logged!",
      description: `Added ${food.name} to your food log.`,
    })
    navigate('/camera');
  }, [addFoodLog, navigate, toast]);

  useEffect(() => {
    if (user) {
      console.log('User data loaded:', user);
    }
  }, [user]);

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
                  <span>{showAllPredictions ? 'Recent & Saved Logs' : 'Show more'}</span>
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

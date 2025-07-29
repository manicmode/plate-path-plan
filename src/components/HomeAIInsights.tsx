import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/auth';
import { useNutrition } from '@/contexts/NutritionContext';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import FoodConfirmationCard from './FoodConfirmationCard';
import CoachInsightsBar from './CoachInsightsBar';

const HomeAIInsights = () => {
  const { user } = useAuth();
  const { getTodaysProgress, addFood, currentDay } = useNutrition();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const progress = getTodaysProgress();
  
  // State for food logging
  const [selectedFood, setSelectedFood] = useState(null);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [showMorePredictions, setShowMorePredictions] = useState(false);
  const [recentLogs, setRecentLogs] = useState([]);

  // Fetch recent logs
  useEffect(() => {
    const fetchRecentLogs = async () => {
      if (!user?.id) return;

      const { data, error } = await supabase
        .from('nutrition_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (!error && data) {
        setRecentLogs(data);
      }
    };

    fetchRecentLogs();
  }, [user?.id]);

  // Generate AI food predictions based on time of day and user patterns
  const generateAIPredictions = () => {
    const currentHour = new Date().getHours();
    const currentMinutes = new Date().getMinutes();
    
    let predictions = [];
    
    if (currentHour < 10) {
      // Morning predictions
      predictions = [
        { name: 'Greek Yogurt', calories: 150, time: '8:30 AM', protein: 15, carbs: 12, fat: 4, fiber: 0, sugar: 12, sodium: 65 },
        { name: 'Oatmeal with Berries', calories: 220, time: '9:00 AM', protein: 6, carbs: 45, fat: 4, fiber: 8, sugar: 15, sodium: 5 },
        { name: 'Whole Grain Toast', calories: 160, time: '8:45 AM', protein: 6, carbs: 28, fat: 3, fiber: 4, sugar: 2, sodium: 240 },
        { name: 'Banana', calories: 105, time: '9:15 AM', protein: 1, carbs: 27, fat: 0, fiber: 3, sugar: 14, sodium: 1 },
        { name: 'Green Smoothie', calories: 180, time: '8:15 AM', protein: 4, carbs: 35, fat: 2, fiber: 6, sugar: 25, sodium: 15 },
        { name: 'Eggs Benedict', calories: 350, time: '9:30 AM', protein: 20, carbs: 28, fat: 18, fiber: 2, sugar: 3, sodium: 1200 }
      ];
    } else if (currentHour < 14) {
      // Lunch predictions
      predictions = [
        { name: 'Chicken Salad', calories: 320, time: '12:30 PM', protein: 35, carbs: 8, fat: 15, fiber: 4, sugar: 5, sodium: 450 },
        { name: 'Quinoa Bowl', calories: 380, time: '1:00 PM', protein: 14, carbs: 58, fat: 12, fiber: 8, sugar: 6, sodium: 320 },
        { name: 'Turkey Sandwich', calories: 290, time: '12:15 PM', protein: 25, carbs: 32, fat: 8, fiber: 5, sugar: 4, sodium: 850 },
        { name: 'Mediterranean Wrap', calories: 340, time: '1:15 PM', protein: 18, carbs: 42, fat: 14, fiber: 6, sugar: 8, sodium: 680 },
        { name: 'Salmon Fillet', calories: 250, time: '12:45 PM', protein: 28, carbs: 0, fat: 14, fiber: 0, sugar: 0, sodium: 80 },
        { name: 'Vegetable Stir Fry', calories: 280, time: '1:30 PM', protein: 12, carbs: 35, fat: 12, fiber: 7, sugar: 12, sodium: 590 }
      ];
    } else if (currentHour < 18) {
      // Afternoon snack predictions
      predictions = [
        { name: 'Apple with Peanut Butter', calories: 190, time: '3:30 PM', protein: 7, carbs: 20, fat: 12, fiber: 5, sugar: 16, sodium: 75 },
        { name: 'Trail Mix', calories: 150, time: '4:00 PM', protein: 5, carbs: 13, fat: 11, fiber: 3, sugar: 8, sodium: 45 },
        { name: 'Protein Bar', calories: 200, time: '3:15 PM', protein: 20, carbs: 15, fat: 7, fiber: 3, sugar: 8, sodium: 150 },
        { name: 'Hummus with Carrots', calories: 120, time: '4:15 PM', protein: 5, carbs: 14, fat: 6, fiber: 4, sugar: 8, sodium: 240 },
        { name: 'Greek Yogurt Parfait', calories: 180, time: '3:45 PM', protein: 12, carbs: 25, fat: 4, fiber: 3, sugar: 20, sodium: 80 },
        { name: 'Mixed Nuts', calories: 170, time: '4:30 PM', protein: 6, carbs: 6, fat: 15, fiber: 3, sugar: 1, sodium: 5 }
      ];
    } else {
      // Dinner predictions
      predictions = [
        { name: 'Grilled Chicken Breast', calories: 280, time: '7:00 PM', protein: 32, carbs: 0, fat: 16, fiber: 0, sugar: 0, sodium: 95 },
        { name: 'Pasta Primavera', calories: 420, time: '7:30 PM', protein: 15, carbs: 65, fat: 12, fiber: 5, sugar: 8, sodium: 650 },
        { name: 'Beef Stir Fry', calories: 350, time: '6:45 PM', protein: 25, carbs: 28, fat: 16, fiber: 4, sugar: 12, sodium: 780 },
        { name: 'Fish Tacos', calories: 380, time: '7:15 PM', protein: 22, carbs: 45, fat: 14, fiber: 6, sugar: 5, sodium: 920 },
        { name: 'Vegetarian Curry', calories: 310, time: '8:00 PM', protein: 12, carbs: 48, fat: 10, fiber: 8, sugar: 15, sodium: 850 },
        { name: 'Pork Tenderloin', calories: 290, time: '6:30 PM', protein: 30, carbs: 8, fat: 14, fiber: 2, sugar: 5, sodium: 420 }
      ];
    }

    return predictions;
  };

  const aiPredictions = generateAIPredictions();
  const visiblePredictions = showMorePredictions ? aiPredictions : aiPredictions.slice(0, 3);

  const handleFoodClick = (food) => {
    setSelectedFood(food);
    setIsConfirmationOpen(true);
  };

  const handleConfirmFood = (confirmedFood) => {
    addFood(confirmedFood);
    setIsConfirmationOpen(false);
    setSelectedFood(null);
  };

  const formatTime = (timeString) => {
    return timeString;
  };

  const formatUsualTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  return (
    <>
      <Card className={`modern-action-card border-0 rounded-3xl animate-slide-up float-animation hover:scale-[1.02] transition-all duration-500 shadow-xl hover:shadow-2xl ${isMobile ? 'mx-2' : 'mx-4'}`}>
        <CardContent className={`${isMobile ? 'p-6' : 'p-8'}`}>
          {/* AI Quick Predictions Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-gray-900 dark:text-white`}>
                AI Quick Predictions
              </h3>
              <span className="text-sm text-gray-500 dark:text-gray-400">Smart suggestions</span>
            </div>

            {/* AI Prediction Cards */}
            <div className="space-y-3 mb-4">
              {visiblePredictions.map((food, index) => (
                <Card key={index} className="border border-gray-200 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-600 transition-all duration-200 hover:shadow-md cursor-pointer" onClick={() => handleFoodClick(food)}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-blue-500 rounded-lg flex items-center justify-center">
                          <span className="text-lg">🍽️</span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-white">{food.name}</h4>
                          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                            <Clock className="h-3 w-3" />
                            <span>{formatTime(food.time)}</span>
                            <span>•</span>
                            <span>{food.calories} cal</span>
                          </div>
                        </div>
                      </div>
                      <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl">
                        Tap to log
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Show More/Less Toggle */}
            <div className="flex justify-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowMorePredictions(!showMorePredictions)}
                className="text-gray-600 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400"
              >
                {showMorePredictions ? (
                  <>
                    Show less <ChevronUp className="h-4 w-4 ml-1" />
                  </>
                ) : (
                  <>
                    Show more <ChevronDown className="h-4 w-4 ml-1" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Coach Insights Bar - Between AI Predictions and Recent Logs */}
      <CoachInsightsBar />

      <Card className={`modern-action-card border-0 rounded-3xl animate-slide-up float-animation hover:scale-[1.02] transition-all duration-500 shadow-xl hover:shadow-2xl ${isMobile ? 'mx-2' : 'mx-4'}`}>
        <CardContent className={`${isMobile ? 'p-6' : 'p-8'}`}>
          {/* Recent & Saved Logs Section */}
          <div className="mb-8">
            <h3 className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-gray-900 dark:text-white mb-6`}>
              Recent & Saved Logs
            </h3>

            {recentLogs.length > 0 ? (
              <div className="space-y-3">
                {recentLogs.slice(0, 3).map((log, index) => (
                  <Card key={index} className="border border-gray-200 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-600 transition-all duration-200 hover:shadow-md cursor-pointer" onClick={() => handleFoodClick({
                    name: log.food_name,
                    calories: log.calories,
                    protein: log.protein,
                    carbs: log.carbs,
                    fat: log.fat,
                    fiber: log.fiber || 0,
                    sugar: log.sugar || 0,
                    sodium: log.sodium || 0,
                    time: `Usually ${formatUsualTime(log.created_at)}`
                  })}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-lg flex items-center justify-center">
                            <span className="text-lg">🍽️</span>
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900 dark:text-white">{log.food_name}</h4>
                            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                              <Clock className="h-3 w-3" />
                              <span>Usually {formatUsualTime(log.created_at)}</span>
                              <span>•</span>
                              <span>{log.calories} cal</span>
                            </div>
                          </div>
                        </div>
                        <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl">
                          Tap to log
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-gray-500 dark:text-gray-400">Start logging foods to see your recent meals here</p>
              </div>
            )}
          </div>

        </CardContent>
      </Card>

      {/* Food Confirmation Modal */}
      <FoodConfirmationCard
        isOpen={isConfirmationOpen}
        onClose={() => {
          setIsConfirmationOpen(false);
          setSelectedFood(null);
        }}
        onConfirm={handleConfirmFood}
        foodItem={selectedFood}
      />
    </>
  );
};

export default HomeAIInsights;
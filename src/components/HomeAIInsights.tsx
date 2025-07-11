
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Zap, Sparkles, ChefHat, Target, TrendingUp, Clock, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNutrition } from '@/contexts/NutritionContext';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { useState, useEffect } from 'react';

const HomeAIInsights = () => {
  const { user } = useAuth();
  const { getTodaysProgress, getHydrationGoal, getSupplementGoal } = useNutrition();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const progress = getTodaysProgress();
  const [currentInsightIndex, setCurrentInsightIndex] = useState(0);
  const [lastRefresh, setLastRefresh] = useState(Date.now());

  const totalCalories = user?.targetCalories || 2000;
  const currentCalories = progress.calories;
  const progressPercentage = Math.min((currentCalories / totalCalories) * 100, 100);
  const hydrationGoal = getHydrationGoal();
  const hydrationPercentage = Math.min((progress.hydration / hydrationGoal) * 100, 100);
  const supplementGoal = getSupplementGoal();
  const supplementPercentage = Math.min((progress.supplements / supplementGoal) * 100, 100);

  // Get current time context
  const currentHour = new Date().getHours();
  const timeOfDay = currentHour < 12 ? 'morning' : currentHour < 17 ? 'afternoon' : 'evening';

  // Generate dynamic insights based on user data and context
  const generateInsights = () => {
    const insights = [];
    const userName = user?.name?.split(' ')[0] || 'there';

    // Progress-based insights
    if (progressPercentage >= 100) {
      insights.push({
        icon: '🎯',
        title: 'Calorie Goal Crushed!',
        message: `Amazing work, ${userName}! You've hit your daily calorie target. Your consistency is paying off!`,
        type: 'achievement'
      });
    } else if (progressPercentage >= 80) {
      insights.push({
        icon: '🔥',
        title: 'Almost There!',
        message: `You're at ${Math.round(progressPercentage)}% of your calorie goal. Just ${Math.round(totalCalories - currentCalories)} calories to go!`,
        type: 'progress'
      });
    } else if (progressPercentage >= 50) {
      insights.push({
        icon: '💪',
        title: 'Halfway Champion!',
        message: `Great momentum, ${userName}! You're halfway to your daily goal. Keep this energy going!`,
        type: 'encouragement'
      });
    }

    // Hydration insights
    if (hydrationPercentage >= 100) {
      insights.push({
        icon: '💧',
        title: 'Hydration Hero!',
        message: `Excellent hydration today! Your body is thanking you for staying so well hydrated.`,
        type: 'achievement'
      });
    } else if (hydrationPercentage < 50) {
      insights.push({
        icon: '🚰',
        title: 'Hydration Reminder',
        message: `Time to drink up! You're at ${Math.round(hydrationPercentage)}% of your hydration goal. Your body needs more water.`,
        type: 'reminder'
      });
    }

    // Time-based contextual insights
    if (timeOfDay === 'morning' && progressPercentage < 25) {
      insights.push({
        icon: '🌅',
        title: 'Morning Fuel Needed',
        message: `Good morning, ${userName}! Start your day strong with a nutritious breakfast to fuel your goals.`,
        type: 'timing'
      });
    } else if (timeOfDay === 'afternoon' && progressPercentage < 60) {
      insights.push({
        icon: '☀️',
        title: 'Afternoon Energy Boost',
        message: `Perfect time for a healthy lunch! You're doing great - keep nourishing your body.`,
        type: 'timing'
      });
    } else if (timeOfDay === 'evening' && progressPercentage > 90) {
      insights.push({
        icon: '🌙',
        title: 'Evening Balance',
        message: `You've had a fantastic nutrition day! Consider a light, protein-rich evening snack if needed.`,
        type: 'timing'
      });
    }

    // Macro balance insights
    const proteinPercentage = Math.min((progress.protein / (user?.targetProtein || 150)) * 100, 100);
    if (proteinPercentage < 50 && progressPercentage > 50) {
      insights.push({
        icon: '🥩',
        title: 'Protein Power Up',
        message: `Your protein intake is at ${Math.round(proteinPercentage)}%. Consider adding lean protein to reach your strength goals!`,
        type: 'macro'
      });
    }

    // Health goal specific insights
    if (user?.main_health_goal === 'weight_loss' && progressPercentage > 110) {
      insights.push({
        icon: '⚖️',
        title: 'Weight Loss Focus',
        message: `You're slightly over your calorie goal. Tomorrow, try focusing on high-volume, low-calorie foods to stay satisfied.`,
        type: 'goal'
      });
    } else if (user?.main_health_goal === 'muscle_gain' && proteinPercentage < 70) {
      insights.push({
        icon: '💪',
        title: 'Muscle Building Tip',
        message: `For muscle gain, aim for more protein! You're at ${Math.round(proteinPercentage)}% of your protein target.`,
        type: 'goal'
      });
    }

    // Default motivational insights
    if (insights.length === 0) {
      insights.push({
        icon: '✨',
        title: 'You\'re Doing Great!',
        message: `Every healthy choice you make is an investment in your future self. Keep up the amazing work, ${userName}!`,
        type: 'motivation'
      });
    }

    return insights;
  };

  // Generate personalized recipe hints based on user profile
  const generateRecipeHints = () => {
    const hints = [];
    const dietStyles = user?.diet_styles || [];
    const healthGoal = user?.main_health_goal;
    const foodsToAvoid = user?.foods_to_avoid || '';

    // Base recipe suggestions
    if (dietStyles.includes('vegetarian') || dietStyles.includes('vegan')) {
      hints.push({
        title: 'Plant-Powered Protein Bowl',
        description: 'Quinoa, chickpeas, and colorful veggies with tahini dressing',
        benefits: 'High protein, fiber-rich, and perfectly balanced for your plant-based lifestyle',
        emoji: '🌱'
      });
    }

    if (dietStyles.includes('keto') || dietStyles.includes('low_carb')) {
      hints.push({
        title: 'Keto Salmon & Avocado Delight',
        description: 'Pan-seared salmon with creamy avocado and leafy greens',
        benefits: 'High healthy fats, zero carbs, perfect for ketosis',
        emoji: '🥑'
      });
    }

    if (healthGoal === 'muscle_gain') {
      hints.push({
        title: 'Muscle-Building Power Smoothie',
        description: 'Protein powder, banana, oats, and almond butter blend',
        benefits: 'Post-workout recovery with 35g protein and complex carbs',
        emoji: '💪'
      });
    }

    if (healthGoal === 'weight_loss') {
      hints.push({
        title: 'Metabolism-Boosting Soup',
        description: 'Spicy vegetable soup with lean turkey and plenty of fiber',
        benefits: 'Low calorie, high volume, keeps you full for hours',
        emoji: '🔥'
      });
    }

    // Time-based suggestions
    if (timeOfDay === 'morning') {
      hints.push({
        title: 'Morning Glory Breakfast',
        description: 'Greek yogurt parfait with berries and granola',
        benefits: 'Perfect protein start to fuel your day ahead',
        emoji: '🌅'
      });
    }

    // Default suggestion
    if (hints.length === 0) {
      hints.push({
        title: 'Balanced Rainbow Bowl',
        description: 'Colorful mix of proteins, grains, and fresh vegetables',
        benefits: 'Perfectly balanced nutrition tailored to your goals',
        emoji: '🌈'
      });
    }

    return hints[Math.floor(Math.random() * hints.length)];
  };

  const insights = generateInsights();
  const recipeHint = generateRecipeHints();

  // Rotate insights every 10 seconds
  useEffect(() => {
    if (insights.length > 1) {
      const interval = setInterval(() => {
        setCurrentInsightIndex((prev) => (prev + 1) % insights.length);
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [insights.length]);

  // Manual refresh function
  const handleRefresh = () => {
    setLastRefresh(Date.now());
    setCurrentInsightIndex(0);
  };

  const currentInsight = insights[currentInsightIndex] || insights[0];

  return (
    <Card className={`modern-action-card ai-insights-card border-0 rounded-3xl animate-slide-up float-animation hover:scale-[1.02] transition-all duration-500 shadow-xl hover:shadow-2xl ${isMobile ? 'mx-2' : 'mx-4'}`}>
      <CardContent className={`${isMobile ? 'p-6' : 'p-8'}`}>
        {/* Header with refresh button */}
        <div className={`flex items-center justify-between ${isMobile ? 'mb-4' : 'mb-6'}`}>
          <div className={`flex items-center ${isMobile ? 'space-x-3' : 'space-x-4'}`}>
            <div className={`${isMobile ? 'w-10 h-10' : 'w-12 h-12'} gradient-primary rounded-full flex items-center justify-center shadow-lg ai-glow`}>
              <Zap className={`${isMobile ? 'h-5 w-5' : 'h-6 w-6'} text-white`} />
            </div>
            <div>
              <h3 className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-gray-900 dark:text-white`}>AI Insights</h3>
              <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-500 dark:text-gray-400`}>Live & Personalized</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <RefreshCw className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
          </Button>
        </div>

        {/* Current Insight */}
        <div className={`space-y-4 ${isMobile ? 'mb-6' : 'mb-8'}`}>
          <div className="flex items-start space-x-3">
            <div className="text-2xl flex-shrink-0 mt-1">{currentInsight?.icon}</div>
            <div className="flex-1">
              <h4 className={`${isMobile ? 'text-base' : 'text-lg'} font-bold text-gray-900 dark:text-white mb-2`}>
                {currentInsight?.title}
              </h4>
              <p className={`${isMobile ? 'text-sm' : 'text-base'} text-gray-700 dark:text-gray-300`}>
                {currentInsight?.message}
              </p>
            </div>
          </div>
          
          {/* Progress indicators if multiple insights */}
          {insights.length > 1 && (
            <div className="flex justify-center space-x-2 mt-4">
              {insights.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    index === currentInsightIndex ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Personalized Recipe Hint Section */}
        <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-2xl p-4 sm:p-6 mb-6">
          <div className="flex items-center space-x-2 mb-3">
            <ChefHat className={`${isMobile ? 'h-5 w-5' : 'h-6 w-6'} text-orange-600 dark:text-orange-400`} />
            <h4 className={`${isMobile ? 'text-base' : 'text-lg'} font-bold text-gray-900 dark:text-white`}>
              Personalized Recipe Hint
            </h4>
            <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800 dark:bg-orange-800 dark:text-orange-100">
              Coming Soon
            </Badge>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <div className="text-2xl flex-shrink-0">{recipeHint.emoji}</div>
              <div className="flex-1">
                <h5 className={`${isMobile ? 'text-sm' : 'text-base'} font-semibold text-gray-900 dark:text-white mb-1`}>
                  {recipeHint.title}
                </h5>
                <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600 dark:text-gray-400 mb-2`}>
                  {recipeHint.description}
                </p>
                <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-orange-700 dark:text-orange-300 font-medium`}>
                  💡 {recipeHint.benefits}
                </p>
              </div>
            </div>
            
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center space-x-2">
                <Sparkles className="h-4 w-4 text-orange-500" />
                <span className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600 dark:text-gray-400`}>
                  Tailored to your goals & preferences
                </span>
              </div>
              <div className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400">
                <Clock className="h-3 w-3" />
                <span>Updates daily</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Button */}
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
      </CardContent>
    </Card>
  );
};

export default HomeAIInsights;

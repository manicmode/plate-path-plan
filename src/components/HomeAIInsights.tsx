import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Brain, MessageCircle, BarChart3, Calendar, Sparkles, ChevronDown, Clock, TrendingUp } from 'lucide-react';
import { useAuth } from '@/contexts/auth';
import { useNutrition } from '@/contexts/NutritionContext';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useReviewNotifications } from '@/hooks/useReviewNotifications';
import { calculateConsistencyScores, ConsistencyScore } from '@/utils/consistencyCalculations';

const HomeAIInsights = () => {
  const { user } = useAuth();
  const { getTodaysProgress } = useNutrition();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const progress = getTodaysProgress();
  const [currentSequenceIndex, setCurrentSequenceIndex] = useState(0);
  const [fadeState, setFadeState] = useState('fade-in');
  const [moodPrediction, setMoodPrediction] = useState(null);
  const [weeklyReview, setWeeklyReview] = useState(null);
  const [monthlyReview, setMonthlyReview] = useState(null);
  const [foodPredictions, setFoodPredictions] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);
  const [isRecentLogsOpen, setIsRecentLogsOpen] = useState(false);
  const [isLoadingPredictions, setIsLoadingPredictions] = useState(true);
  const { scheduleReviewNotifications } = useReviewNotifications();

  // Generate food predictions based on user patterns
  const generateFoodPredictions = async () => {
    if (!user?.id) return [];
    
    try {
      // Get nutrition logs from past 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: nutritionData } = await supabase
        .from('nutrition_logs')
        .select('food_name, calories, created_at')
        .eq('user_id', user.id)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false });

      if (!nutritionData || nutritionData.length === 0) {
        // Fallback predictions for new users based on time of day
        const currentHour = new Date().getHours();
        if (currentHour < 11) {
          return [
            { food_name: 'Greek Yogurt with Berries', calories: 150, usual_time: 'morning', frequency: 1 },
            { food_name: 'Oatmeal with Banana', calories: 200, usual_time: 'morning', frequency: 1 },
            { food_name: 'Scrambled Eggs', calories: 180, usual_time: 'morning', frequency: 1 },
            { food_name: 'Whole Grain Toast', calories: 120, usual_time: 'morning', frequency: 1 }
          ];
        } else if (currentHour < 16) {
          return [
            { food_name: 'Grilled Chicken Salad', calories: 300, usual_time: 'afternoon', frequency: 1 },
            { food_name: 'Turkey Sandwich', calories: 250, usual_time: 'afternoon', frequency: 1 },
            { food_name: 'Quinoa Bowl', calories: 280, usual_time: 'afternoon', frequency: 1 },
            { food_name: 'Vegetable Soup', calories: 150, usual_time: 'afternoon', frequency: 1 }
          ];
        } else {
          return [
            { food_name: 'Grilled Salmon', calories: 250, usual_time: 'evening', frequency: 1 },
            { food_name: 'Stir-fry Vegetables', calories: 180, usual_time: 'evening', frequency: 1 },
            { food_name: 'Lean Beef with Rice', calories: 320, usual_time: 'evening', frequency: 1 },
            { food_name: 'Baked Chicken Breast', calories: 200, usual_time: 'evening', frequency: 1 }
          ];
        }
      }

      // Analyze frequency patterns
      const foodFrequency = {};
      const foodTimes = {};
      
      nutritionData.forEach(log => {
        const foodName = log.food_name;
        const logTime = new Date(log.created_at);
        const hour = logTime.getHours();
        
        // Count frequency
        foodFrequency[foodName] = (foodFrequency[foodName] || 0) + 1;
        
        // Track usual times
        if (!foodTimes[foodName]) foodTimes[foodName] = [];
        foodTimes[foodName].push(hour);
      });

      // Calculate predictions with context scoring
      const currentHour = new Date().getHours();
      const currentDay = new Date().getDay();
      
      const predictions = Object.entries(foodFrequency).map(([foodName, frequency]) => {
        const times = foodTimes[foodName];
        const avgHour = times.reduce((sum, hour) => sum + hour, 0) / times.length;
        
        // Time context scoring
        let timeScore = 1;
        const hourDiff = Math.abs(currentHour - avgHour);
        if (hourDiff <= 2) timeScore = 3; // Very relevant time
        else if (hourDiff <= 4) timeScore = 2; // Somewhat relevant
        
        // Get usual time label
        let usual_time = 'morning';
        if (avgHour >= 11 && avgHour < 16) usual_time = 'afternoon';
        else if (avgHour >= 16) usual_time = 'evening';
        
        // Calculate final score
        const finalScore = (frequency as number) * timeScore;
        
        // Get average calories for this food
        const foodLogs = nutritionData.filter(log => log.food_name === foodName);
        const avgCalories = Math.round(foodLogs.reduce((sum, log) => sum + log.calories, 0) / foodLogs.length);
        
        return {
          food_name: foodName,
          calories: avgCalories,
          usual_time,
          frequency: frequency as number,
          score: finalScore
        };
      });

      // Sort by score and return top 6
      return predictions
        .sort((a, b) => b.score - a.score)
        .slice(0, 6);
        
    } catch (error) {
      console.error('Error generating food predictions:', error);
      return [];
    }
  };

  // Fetch recent nutrition logs
  const fetchRecentLogs = async () => {
    if (!user?.id) return [];
    
    try {
      const { data } = await supabase
        .from('nutrition_logs')
        .select('food_name, calories, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(8);
      
      return data || [];
    } catch (error) {
      console.error('Error fetching recent logs:', error);
      return [];
    }
  };

  // Handle food tile click
  const handleFoodTileClick = (food) => {
    navigate('/camera', { 
      state: { 
        prefilledFood: {
          name: food.food_name,
          calories: food.calories
        }
      }
    });
  };

  // Fetch food predictions and recent logs
  useEffect(() => {
    const fetchPredictionData = async () => {
      if (!user?.id) return;
      
      setIsLoadingPredictions(true);
      try {
        const [predictions, logs] = await Promise.all([
          generateFoodPredictions(),
          fetchRecentLogs()
        ]);
        
        setFoodPredictions(predictions);
        setRecentLogs(logs);
      } catch (error) {
        console.error('Error fetching prediction data:', error);
      } finally {
        setIsLoadingPredictions(false);
      }
    };

    fetchPredictionData();
  }, [user?.id]);

  // Fetch mood prediction and reviews
  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;
      
      // Fetch mood prediction
      const today = new Date().toISOString().split('T')[0];
      const { data: moodData } = await supabase
        .from('mood_predictions')
        .select('*')
        .eq('user_id', user.id)
        .eq('prediction_date', today)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      setMoodPrediction(moodData);

      // Generate weekly review
      const weeklyData = await generateWeeklyReview();
      setWeeklyReview(weeklyData);

      // Generate monthly review
      const monthlyData = await generateMonthlyReview();
      setMonthlyReview(monthlyData);

      // Schedule notifications for reviews
      scheduleReviewNotifications();
    };

    fetchData();
  }, [user?.id]);

  // Generate weekly review
  const generateWeeklyReview = async () => {
    if (!user?.id) return null;

    // Get consistency scores for the past 7 days
    const consistencyScores = await calculateConsistencyScores(user.id, 7);
    const insights = [];

    // Add consistency scores as insights
    insights.push('📊 Consistency Scores:');
    consistencyScores.forEach(score => {
      const emoji = score.percentage >= 90 ? '🔥' : score.percentage >= 70 ? '💪' : score.percentage >= 50 ? '📈' : '⚠️';
      insights.push(`${emoji} ${score.label}: ${score.percentage}%`);
      
      // Add motivational message if it exists and score is below 70%
      if (score.motivationalMessage && score.percentage < 70) {
        insights.push(score.motivationalMessage);
      }
    });

    // Additional insights based on patterns
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString().split('T')[0];

    const [moodData] = await Promise.all([
      supabase.from('mood_logs').select('*').eq('user_id', user.id).gte('created_at', weekAgoStr)
    ]);

    // Mood patterns
    const moodEntries = moodData.data || [];
    const avgMood = moodEntries.length > 0 ? moodEntries.reduce((sum, m) => sum + (m.mood || 5), 0) / moodEntries.length : 0;
    if (avgMood >= 7) {
      insights.push(`😊 Great week for mood! Average rating: ${avgMood.toFixed(1)}/10`);
    } else if (avgMood < 5 && moodEntries.length > 0) {
      insights.push(`🤗 Mood averaged ${avgMood.toFixed(1)}/10 - consider reviewing your patterns`);
    }

    return {
      title: 'Weekly Review',
      insights: insights.slice(0, 6), // Show more insights to include consistency scores
      period: '7 days',
      consistencyScores
    };
  };

  // Generate monthly review
  const generateMonthlyReview = async () => {
    if (!user?.id) return null;

    // Get consistency scores for the past 30 days
    const consistencyScores = await calculateConsistencyScores(user.id, 30);
    const insights = [];

    // Add consistency scores as insights
    insights.push('📊 Monthly Consistency Scores:');
    consistencyScores.forEach(score => {
      const emoji = score.percentage >= 90 ? '🔥' : score.percentage >= 70 ? '💪' : score.percentage >= 50 ? '📈' : '⚠️';
      insights.push(`${emoji} ${score.label}: ${score.percentage}%`);
      
      // Add motivational message for top and bottom performers
      if (score.motivationalMessage && (score.percentage >= 90 || score.percentage < 60)) {
        insights.push(score.motivationalMessage);
      }
    });

    // Additional monthly insights
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);
    const monthAgoStr = monthAgo.toISOString().split('T')[0];

    const [supplementData, moodData] = await Promise.all([
      supabase.from('supplement_logs').select('*').eq('user_id', user.id).gte('created_at', monthAgoStr),
      supabase.from('mood_logs').select('*').eq('user_id', user.id).gte('created_at', monthAgoStr)
    ]);

    // Top supplement
    const supplementCounts: Record<string, number> = {};
    supplementData.data?.forEach(s => {
      supplementCounts[s.name] = (supplementCounts[s.name] || 0) + 1;
    });
    const topSupplement = Object.entries(supplementCounts).sort(([,a], [,b]) => (b as number) - (a as number))[0];
    if (topSupplement) {
      insights.push(`💊 Top supplement: ${topSupplement[0]} (logged ${topSupplement[1]} times)`);
    }

    // Mood improvements
    const moodEntries = moodData.data || [];
    if (moodEntries.length >= 10) {
      const recentMoods = moodEntries.slice(-10).map(m => m.mood || 5);
      const earlierMoods = moodEntries.slice(0, 10).map(m => m.mood || 5);
      const recentAvg = recentMoods.reduce((sum, m) => sum + m, 0) / recentMoods.length;
      const earlierAvg = earlierMoods.reduce((sum, m) => sum + m, 0) / earlierMoods.length;
      
      if (recentAvg > earlierAvg) {
        const improvement = Math.round(((recentAvg - earlierAvg) / earlierAvg) * 100);
        insights.push(`🧠 Mood improved by ${improvement}% this month — great progress!`);
      }
    }

    if (insights.length === 0) {
      insights.push(`🌟 Keep tracking to unlock detailed monthly insights!`);
    }

    return {
      title: 'Monthly Review',
      insights: insights.slice(0, 8), // Show more insights to include consistency scores
      period: '30 days',
      consistencyScores
    };
  };

  // Generate AI messages (mood prediction + coach tips)
  const generateAIMessages = () => {
    const userName = user?.name?.split(' ')[0] || 'there';
    const totalCalories = user?.targetCalories || 2000;
    const currentCalories = progress.calories;
    const progressPercentage = Math.min((currentCalories / totalCalories) * 100, 100);
    const currentHour = new Date().getHours();
    const timeOfDay = currentHour < 12 ? 'morning' : currentHour < 17 ? 'afternoon' : 'evening';

    const messages = [];

    // AI Mood Prediction Message
    if (moodPrediction) {
      let moodEmoji = '😊';
      let energyLevel = 'moderate';
      
      if (moodPrediction.predicted_mood >= 7) moodEmoji = '😄';
      else if (moodPrediction.predicted_mood >= 4) moodEmoji = '😊';
      else moodEmoji = '😔';

      if (moodPrediction.predicted_energy >= 7) energyLevel = 'high';
      else if (moodPrediction.predicted_energy >= 4) energyLevel = 'moderate';
      else energyLevel = 'low';

      messages.push({
        type: 'mood',
        icon: Brain,
        emoji: '🧠',
        title: 'AI Mood Prediction',
        message: `Based on your patterns, I predict you'll feel ${moodEmoji} with ${energyLevel} energy today. ${moodPrediction.message || 'Stay mindful of your habits to maintain positive momentum!'}`,
        confidence: moodPrediction.confidence || 'Medium'
      });
    } else {
      messages.push({
        type: 'mood',
        icon: Brain,
        emoji: '🧠',
        title: 'AI Mood Prediction',
        message: `Good ${timeOfDay}, ${userName}! I'm analyzing your patterns to predict your mood and energy. Keep logging to get personalized insights!`,
        confidence: 'Learning'
      });
    }

    // AI Coach Daily Tips - Fixed rotation instead of random
    const coachTips = [
      `Rise and fuel, ${userName}! Your body needs energy to start the day strong. A protein-rich breakfast will set you up for success.`,
      `Outstanding work, ${userName}! You've hit your calorie goal. Focus on quality nutrients and staying hydrated for the rest of the day.`,
      `You're in the home stretch, ${userName}! Just ${Math.round(totalCalories - currentCalories)} calories to go. Choose something nutritious and satisfying.`,
      `Midday boost needed, ${userName}! Your body is asking for fuel. A balanced lunch with protein and complex carbs will energize your afternoon.`,
      `Evening nourishment time, ${userName}! Don't skip dinner - your body needs consistent fuel for recovery and tomorrow's energy.`,
      `Weight loss tip: Focus on high-volume, low-calorie foods like vegetables and lean proteins to stay satisfied while hitting your goals.`,
      `Muscle building tip: Aim for protein with every meal! Your muscles need consistent amino acids throughout the day for optimal growth.`,
      `Hydration check! Your brain is 75% water - stay sharp by sipping consistently throughout the day.`,
      `Sleep quality affects everything - aim for 7-9 hours to optimize your mood, energy, and metabolism.`,
      `Small wins add up! Every healthy choice you make is building the stronger, healthier version of yourself.`,
      `Mindful eating tip: Slow down and savor your food. It takes 20 minutes for your brain to register fullness.`
    ];

    // Use a consistent tip based on time to avoid random changes
    const tipIndex = Math.floor(Date.now() / (1000 * 60 * 60 * 24)) % coachTips.length;
    const selectedTip = coachTips[tipIndex];
    
    messages.push({
      type: 'coach',
      icon: MessageCircle,
      emoji: '💬',
      title: 'AI Coach Daily Tip',
      message: selectedTip,
      confidence: 'Expert'
    });

    return messages;
  };

  const aiMessages = generateAIMessages();

  // Define sequence items (4 total items, each gets 10 seconds)
  const sequenceItems = [
    {
      type: 'daily',
      subType: 'mood',
      title: 'Daily Tips',
      icon: Brain,
      content: aiMessages[0], // AI Mood Prediction
      tabIndex: 0,
      messageIndex: 0
    },
    {
      type: 'daily',
      subType: 'coach',
      title: 'Daily Tips',
      icon: Brain,
      content: aiMessages[1], // AI Coach Daily Tip
      tabIndex: 0,
      messageIndex: 1
    },
    {
      type: 'weekly',
      title: 'Weekly Review',
      emoji: '📊',
      icon: BarChart3,
      content: weeklyReview,
      tabIndex: 1,
      messageIndex: 0
    },
    {
      type: 'monthly',
      title: 'Monthly Review',
      emoji: '🧠',
      icon: Calendar,
      content: monthlyReview,
      tabIndex: 2,
      messageIndex: 0
    }
  ];

  // Unified timer system - single master timer
  useEffect(() => {
    const masterTimer = () => {
      setFadeState('fade-out');
      setTimeout(() => {
        setCurrentSequenceIndex((prev) => (prev + 1) % sequenceItems.length);
        setFadeState('fade-in');
      }, 300);
    };

    const interval = setInterval(masterTimer, 10000); // 10 seconds per item
    return () => clearInterval(interval);
  }, [sequenceItems.length]);

  const currentItem = sequenceItems[currentSequenceIndex];
  const currentTabIndex = currentItem.tabIndex;
  const currentMessageIndex = currentItem.messageIndex;

  // Define tabs for display
  const tabs = [
    {
      type: 'daily',
      title: 'Daily Tips',
      icon: Brain,
      content: aiMessages
    },
    {
      type: 'weekly',
      title: 'Weekly Review',
      emoji: '📊',
      icon: BarChart3,
      content: weeklyReview
    },
    {
      type: 'monthly',
      title: 'Monthly Review',
      emoji: '🧠',
      icon: Calendar,
      content: monthlyReview
    }
  ];

  const currentTab = tabs[currentTabIndex];

  return (
    <div className="space-y-6">
      {/* AI Quick Predictions Section */}
      <Card className={`modern-action-card border-0 rounded-3xl animate-slide-up shadow-xl ${isMobile ? 'mx-2' : 'mx-4'}`}>
        <CardContent className={`${isMobile ? 'p-6' : 'p-8'}`}>
          {/* Header */}
          <div className={`flex items-center ${isMobile ? 'space-x-3 mb-4' : 'space-x-4 mb-6'}`}>
            <div className={`${isMobile ? 'w-10 h-10' : 'w-12 h-12'} gradient-primary rounded-full flex items-center justify-center shadow-lg`}>
              <Brain className={`${isMobile ? 'h-5 w-5' : 'h-6 w-6'} text-white`} />
            </div>
            <div>
              <h3 className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-gray-900 dark:text-white`}>AI Quick Predictions</h3>
              <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-500 dark:text-gray-400`}>Smart food suggestions based on your patterns</p>
            </div>
          </div>

          {/* Food Predictions Grid */}
          {isLoadingPredictions ? (
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="aspect-square bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3 mb-6">
              {foodPredictions.map((food, index) => (
                <div
                  key={index}
                  onClick={() => handleFoodTileClick(food)}
                  className="aspect-square bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105 flex flex-col justify-between"
                >
                  <div className="flex-1 flex flex-col justify-center">
                    <h4 className="font-semibold text-gray-900 dark:text-white text-sm leading-tight mb-1 line-clamp-2">
                      {food.food_name}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center mb-1">
                      <Clock className="h-3 w-3 mr-1" />
                      usually {food.usual_time}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-300 font-medium">
                      {food.calories} cal
                    </p>
                  </div>
                  <Button 
                    size="sm" 
                    className="w-full text-xs h-6 bg-green-500 hover:bg-green-600 text-white"
                  >
                    Tap to log
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Recent & Saved Logs Collapsible */}
          <Collapsible open={isRecentLogsOpen} onOpenChange={setIsRecentLogsOpen}>
            <CollapsibleTrigger asChild>
              <Button 
                variant="ghost" 
                className="w-full justify-between text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <span className="flex items-center">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Recent & Saved Logs
                </span>
                <ChevronDown className={`h-4 w-4 transition-transform ${isRecentLogsOpen ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-4 space-y-2">
                {recentLogs.length > 0 ? (
                  recentLogs.map((log, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <span className="text-sm text-gray-700 dark:text-gray-300">{log.food_name}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{log.calories} cal</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No recent logs found</p>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      {/* AI Coach Message Section - UNTOUCHED */}
      <Card className={`modern-action-card ai-insights-card border-0 rounded-3xl animate-slide-up float-animation hover:scale-[1.02] transition-all duration-500 shadow-xl hover:shadow-2xl ${isMobile ? 'mx-2' : 'mx-4'}`}>
        <CardContent className={`${isMobile ? 'p-6' : 'p-8'}`}>
          {/* Header with Tab Navigation */}
          <div className={`flex items-center justify-between ${isMobile ? 'mb-4' : 'mb-6'}`}>
            <div className={`flex items-center ${isMobile ? 'space-x-3' : 'space-x-4'}`}>
              <div className={`${isMobile ? 'w-10 h-10' : 'w-12 h-12'} gradient-primary rounded-full flex items-center justify-center shadow-lg ai-glow`}>
                <currentTab.icon className={`${isMobile ? 'h-5 w-5' : 'h-6 w-6'} text-white`} />
              </div>
              <div>
                <h3 className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-gray-900 dark:text-white`}>AI Insights</h3>
                <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-500 dark:text-gray-400`}>{currentTab.title}</p>
              </div>
            </div>
          </div>

          {/* Tab Indicators */}
          <div className="flex justify-center space-x-4 mb-6">
            {tabs.map((tab, index) => (
              <div
                key={index}
                className={`flex flex-col items-center space-y-1 cursor-pointer transition-all duration-300 ${
                  index === currentTabIndex ? 'opacity-100' : 'opacity-40'
                }`}
                onClick={() => {
                  // Find the first sequence item for this tab
                  const targetSequenceIndex = sequenceItems.findIndex(item => item.tabIndex === index);
                  if (targetSequenceIndex !== -1) {
                    setFadeState('fade-out');
                    setTimeout(() => {
                      setCurrentSequenceIndex(targetSequenceIndex);
                      setFadeState('fade-in');
                    }, 300);
                  }
                }}
              >
                <div className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  index === currentTabIndex ? 'bg-blue-500 scale-125' : 'bg-gray-300 dark:bg-gray-600'
                }`} />
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {tab.title.split(' ')[0]}
                </span>
              </div>
            ))}
          </div>

          {/* Content Area */}
          <div className={`min-h-[140px] ${isMobile ? 'mb-6' : 'mb-8'}`}>
            <div className={`transition-all duration-300 ${fadeState === 'fade-in' ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-2'}`}>
              {currentTab.type === 'daily' && currentItem.content && (
                <div className="flex items-start space-x-4">
                  <div className="text-3xl flex-shrink-0 mt-1">{currentItem.content.emoji}</div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-3">
                      <h4 className={`${isMobile ? 'text-base' : 'text-lg'} font-bold text-gray-900 dark:text-white`}>
                        {currentItem.content.title}
                      </h4>
                      <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100 px-2 py-1 rounded-full">
                        {currentItem.content.confidence}
                      </span>
                    </div>
                    <p className={`${isMobile ? 'text-sm' : 'text-base'} text-gray-700 dark:text-gray-300 leading-relaxed`}>
                      {currentItem.content.message}
                    </p>
                  </div>
                </div>
              )}
              
              {(currentTab.type === 'weekly' || currentTab.type === 'monthly') && currentItem.content && (
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="text-3xl">{currentTab.emoji}</div>
                    <div>
                      <h4 className={`${isMobile ? 'text-base' : 'text-lg'} font-bold text-gray-900 dark:text-white`}>
                        {currentItem.content.title}
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Past {currentItem.content.period}
                      </p>
                    </div>
                  </div>
                  <div className={`space-y-3 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 ${isMobile ? 'h-36' : 'h-40'}`}>
                    {currentItem.content.insights.map((insight, index) => (
                      <p key={index} className={`${isMobile ? 'text-sm' : 'text-base'} text-gray-700 dark:text-gray-300 leading-relaxed`}>
                        {insight}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {(currentTab.type === 'weekly' || currentTab.type === 'monthly') && !currentItem.content && (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <div className="text-3xl mb-2">{currentTab.emoji}</div>
                    <p className={`${isMobile ? 'text-sm' : 'text-base'} text-gray-500 dark:text-gray-400`}>
                      Generating {currentTab.title.toLowerCase()}...
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Progress Indicators - Show current position in sequence */}
          <div className="flex justify-center space-x-3 mb-6">
            {sequenceItems.map((item, index) => (
              <div
                key={index}
                className={`flex flex-col items-center space-y-1 cursor-pointer transition-all duration-300 ${
                  index === currentSequenceIndex ? 'opacity-100' : 'opacity-40'
                }`}
                onClick={() => {
                  setFadeState('fade-out');
                  setTimeout(() => {
                    setCurrentSequenceIndex(index);
                    setFadeState('fade-in');
                  }, 300);
                }}
              >
                <div className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === currentSequenceIndex ? 'bg-blue-500 scale-125' : 'bg-gray-300 dark:bg-gray-600'
                }`} />
                <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                  {item.subType || item.type}
                </span>
              </div>
            ))}
          </div>

          {/* Ask Your AI Coach Button */}
          <Button 
            onClick={() => navigate('/coach')}
            className={`w-full gradient-primary text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 ai-glow ${isMobile ? 'py-4' : 'py-6'}`}
          >
            <MessageCircle className={`mr-3 ${isMobile ? 'h-5 w-5' : 'h-6 w-6'}`} />
            Ask your AI coach
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default HomeAIInsights;
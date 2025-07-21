import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Brain, MessageCircle, BarChart3, Calendar, Sparkles } from 'lucide-react';
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
  const [currentTabIndex, setCurrentTabIndex] = useState(0);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [fadeState, setFadeState] = useState('fade-in');
  const [moodPrediction, setMoodPrediction] = useState(null);
  const [weeklyReview, setWeeklyReview] = useState(null);
  const [monthlyReview, setMonthlyReview] = useState(null);
  const { scheduleReviewNotifications } = useReviewNotifications();

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

    // AI Coach Daily Tips
    const coachTips = [];

    if (progressPercentage < 30 && timeOfDay === 'morning') {
      coachTips.push(`Rise and fuel, ${userName}! Your body needs energy to start the day strong. A protein-rich breakfast will set you up for success.`);
    } else if (progressPercentage >= 100) {
      coachTips.push(`Outstanding work, ${userName}! You've hit your calorie goal. Focus on quality nutrients and staying hydrated for the rest of the day.`);
    } else if (progressPercentage >= 80) {
      coachTips.push(`You're in the home stretch, ${userName}! Just ${Math.round(totalCalories - currentCalories)} calories to go. Choose something nutritious and satisfying.`);
    } else if (timeOfDay === 'afternoon' && progressPercentage < 50) {
      coachTips.push(`Midday boost needed, ${userName}! Your body is asking for fuel. A balanced lunch with protein and complex carbs will energize your afternoon.`);
    } else if (timeOfDay === 'evening' && progressPercentage < 70) {
      coachTips.push(`Evening nourishment time, ${userName}! Don't skip dinner - your body needs consistent fuel for recovery and tomorrow's energy.`);
    }

    // Health goal specific tips
    if (user?.main_health_goal === 'weight_loss') {
      coachTips.push(`Weight loss tip: Focus on high-volume, low-calorie foods like vegetables and lean proteins to stay satisfied while hitting your goals.`);
    } else if (user?.main_health_goal === 'muscle_gain') {
      coachTips.push(`Muscle building tip: Aim for protein with every meal! Your muscles need consistent amino acids throughout the day for optimal growth.`);
    }

    // General wellness tips
    coachTips.push(
      `Hydration check! Your brain is 75% water - stay sharp by sipping consistently throughout the day.`,
      `Sleep quality affects everything - aim for 7-9 hours to optimize your mood, energy, and metabolism.`,
      `Small wins add up! Every healthy choice you make is building the stronger, healthier version of yourself.`,
      `Mindful eating tip: Slow down and savor your food. It takes 20 minutes for your brain to register fullness.`
    );

    const selectedTip = coachTips[Math.floor(Math.random() * coachTips.length)];
    
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

  // Define tabs
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

  // Tab rotation logic
  useEffect(() => {
    const rotateTab = () => {
      setFadeState('fade-out');
      setTimeout(() => {
        setCurrentTabIndex((prev) => (prev + 1) % 3); // Always 3 tabs
        setCurrentMessageIndex(0); // Reset message index when changing tabs
        setFadeState('fade-in');
      }, 300);
    };

    const interval = setInterval(rotateTab, 10000); // 10 seconds
    return () => clearInterval(interval);
  }, []);

  // Message rotation within daily tips tab
  useEffect(() => {
    if (currentTabIndex === 0 && aiMessages.length > 1) {
      const rotateMessage = () => {
        setFadeState('fade-out');
        setTimeout(() => {
          setCurrentMessageIndex((prev) => (prev + 1) % aiMessages.length);
          setFadeState('fade-in');
        }, 300);
      };

      const interval = setInterval(rotateMessage, 7000); // 7 seconds
      return () => clearInterval(interval);
    }
  }, [currentTabIndex, aiMessages.length]);

  const currentTab = tabs[currentTabIndex];
  const currentContent = currentTab.type === 'daily' ? aiMessages[currentMessageIndex] : currentTab.content;

  return (
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
                setFadeState('fade-out');
                setTimeout(() => {
                  setCurrentTabIndex(index);
                  setCurrentMessageIndex(0);
                  setFadeState('fade-in');
                }, 300);
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
            {currentTab.type === 'daily' && currentContent && (
              <div className="flex items-start space-x-4">
                <div className="text-3xl flex-shrink-0 mt-1">{currentContent.emoji}</div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-3">
                    <h4 className={`${isMobile ? 'text-base' : 'text-lg'} font-bold text-gray-900 dark:text-white`}>
                      {currentContent.title}
                    </h4>
                    <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100 px-2 py-1 rounded-full">
                      {currentContent.confidence}
                    </span>
                  </div>
                  <p className={`${isMobile ? 'text-sm' : 'text-base'} text-gray-700 dark:text-gray-300 leading-relaxed`}>
                    {currentContent.message}
                  </p>
                </div>
              </div>
            )}
            
            {(currentTab.type === 'weekly' || currentTab.type === 'monthly') && currentContent && (
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="text-3xl">{currentTab.emoji}</div>
                  <div>
                    <h4 className={`${isMobile ? 'text-base' : 'text-lg'} font-bold text-gray-900 dark:text-white`}>
                      {currentContent.title}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Past {currentContent.period}
                    </p>
                  </div>
                </div>
                <div className="space-y-3 max-h-20 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
                  {currentContent.insights.map((insight, index) => (
                    <p key={index} className={`${isMobile ? 'text-sm' : 'text-base'} text-gray-700 dark:text-gray-300 leading-relaxed`}>
                      {insight}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {(currentTab.type === 'weekly' || currentTab.type === 'monthly') && !currentContent && (
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

        {/* Message Progress Indicators for Daily Tips */}
        {currentTab.type === 'daily' && aiMessages.length > 1 && (
          <div className="flex justify-center space-x-3 mb-6">
            {aiMessages.map((message, index) => (
              <div
                key={index}
                className={`flex flex-col items-center space-y-1 cursor-pointer transition-all duration-300 ${
                  index === currentMessageIndex ? 'opacity-100' : 'opacity-40'
                }`}
                onClick={() => {
                  setFadeState('fade-out');
                  setTimeout(() => {
                    setCurrentMessageIndex(index);
                    setFadeState('fade-in');
                  }, 300);
                }}
              >
                <div className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === currentMessageIndex ? 'bg-blue-500 scale-125' : 'bg-gray-300 dark:bg-gray-600'
                }`} />
                <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                  {message.type}
                </span>
              </div>
            ))}
          </div>
        )}

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
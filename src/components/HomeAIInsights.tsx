import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Brain, MessageCircle, RefreshCw, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/auth';
import { useNutrition } from '@/contexts/NutritionContext';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const HomeAIInsights = () => {
  const { user } = useAuth();
  const { getTodaysProgress } = useNutrition();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const progress = getTodaysProgress();
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [fadeState, setFadeState] = useState('fade-in');
  const [moodPrediction, setMoodPrediction] = useState(null);

  // Fetch mood prediction
  useEffect(() => {
    const fetchMoodPrediction = async () => {
      if (!user?.id) return;
      
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from('mood_predictions')
        .select('*')
        .eq('user_id', user.id)
        .eq('prediction_date', today)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      setMoodPrediction(data);
    };

    fetchMoodPrediction();
  }, [user?.id]);

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

  // Rotation logic with fade animation
  useEffect(() => {
    const rotateMessages = () => {
      setFadeState('fade-out');
      setTimeout(() => {
        setCurrentMessageIndex((prev) => (prev + 1) % aiMessages.length);
        setFadeState('fade-in');
      }, 300);
    };

    const interval = setInterval(rotateMessages, 7000); // 7 seconds
    return () => clearInterval(interval);
  }, [aiMessages.length]);

  const currentMessage = aiMessages[currentMessageIndex];

  return (
    <Card className={`modern-action-card ai-insights-card border-0 rounded-3xl animate-slide-up float-animation hover:scale-[1.02] transition-all duration-500 shadow-xl hover:shadow-2xl ${isMobile ? 'mx-2' : 'mx-4'}`}>
      <CardContent className={`${isMobile ? 'p-6' : 'p-8'}`}>
        {/* Header */}
        <div className={`flex items-center justify-between ${isMobile ? 'mb-6' : 'mb-8'}`}>
          <div className={`flex items-center ${isMobile ? 'space-x-3' : 'space-x-4'}`}>
            <div className={`${isMobile ? 'w-10 h-10' : 'w-12 h-12'} gradient-primary rounded-full flex items-center justify-center shadow-lg ai-glow`}>
              <currentMessage.icon className={`${isMobile ? 'h-5 w-5' : 'h-6 w-6'} text-white`} />
            </div>
            <div>
              <h3 className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-gray-900 dark:text-white`}>AI Insights</h3>
              <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-500 dark:text-gray-400`}>Intelligent & Adaptive</p>
            </div>
          </div>
        </div>

        {/* Rotating AI Message */}
        <div className={`min-h-[120px] ${isMobile ? 'mb-6' : 'mb-8'}`}>
          <div className={`transition-all duration-300 ${fadeState === 'fade-in' ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-2'}`}>
            <div className="flex items-start space-x-4">
              <div className="text-3xl flex-shrink-0 mt-1">{currentMessage.emoji}</div>
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-3">
                  <h4 className={`${isMobile ? 'text-base' : 'text-lg'} font-bold text-gray-900 dark:text-white`}>
                    {currentMessage.title}
                  </h4>
                  <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100 px-2 py-1 rounded-full">
                    {currentMessage.confidence}
                  </span>
                </div>
                <p className={`${isMobile ? 'text-sm' : 'text-base'} text-gray-700 dark:text-gray-300 leading-relaxed`}>
                  {currentMessage.message}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Message Progress Indicators */}
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
              <div className={`w-3 h-3 rounded-full transition-all duration-300 ${
                index === currentMessageIndex ? 'bg-blue-500 scale-125' : 'bg-gray-300 dark:bg-gray-600'
              }`} />
              <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                {message.type}
              </span>
            </div>
          ))}
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
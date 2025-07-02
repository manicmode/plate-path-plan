
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Camera, TrendingUp, Droplets, Pill, Zap, Target, Sparkles, Mic, MicOff, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNutrition } from '@/contexts/NutritionContext';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useVoiceRecording } from '@/hooks/useVoiceRecording';
import CelebrationPopup from '@/components/CelebrationPopup';

const Home = () => {
  const { user } = useAuth();
  const { getTodaysProgress, getHydrationGoal, getSupplementGoal } = useNutrition();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const progress = getTodaysProgress();

  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationType, setCelebrationType] = useState('');

  const { isRecording, isProcessing, startRecording, stopRecording, transcribedText } = useVoiceRecording();

  const totalCalories = user?.targetCalories || 2000;
  const currentCalories = progress.calories;
  const progressPercentage = Math.min((currentCalories / totalCalories) * 100, 100);

  const hydrationGoal = getHydrationGoal();
  const hydrationPercentage = Math.min((progress.hydration / hydrationGoal) * 100, 100);

  const supplementGoal = getSupplementGoal();
  const supplementPercentage = Math.min((progress.supplements / supplementGoal) * 100, 100);

  // Check for goal completion and trigger celebration
  useEffect(() => {
    if (progressPercentage >= 100 && progressPercentage < 105) {
      setCelebrationType('Calories Goal Smashed! 🔥');
      setShowCelebration(true);
    } else if (hydrationPercentage >= 100 && hydrationPercentage < 105) {
      setCelebrationType('Hydration Goal Achieved! 💧');
      setShowCelebration(true);
    } else if (supplementPercentage >= 100 && supplementPercentage < 105) {
      setCelebrationType('Supplements Complete! 💊');
      setShowCelebration(true);
    }
  }, [progressPercentage, hydrationPercentage, supplementPercentage]);

  const handleVoiceRecording = async () => {
    if (isRecording) {
      const transcript = await stopRecording();
      if (transcript) {
        // Here you would process the transcript with AI to extract nutrition data
        console.log('Voice transcript:', transcript);
      }
    } else {
      await startRecording();
    }
  };

  const macroCards = [
    {
      name: 'Calories',
      current: progress.calories,
      target: totalCalories,
      unit: '',
      color: 'from-emerald-400 to-emerald-600',
      icon: Zap,
    },
    {
      name: 'Protein',
      current: progress.protein,
      target: user?.targetProtein || 150,
      unit: 'g',
      color: 'from-blue-400 to-blue-600',
      icon: Target,
    },
    {
      name: 'Carbs',
      current: progress.carbs,
      target: user?.targetCarbs || 200,
      unit: 'g',
      color: 'from-orange-400 to-orange-600',
      icon: TrendingUp,
    },
    {
      name: 'Fat',
      current: progress.fat,
      target: user?.targetFat || 65,
      unit: 'g',
      color: 'from-purple-400 to-purple-600',
      icon: Target,
    },
    {
      name: 'Hydration',
      current: progress.hydration,
      target: hydrationGoal,
      unit: 'ml',
      color: 'from-cyan-400 to-blue-600',
      icon: Droplets,
    },
    {
      name: 'Supplements',
      current: progress.supplements,
      target: supplementGoal,
      unit: '',
      color: 'from-purple-500 to-pink-600',
      icon: Pill,
    },
  ];

  const getMotivationalMessage = (percentage: number, type: string) => {
    if (percentage >= 100) return `${type} goal crushed! Amazing! 🎉`;
    if (percentage >= 80) return `Almost there! Just ${100 - Math.round(percentage)}% to go! 💪`;
    if (percentage >= 50) return `Great progress! Keep it up! 🔥`;
    if (percentage >= 25) return `Good start! You've got this! ⭐`;
    return `Let's get started with your ${type.toLowerCase()} today! 🚀`;
  };

  return (
    <div className="space-y-16 sm:space-y-20 animate-fade-in">
      {/* Celebration Popup */}
      <CelebrationPopup 
        show={showCelebration} 
        message={celebrationType}
        onClose={() => setShowCelebration(false)}
      />

      {/* Enhanced Greeting Section */}
      <div className="text-center space-y-6 sm:space-y-8 py-8 sm:py-12">
        <div className="inline-block">
          <h1 className={`${isMobile ? 'text-3xl' : 'text-5xl'} font-bold bg-gradient-to-r from-gray-900 via-emerald-600 to-blue-600 dark:from-gray-100 dark:via-emerald-400 dark:to-blue-400 bg-clip-text text-transparent mb-4`}>
            {isMobile ? "Let's optimize your day," : "Let's optimize your day,"}
          </h1>
          <h2 className={`${isMobile ? 'text-3xl' : 'text-5xl'} font-bold neon-text`}>
            {user?.name?.split(' ')[0] || 'Superstar'}! ✨
          </h2>
        </div>
        <p className={`text-gray-600 dark:text-gray-300 font-medium ${isMobile ? 'text-lg' : 'text-xl'}`}>Your intelligent wellness companion is ready</p>
      </div>

      {/* Enhanced Daily Tracker Cards */}
      <div className={`grid grid-cols-3 ${isMobile ? 'gap-6' : 'gap-8'} animate-scale-in items-stretch`}>
        {/* Enhanced Calories Tracker */}
        <Card 
          className={`modern-tracker-card calories-tracker border-0 ${isMobile ? 'h-52 p-4' : 'h-60 p-6'} rounded-3xl hover:scale-105 transition-all duration-500 cursor-pointer group`}
          onClick={() => setShowCelebration(true)}
          title={getMotivationalMessage(progressPercentage, 'Calories')}
        >
          <CardContent className="flex flex-col items-center justify-between p-0 h-full">
            <div className={`relative ${isMobile ? 'w-28 h-28' : 'w-36 h-36'} flex-shrink-0 mt-2`}>
              <svg className={`${isMobile ? 'w-28 h-28' : 'w-36 h-36'} enhanced-progress-ring`} viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255, 87, 34, 0.2)" strokeWidth="6" />
                <circle
                  cx="60" cy="60" r="50" fill="none" stroke="url(#calorieGradient)" strokeWidth="8"
                  strokeLinecap="round" strokeDasharray={314} strokeDashoffset={314 - (progressPercentage / 100) * 314}
                  className="transition-all duration-2000 ease-out calories-ring-glow"
                />
                <defs>
                  <linearGradient id="calorieGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FF9800" />
                    <stop offset="50%" stopColor="#FF5722" />
                    <stop offset="100%" stopColor="#E65100" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`${isMobile ? 'text-3xl' : 'text-4xl'} mb-2 group-hover:scale-110 transition-transform`}>🔥</span>
                <span className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold text-orange-600 dark:text-orange-400`}>
                  {Math.round(progressPercentage)}%
                </span>
                {progressPercentage >= 100 && <Sparkles className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-orange-400 animate-pulse mt-1`} />}
              </div>
            </div>
            <div className="text-center flex-shrink-0 space-y-2">
              <p className={`${isMobile ? 'text-base' : 'text-lg'} font-bold text-gray-900 dark:text-white`}>Calories</p>
              <p className={`${isMobile ? 'text-sm' : 'text-base'} text-gray-600 dark:text-gray-400`}>
                {currentCalories.toFixed(0)}/{totalCalories}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Hydration Tracker */}
        <Card 
          className={`modern-tracker-card hydration-tracker border-0 ${isMobile ? 'h-52 p-4' : 'h-60 p-6'} rounded-3xl hover:scale-105 transition-all duration-500 cursor-pointer group`}
          onClick={() => navigate('/hydration')}
          title={getMotivationalMessage(hydrationPercentage, 'Hydration')}
        >
          <CardContent className="flex flex-col items-center justify-between p-0 h-full">
            <div className={`relative ${isMobile ? 'w-28 h-28' : 'w-36 h-36'} flex-shrink-0 mt-2`}>
              <svg className={`${isMobile ? 'w-28 h-28' : 'w-36 h-36'} enhanced-progress-ring`} viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(3, 169, 244, 0.2)" strokeWidth="6" />
                <circle
                  cx="60" cy="60" r="50" fill="none" stroke="url(#hydrationGradient)" strokeWidth="8"
                  strokeLinecap="round" strokeDasharray={314} strokeDashoffset={314 - (hydrationPercentage / 100) * 314}
                  className="transition-all duration-2000 ease-out hydration-ring-glow"
                />
                <defs>
                  <linearGradient id="hydrationGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#00E5FF" />
                    <stop offset="50%" stopColor="#03A9F4" />
                    <stop offset="100%" stopColor="#0277BD" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`${isMobile ? 'text-3xl' : 'text-4xl'} mb-2 group-hover:scale-110 transition-transform`}>💧</span>
                <span className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold text-cyan-600 dark:text-cyan-400`}>
                  {Math.round(hydrationPercentage)}%
                </span>
                {hydrationPercentage >= 100 && <Sparkles className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-cyan-400 animate-pulse mt-1`} />}
              </div>
            </div>
            <div className="text-center flex-shrink-0 space-y-2">
              <p className={`${isMobile ? 'text-base' : 'text-lg'} font-bold text-gray-900 dark:text-white`}>Hydration</p>
              <p className={`${isMobile ? 'text-sm' : 'text-base'} text-gray-600 dark:text-gray-400`}>
                {progress.hydration}/{hydrationGoal}ml
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Supplements Tracker */}
        <Card 
          className={`modern-tracker-card supplements-tracker border-0 ${isMobile ? 'h-52 p-4' : 'h-60 p-6'} rounded-3xl hover:scale-105 transition-all duration-500 cursor-pointer group`}
          onClick={() => navigate('/supplements')}
          title={getMotivationalMessage(supplementPercentage, 'Supplements')}
        >
          <CardContent className="flex flex-col items-center justify-between p-0 h-full">
            <div className={`relative ${isMobile ? 'w-28 h-28' : 'w-36 h-36'} flex-shrink-0 mt-2`}>
              <svg className={`${isMobile ? 'w-28 h-28' : 'w-36 h-36'} enhanced-progress-ring`} viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(156, 39, 176, 0.2)" strokeWidth="6" />
                <circle
                  cx="60" cy="60" r="50" fill="none" stroke="url(#supplementGradient)" strokeWidth="8"
                  strokeLinecap="round" strokeDasharray={314} strokeDashoffset={314 - (supplementPercentage / 100) * 314}
                  className="transition-all duration-2000 ease-out supplements-ring-glow"
                />
                <defs>
                  <linearGradient id="supplementGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#BA55D3" />
                    <stop offset="50%" stopColor="#9C27B0" />
                    <stop offset="100%" stopColor="#7B1FA2" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`${isMobile ? 'text-3xl' : 'text-4xl'} mb-2 group-hover:scale-110 transition-transform`}>💊</span>
                <span className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold text-purple-600 dark:text-purple-400`}>
                  {Math.round(supplementPercentage)}%
                </span>
                {supplementPercentage >= 100 && <Sparkles className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-purple-400 animate-pulse mt-1`} />}
              </div>
            </div>
            <div className="text-center flex-shrink-0 space-y-2">
              <p className={`${isMobile ? 'text-base' : 'text-lg'} font-bold text-gray-900 dark:text-white`}>Supplements</p>
              <p className={`${isMobile ? 'text-sm' : 'text-base'} text-gray-600 dark:text-gray-400`}>
                {progress.supplements}/{supplementGoal}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Logging Actions Section */}
      <div className="space-y-8 sm:space-y-10">
        {/* Primary Action: Log Food - Full Width */}
        <Card 
          className="modern-action-card log-food-card border-0 rounded-3xl overflow-hidden hover:scale-[1.02] transition-all duration-500 cursor-pointer shadow-xl hover:shadow-2xl"
          onClick={() => navigate('/camera')}
        >
          <CardContent className={`${isMobile ? 'p-8' : 'p-10'} text-center`}>
            <div className="flex flex-col items-center space-y-6">
              <div className={`${isMobile ? 'w-20 h-20' : 'w-24 h-24'} bg-gradient-to-br from-blue-500 to-sky-500 rounded-3xl flex items-center justify-center shadow-2xl log-food-glow`}>
                <Camera className={`${isMobile ? 'h-10 w-10' : 'h-12 w-12'} text-white`} />
              </div>
              <div className="space-y-3">
                <h3 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold text-gray-800 dark:text-gray-100`}>
                  Log Food
                </h3>
                <p className={`${isMobile ? 'text-base' : 'text-lg'} text-gray-600 dark:text-gray-400`}>
                  Take photo or speak to log meals
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Voice to Log Feature */}
        <Card 
          className="modern-action-card voice-log-card border-0 rounded-3xl overflow-hidden hover:scale-[1.02] transition-all duration-500 cursor-pointer shadow-xl hover:shadow-2xl"
          onClick={handleVoiceRecording}
        >
          <CardContent className={`${isMobile ? 'p-6' : 'p-8'} text-center`}>
            <div className="flex flex-col items-center space-y-4">
              <div className={`${isMobile ? 'w-16 h-16' : 'w-20 h-20'} bg-gradient-to-br from-green-500 to-emerald-500 rounded-3xl flex items-center justify-center shadow-2xl voice-log-glow ${isRecording ? 'animate-pulse' : ''}`}>
                {isProcessing ? (
                  <Loader2 className={`${isMobile ? 'h-8 w-8' : 'h-10 w-10'} text-white animate-spin`} />
                ) : isRecording ? (
                  <MicOff className={`${isMobile ? 'h-8 w-8' : 'h-10 w-10'} text-white`} />
                ) : (
                  <Mic className={`${isMobile ? 'h-8 w-8' : 'h-10 w-10'} text-white`} />
                )}
              </div>
              <div className="space-y-2">
                <h3 className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-gray-800 dark:text-gray-100`}>
                  {isProcessing ? 'Processing...' : isRecording ? 'Stop Recording' : 'Voice to Log'}
                </h3>
                <p className={`${isMobile ? 'text-sm' : 'text-base'} text-gray-600 dark:text-gray-400`}>
                  {isRecording ? 'Tap to stop recording' : 'Speak your meal description'}
                </p>
                {transcribedText && (
                  <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-green-600 dark:text-green-400 italic mt-2`}>
                    "{transcribedText}"
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Secondary Actions: Hydration & Supplements */}
        <div className={`grid grid-cols-2 ${isMobile ? 'gap-6' : 'gap-8'} items-stretch`}>
          {/* Enhanced Hydration Action Card */}
          <Card 
            className={`modern-action-card hydration-action-card border-0 rounded-3xl overflow-hidden hover:scale-105 transition-all duration-500 cursor-pointer ${isMobile ? 'h-40' : 'h-44'} shadow-lg hover:shadow-xl`}
            onClick={() => navigate('/hydration')}
          >
            <CardContent className="flex flex-col items-center justify-center h-full p-0">
              <div className={`flex flex-col items-center space-y-4 ${isMobile ? 'p-5' : 'p-6'}`}>
                <div className={`${isMobile ? 'w-14 h-14' : 'w-18 h-18'} bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg hydration-action-glow flex-shrink-0`}>
                  <Droplets className={`${isMobile ? 'h-7 w-7' : 'h-9 w-9'} text-white`} />
                </div>
                <div className="text-center flex-shrink-0">
                  <h4 className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-gray-800 dark:text-gray-100 leading-tight`}>
                    Hydration
                  </h4>
                  <p className={`${isMobile ? 'text-sm' : 'text-base'} text-gray-600 dark:text-gray-400 leading-tight`}>
                    Track water intake
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Enhanced Supplements Action Card */}
          <Card 
            className={`modern-action-card supplements-action-card border-0 rounded-3xl overflow-hidden hover:scale-105 transition-all duration-500 cursor-pointer ${isMobile ? 'h-40' : 'h-44'} shadow-lg hover:shadow-xl`}
            onClick={() => navigate('/supplements')}
          >
            <CardContent className="flex flex-col items-center justify-center h-full p-0">
              <div className={`flex flex-col items-center space-y-4 ${isMobile ? 'p-5' : 'p-6'}`}>
                <div className={`${isMobile ? 'w-14 h-14' : 'w-18 h-18'} bg-gradient-to-br from-purple-500 to-violet-500 rounded-2xl flex items-center justify-center shadow-lg supplements-action-glow flex-shrink-0`}>
                  <Pill className={`${isMobile ? 'h-7 w-7' : 'h-9 w-9'} text-white`} />
                </div>
                <div className="text-center flex-shrink-0">
                  <h4 className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-gray-800 dark:text-gray-100 leading-tight`}>
                    Supplements
                  </h4>
                  <p className={`${isMobile ? 'text-sm' : 'text-base'} text-gray-600 dark:text-gray-400 leading-tight`}>
                    Log vitamins & minerals
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Today's Nutrients Section */}
      <div className="space-y-8 sm:space-y-10">
        <h3 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold text-gray-900 dark:text-white text-center`}>Today's Nutrients</h3>
        <div className="flex space-x-6 sm:space-x-8 overflow-x-auto scroll-cards pb-6">
          {macroCards.map((macro, index) => {
            const percentage = Math.min((macro.current / macro.target) * 100, 100);
            const Icon = macro.icon;
            
            return (
              <Card
                key={macro.name}
                className={`modern-nutrient-card nutrients-card border-0 ${isMobile ? 'min-w-[140px] h-48' : 'min-w-[160px] h-52'} rounded-3xl animate-slide-up flex-shrink-0 hover:scale-105 transition-all duration-500 shadow-lg hover:shadow-xl`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardContent className="flex flex-col justify-between h-full p-0">
                  <div className={`${isMobile ? 'p-5' : 'p-6'} text-center flex flex-col justify-between h-full`}>
                    <div className="flex-shrink-0">
                      <div className={`${isMobile ? 'w-12 h-12' : 'w-14 h-14'} bg-gradient-to-br ${macro.color} rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg`}>
                        <Icon className={`${isMobile ? 'h-6 w-6' : 'h-7 w-7'} text-white`} />
                      </div>
                      <h4 className={`font-bold text-gray-900 dark:text-white mb-3 ${isMobile ? 'text-base' : 'text-lg'} leading-tight`}>{macro.name}</h4>
                    </div>
                    <div className="flex-grow flex flex-col justify-center space-y-2">
                      <p className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold neon-text leading-tight`}>
                        {macro.current.toFixed(0)}{macro.unit}
                      </p>
                      <p className={`${isMobile ? 'text-sm' : 'text-base'} text-gray-500 dark:text-gray-400 leading-tight`}>
                        of {macro.target}{macro.unit}
                      </p>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mt-4 flex-shrink-0">
                      <div
                        className={`bg-gradient-to-r ${macro.color} h-3 rounded-full transition-all duration-1500 shadow-sm`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* AI Insights Card */}
      <Card className={`modern-action-card ai-insights-card border-0 rounded-3xl animate-slide-up float-animation hover:scale-[1.02] transition-all duration-500 ${isMobile ? 'mb-32' : 'mb-40'} shadow-xl hover:shadow-2xl`} style={{ animationDelay: '600ms' }}>
        <CardContent className={`${isMobile ? 'p-8' : 'p-10'}`}>
          <div className={`flex items-center ${isMobile ? 'space-x-4' : 'space-x-5'} mb-6 sm:mb-8`}>
            <div className={`${isMobile ? 'w-12 h-12' : 'w-14 h-14'} gradient-primary rounded-full flex items-center justify-center shadow-lg ai-glow`}>
              <Zap className={`${isMobile ? 'h-6 w-6' : 'h-7 w-7'} text-white`} />
            </div>
            <h3 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-gray-900 dark:text-white`}>AI Insights</h3>
          </div>
          <div className="space-y-5 sm:space-y-6">
            <p className={`${isMobile ? 'text-lg' : 'text-xl'} text-gray-700 dark:text-gray-300 font-medium`}>
              🎯 You're {progressPercentage >= 80 ? 'crushing' : 'building toward'} your daily goals!
            </p>
            {progressPercentage < 80 && (
              <p className={`${isMobile ? 'text-base' : 'text-lg'} text-gray-600 dark:text-gray-400`}>
                💡 Consider a nutrient-dense snack to optimize your intake.
              </p>
            )}
            <Button
              onClick={() => navigate('/coach')}
              className={`bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white ${isMobile ? 'px-8 py-5 text-lg' : 'px-10 py-6 text-xl'} rounded-3xl font-bold shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-105 coach-button-glow`}
            >
              Ask your AI coach ✨ →
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Home;

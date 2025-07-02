
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Camera, TrendingUp, Droplets, Pill, Zap, Target, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNutrition } from '@/contexts/NutritionContext';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import CelebrationPopup from '@/components/CelebrationPopup';

const Home = () => {
  const { user } = useAuth();
  const { getTodaysProgress, getHydrationGoal, getSupplementGoal } = useNutrition();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const progress = getTodaysProgress();

  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationType, setCelebrationType] = useState('');

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
    <div className="space-y-12 sm:space-y-16 animate-fade-in">
      {/* Celebration Popup */}
      <CelebrationPopup 
        show={showCelebration} 
        message={celebrationType}
        onClose={() => setShowCelebration(false)}
      />

      {/* Enhanced Greeting Section */}
      <div className="text-center space-y-4 sm:space-y-6 py-6 sm:py-8">
        <div className="inline-block">
          <h1 className={`${isMobile ? 'text-2xl' : 'text-4xl'} font-bold bg-gradient-to-r from-gray-900 via-emerald-600 to-blue-600 dark:from-gray-100 dark:via-emerald-400 dark:to-blue-400 bg-clip-text text-transparent mb-3`}>
            {isMobile ? "Let's optimize your day," : "Let's optimize your day,"}
          </h1>
          <h2 className={`${isMobile ? 'text-2xl' : 'text-4xl'} font-bold neon-text`}>
            {user?.name?.split(' ')[0] || 'Superstar'}! ✨
          </h2>
        </div>
        <p className={`text-gray-600 dark:text-gray-300 font-medium ${isMobile ? 'text-base' : 'text-lg'}`}>Your intelligent wellness companion is ready</p>
      </div>

      {/* Enhanced Daily Tracker Cards - No container box */}
      <div className={`grid grid-cols-3 ${isMobile ? 'gap-4' : 'gap-6'} animate-scale-in items-stretch px-2`}>
        {/* Enhanced Calories Tracker */}
        <Card 
          className={`modern-tracker-card calories-tracker border-0 ${isMobile ? 'h-44 p-3' : 'h-52 p-5'} rounded-3xl hover:scale-105 transition-all duration-500 cursor-pointer group`}
          onClick={() => setShowCelebration(true)}
          title={getMotivationalMessage(progressPercentage, 'Calories')}
        >
          <CardContent className="flex flex-col items-center justify-between p-0 h-full">
            <div className={`relative ${isMobile ? 'w-24 h-24' : 'w-32 h-32'} flex-shrink-0 mt-2`}>
              <svg className={`${isMobile ? 'w-24 h-24' : 'w-32 h-32'} enhanced-progress-ring`} viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255, 87, 34, 0.15)" strokeWidth="4" />
                <circle
                  cx="60" cy="60" r="52" fill="none" stroke="url(#calorieGradient)" strokeWidth="6"
                  strokeLinecap="round" strokeDasharray={327} strokeDashoffset={327 - (progressPercentage / 100) * 327}
                  className="transition-all duration-2000 ease-out drop-shadow-lg calories-ring-glow"
                />
                <defs>
                  <linearGradient id="calorieGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FF5722" />
                    <stop offset="50%" stopColor="#FF9800" />
                    <stop offset="100%" stopColor="#FFC107" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`${isMobile ? 'text-2xl' : 'text-3xl'} mb-1 group-hover:scale-110 transition-transform`}>🔥</span>
                <span className={`${isMobile ? 'text-base' : 'text-xl'} font-bold text-orange-600 dark:text-orange-400`}>
                  {Math.round(progressPercentage)}%
                </span>
                {progressPercentage >= 100 && <Sparkles className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} text-orange-400 animate-pulse mt-1`} />}
              </div>
            </div>
            <div className="text-center flex-shrink-0 space-y-1">
              <p className={`${isMobile ? 'text-sm' : 'text-base'} font-bold text-gray-900 dark:text-white`}>Calories</p>
              <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600 dark:text-gray-400`}>
                {currentCalories.toFixed(0)}/{totalCalories}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Hydration Tracker */}
        <Card 
          className={`modern-tracker-card hydration-tracker border-0 ${isMobile ? 'h-44 p-3' : 'h-52 p-5'} rounded-3xl hover:scale-105 transition-all duration-500 cursor-pointer group`}
          onClick={() => navigate('/hydration')}
          title={getMotivationalMessage(hydrationPercentage, 'Hydration')}
        >
          <CardContent className="flex flex-col items-center justify-between p-0 h-full">
            <div className={`relative ${isMobile ? 'w-24 h-24' : 'w-32 h-32'} flex-shrink-0 mt-2`}>
              <svg className={`${isMobile ? 'w-24 h-24' : 'w-32 h-32'} enhanced-progress-ring`} viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(3, 169, 244, 0.15)" strokeWidth="4" />
                <circle
                  cx="60" cy="60" r="52" fill="none" stroke="url(#hydrationGradient)" strokeWidth="6"
                  strokeLinecap="round" strokeDasharray={327} strokeDashoffset={327 - (hydrationPercentage / 100) * 327}
                  className="transition-all duration-2000 ease-out drop-shadow-lg hydration-ring-glow"
                />
                <defs>
                  <linearGradient id="hydrationGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#03A9F4" />
                    <stop offset="50%" stopColor="#00BCD4" />
                    <stop offset="100%" stopColor="#009688" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`${isMobile ? 'text-2xl' : 'text-3xl'} mb-1 group-hover:scale-110 transition-transform`}>💧</span>
                <span className={`${isMobile ? 'text-base' : 'text-xl'} font-bold text-cyan-600 dark:text-cyan-400`}>
                  {Math.round(hydrationPercentage)}%
                </span>
                {hydrationPercentage >= 100 && <Sparkles className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} text-cyan-400 animate-pulse mt-1`} />}
              </div>
            </div>
            <div className="text-center flex-shrink-0 space-y-1">
              <p className={`${isMobile ? 'text-sm' : 'text-base'} font-bold text-gray-900 dark:text-white`}>Hydration</p>
              <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600 dark:text-gray-400`}>
                {progress.hydration}/{hydrationGoal}ml
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Supplements Tracker */}
        <Card 
          className={`modern-tracker-card supplements-tracker border-0 ${isMobile ? 'h-44 p-3' : 'h-52 p-5'} rounded-3xl hover:scale-105 transition-all duration-500 cursor-pointer group`}
          onClick={() => navigate('/supplements')}
          title={getMotivationalMessage(supplementPercentage, 'Supplements')}
        >
          <CardContent className="flex flex-col items-center justify-between p-0 h-full">
            <div className={`relative ${isMobile ? 'w-24 h-24' : 'w-32 h-32'} flex-shrink-0 mt-2`}>
              <svg className={`${isMobile ? 'w-24 h-24' : 'w-32 h-32'} enhanced-progress-ring`} viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(156, 39, 176, 0.15)" strokeWidth="4" />
                <circle
                  cx="60" cy="60" r="52" fill="none" stroke="url(#supplementGradient)" strokeWidth="6"
                  strokeLinecap="round" strokeDasharray={327} strokeDashoffset={327 - (supplementPercentage / 100) * 327}
                  className="transition-all duration-2000 ease-out drop-shadow-lg supplements-ring-glow"
                />
                <defs>
                  <linearGradient id="supplementGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#9C27B0" />
                    <stop offset="50%" stopColor="#E91E63" />
                    <stop offset="100%" stopColor="#FF4081" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`${isMobile ? 'text-2xl' : 'text-3xl'} mb-1 group-hover:scale-110 transition-transform`}>💊</span>
                <span className={`${isMobile ? 'text-base' : 'text-xl'} font-bold text-purple-600 dark:text-purple-400`}>
                  {Math.round(supplementPercentage)}%
                </span>
                {supplementPercentage >= 100 && <Sparkles className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} text-purple-400 animate-pulse mt-1`} />}
              </div>
            </div>
            <div className="text-center flex-shrink-0 space-y-1">
              <p className={`${isMobile ? 'text-sm' : 'text-base'} font-bold text-gray-900 dark:text-white`}>Supplements</p>
              <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600 dark:text-gray-400`}>
                {progress.supplements}/{supplementGoal}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Logging Actions Section - No container box, spaced naturally */}
      <div className="space-y-6 sm:space-y-8 px-2">
        {/* Primary Action: Log Food */}
        <Card 
          className="modern-action-card log-food-card border-0 rounded-3xl overflow-hidden hover:scale-[1.02] transition-all duration-500 cursor-pointer shadow-xl hover:shadow-2xl"
          onClick={() => navigate('/camera')}
        >
          <CardContent className={`${isMobile ? 'p-6' : 'p-8'} text-center`}>
            <div className="flex flex-col items-center space-y-4 sm:space-y-5">
              <div className={`${isMobile ? 'w-16 h-16' : 'w-20 h-20'} bg-gradient-to-br from-blue-500 to-sky-500 rounded-3xl flex items-center justify-center shadow-2xl log-food-glow`}>
                <Camera className={`${isMobile ? 'h-8 w-8' : 'h-10 w-10'} text-white`} />
              </div>
              <div className="space-y-2">
                <h3 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-gray-800 dark:text-gray-100`}>
                  Log Food
                </h3>
                <p className={`${isMobile ? 'text-sm' : 'text-base'} text-gray-600 dark:text-gray-400`}>
                  Take photo or speak to log
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Secondary Actions: Hydration & Supplements - No container box */}
        <div className={`grid grid-cols-2 ${isMobile ? 'gap-4' : 'gap-6'} items-stretch`}>
          {/* Enhanced Hydration Action Card */}
          <Card 
            className={`modern-action-card hydration-action-card border-0 rounded-3xl overflow-hidden hover:scale-105 transition-all duration-500 cursor-pointer ${isMobile ? 'h-32' : 'h-36'} shadow-lg hover:shadow-xl`}
            onClick={() => navigate('/hydration')}
          >
            <CardContent className="flex flex-col items-center justify-center h-full p-0">
              <div className={`flex flex-col items-center space-y-3 ${isMobile ? 'p-4' : 'p-5'}`}>
                <div className={`${isMobile ? 'w-12 h-12' : 'w-16 h-16'} bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg hydration-action-glow flex-shrink-0`}>
                  <Droplets className={`${isMobile ? 'h-6 w-6' : 'h-8 w-8'} text-white`} />
                </div>
                <div className="text-center flex-shrink-0">
                  <h4 className={`${isMobile ? 'text-base' : 'text-lg'} font-bold text-gray-800 dark:text-gray-100 leading-tight`}>
                    Hydration
                  </h4>
                  <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600 dark:text-gray-400 leading-tight`}>
                    Track water
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Enhanced Supplements Action Card */}
          <Card 
            className={`modern-action-card supplements-action-card border-0 rounded-3xl overflow-hidden hover:scale-105 transition-all duration-500 cursor-pointer ${isMobile ? 'h-32' : 'h-36'} shadow-lg hover:shadow-xl`}
            onClick={() => navigate('/supplements')}
          >
            <CardContent className="flex flex-col items-center justify-center h-full p-0">
              <div className={`flex flex-col items-center space-y-3 ${isMobile ? 'p-4' : 'p-5'}`}>
                <div className={`${isMobile ? 'w-12 h-12' : 'w-16 h-16'} bg-gradient-to-br from-purple-500 to-violet-500 rounded-2xl flex items-center justify-center shadow-lg supplements-action-glow flex-shrink-0`}>
                  <Pill className={`${isMobile ? 'h-6 w-6' : 'h-8 w-8'} text-white`} />
                </div>
                <div className="text-center flex-shrink-0">
                  <h4 className={`${isMobile ? 'text-base' : 'text-lg'} font-bold text-gray-800 dark:text-gray-100 leading-tight`}>
                    Supplements
                  </h4>
                  <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600 dark:text-gray-400 leading-tight`}>
                    Log vitamins
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Today's Nutrients Section - No container box */}
      <div className="space-y-6 sm:space-y-8 px-2">
        <h3 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-gray-900 dark:text-white text-center`}>Today's Nutrients</h3>
        <div className="flex space-x-4 sm:space-x-6 overflow-x-auto scroll-cards pb-4">
          {macroCards.map((macro, index) => {
            const percentage = Math.min((macro.current / macro.target) * 100, 100);
            const Icon = macro.icon;
            
            return (
              <Card
                key={macro.name}
                className={`modern-nutrient-card nutrients-card border-0 ${isMobile ? 'min-w-[120px] h-40' : 'min-w-[140px] h-44'} rounded-3xl animate-slide-up flex-shrink-0 hover:scale-105 transition-all duration-500 shadow-lg hover:shadow-xl`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardContent className="flex flex-col justify-between h-full p-0">
                  <div className={`${isMobile ? 'p-4' : 'p-5'} text-center flex flex-col justify-between h-full`}>
                    <div className="flex-shrink-0">
                      <div className={`${isMobile ? 'w-10 h-10' : 'w-12 h-12'} bg-gradient-to-br ${macro.color} rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg`}>
                        <Icon className={`${isMobile ? 'h-5 w-5' : 'h-6 w-6'} text-white`} />
                      </div>
                      <h4 className={`font-bold text-gray-900 dark:text-white mb-2 ${isMobile ? 'text-sm' : 'text-base'} leading-tight`}>{macro.name}</h4>
                    </div>
                    <div className="flex-grow flex flex-col justify-center space-y-1">
                      <p className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold neon-text leading-tight`}>
                        {macro.current.toFixed(0)}{macro.unit}
                      </p>
                      <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-500 dark:text-gray-400 leading-tight`}>
                        of {macro.target}{macro.unit}
                      </p>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-3 flex-shrink-0">
                      <div
                        className={`bg-gradient-to-r ${macro.color} h-2 rounded-full transition-all duration-1500 shadow-sm`}
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

      {/* AI Insights Card - No container box */}
      <Card className={`modern-action-card ai-insights-card border-0 rounded-3xl animate-slide-up float-animation hover:scale-[1.02] transition-all duration-500 ${isMobile ? 'mb-24 mx-2' : 'mb-36 mx-2'} shadow-xl hover:shadow-2xl`} style={{ animationDelay: '600ms' }}>
        <CardContent className={`${isMobile ? 'p-6' : 'p-8'}`}>
          <div className={`flex items-center ${isMobile ? 'space-x-3' : 'space-x-4'} mb-5 sm:mb-6`}>
            <div className={`${isMobile ? 'w-10 h-10' : 'w-12 h-12'} gradient-primary rounded-full flex items-center justify-center shadow-lg ai-glow`}>
              <Zap className={`${isMobile ? 'h-5 w-5' : 'h-6 w-6'} text-white`} />
            </div>
            <h3 className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-gray-900 dark:text-white`}>AI Insights</h3>
          </div>
          <div className="space-y-4 sm:space-y-5">
            <p className={`${isMobile ? 'text-base' : 'text-lg'} text-gray-700 dark:text-gray-300 font-medium`}>
              🎯 You're {progressPercentage >= 80 ? 'crushing' : 'building toward'} your daily goals!
            </p>
            {progressPercentage < 80 && (
              <p className={`${isMobile ? 'text-sm' : 'text-base'} text-gray-600 dark:text-gray-400`}>
                💡 Consider a nutrient-dense snack to optimize your intake.
              </p>
            )}
            <Button
              onClick={() => navigate('/coach')}
              className={`bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white ${isMobile ? 'px-6 py-4 text-base' : 'px-8 py-5 text-lg'} rounded-3xl font-bold shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-105 coach-button-glow`}
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

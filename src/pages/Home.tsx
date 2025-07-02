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

  const actionButtons = [
    {
      title: 'Log Food',
      icon: Camera,
      action: () => navigate('/camera'),
      gradient: 'from-emerald-500 to-blue-500',
      glow: 'emerald',
      description: 'Take a photo of your meal to log nutrition',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      borderColor: 'border-blue-200 dark:border-blue-800'
    },
    {
      title: 'Hydration',
      icon: Droplets,
      action: () => navigate('/hydration'),
      gradient: 'from-blue-500 to-cyan-500',
      glow: 'blue',  
      description: 'Track your daily water intake',
      bgColor: 'bg-cyan-50 dark:bg-cyan-900/20',
      borderColor: 'border-cyan-200 dark:border-cyan-800'
    },
    {
      title: 'Supplements',
      icon: Pill,
      action: () => navigate('/supplements'),
      gradient: 'from-purple-500 to-pink-500',
      glow: 'purple',
      description: 'Log vitamins and supplements',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      borderColor: 'border-purple-200 dark:border-purple-800'
    },
  ];

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* Celebration Popup */}
      <CelebrationPopup 
        show={showCelebration} 
        message={celebrationType}
        onClose={() => setShowCelebration(false)}
      />

      {/* Mobile-Optimized Greeting */}
      <div className="text-center space-y-2 sm:space-y-4 py-2 sm:py-4">
        <div className="inline-block">
          <h1 className={`${isMobile ? 'text-xl' : 'text-3xl'} font-bold bg-gradient-to-r from-gray-900 via-emerald-600 to-blue-600 dark:from-gray-100 dark:via-emerald-400 dark:to-blue-400 bg-clip-text text-transparent mb-2`}>
            {isMobile ? "Let's optimize your day," : "Let's optimize your day,"}
          </h1>
          <h2 className={`${isMobile ? 'text-xl' : 'text-3xl'} font-bold neon-text`}>
            {user?.name?.split(' ')[0] || 'Superstar'}! ✨
          </h2>
        </div>
        <p className={`text-gray-600 dark:text-gray-300 font-medium ${isMobile ? 'text-sm' : 'text-base'}`}>Your intelligent wellness companion is ready</p>
      </div>

      {/* Enhanced Progress Rings - Mobile Responsive */}
      <div className={`grid grid-cols-3 ${isMobile ? 'gap-2' : 'gap-4'} animate-scale-in`}>
        {/* Calories Ring */}
        <Card className="visible-card border-0 p-2 sm:p-4 rounded-2xl hover:scale-105 transition-all duration-300">
          <CardContent className="flex flex-col items-center space-y-1 sm:space-y-2 p-0">
            <div className={`relative ${isMobile ? 'w-16 h-16' : 'w-24 h-24'}`}>
              <svg className={`${isMobile ? 'w-16 h-16' : 'w-24 h-24'} progress-ring`} viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(0, 200, 150, 0.1)" strokeWidth="8" />
                <circle
                  cx="60" cy="60" r="52" fill="none" stroke="url(#calorieGradient)" strokeWidth="8"
                  strokeLinecap="round" strokeDasharray={327} strokeDashoffset={327 - (progressPercentage / 100) * 327}
                  className="transition-all duration-1000 ease-out drop-shadow-lg"
                />
                <defs>
                  <linearGradient id="calorieGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#00C896" />
                    <stop offset="100%" stopColor="#2E8BFF" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`${isMobile ? 'text-sm' : 'text-lg'} font-bold neon-text`}>{Math.round(progressPercentage)}%</span>
                {progressPercentage >= 100 && <Sparkles className={`${isMobile ? 'h-2 w-2' : 'h-3 w-3'} text-emerald-400 animate-pulse`} />}
              </div>
            </div>
            <div className="text-center">
              <p className={`${isMobile ? 'text-xs' : 'text-sm'} font-semibold text-gray-900 dark:text-white`}>Calories</p>
              <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-500 dark:text-gray-400`}>{currentCalories.toFixed(0)}/{totalCalories}</p>
            </div>
          </CardContent>
        </Card>

        {/* Hydration Ring */}
        <Card className="visible-card border-0 p-2 sm:p-4 rounded-2xl hover:scale-105 transition-all duration-300">
          <CardContent className="flex flex-col items-center space-y-1 sm:space-y-2 p-0">
            <div className={`relative ${isMobile ? 'w-16 h-16' : 'w-24 h-24'}`}>
              <svg className={`${isMobile ? 'w-16 h-16' : 'w-24 h-24'} progress-ring`} viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(6, 182, 212, 0.1)" strokeWidth="8" />
                <circle
                  cx="60" cy="60" r="52" fill="none" stroke="url(#hydrationGradient)" strokeWidth="8"
                  strokeLinecap="round" strokeDasharray={327} strokeDashoffset={327 - (hydrationPercentage / 100) * 327}
                  className="transition-all duration-1000 ease-out drop-shadow-lg"
                />
                <defs>
                  <linearGradient id="hydrationGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#06B6D4" />
                    <stop offset="100%" stopColor="#3B82F6" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`${isMobile ? 'text-sm' : 'text-lg'} font-bold text-cyan-600 dark:text-cyan-400`}>{Math.round(hydrationPercentage)}%</span>
                {hydrationPercentage >= 100 && <Sparkles className={`${isMobile ? 'h-2 w-2' : 'h-3 w-3'} text-cyan-400 animate-pulse`} />}
              </div>
            </div>
            <div className="text-center">
              <p className={`${isMobile ? 'text-xs' : 'text-sm'} font-semibold text-gray-900 dark:text-white`}>Hydration</p>
              <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-500 dark:text-gray-400`}>{progress.hydration}/{hydrationGoal}ml</p>
            </div>
          </CardContent>
        </Card>

        {/* Supplements Ring */}
        <Card className="visible-card border-0 p-2 sm:p-4 rounded-2xl hover:scale-105 transition-all duration-300">
          <CardContent className="flex flex-col items-center space-y-1 sm:space-y-2 p-0">
            <div className={`relative ${isMobile ? 'w-16 h-16' : 'w-24 h-24'}`}>
              <svg className={`${isMobile ? 'w-16 h-16' : 'w-24 h-24'} progress-ring`} viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(168, 85, 247, 0.1)" strokeWidth="8" />
                <circle
                  cx="60" cy="60" r="52" fill="none" stroke="url(#supplementGradient)" strokeWidth="8"
                  strokeLinecap="round" strokeDasharray={327} strokeDashoffset={327 - (supplementPercentage / 100) * 327}
                  className="transition-all duration-1000 ease-out drop-shadow-lg"
                />
                <defs>
                  <linearGradient id="supplementGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#A855F7" />
                    <stop offset="100%" stopColor="#EC4899" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`${isMobile ? 'text-sm' : 'text-lg'} font-bold text-purple-600 dark:text-purple-400`}>{Math.round(supplementPercentage)}%</span>
                {supplementPercentage >= 100 && <Sparkles className={`${isMobile ? 'h-2 w-2' : 'h-3 w-3'} text-purple-400 animate-pulse`} />}
              </div>
            </div>
            <div className="text-center">
              <p className={`${isMobile ? 'text-xs' : 'text-sm'} font-semibold text-gray-900 dark:text-white`}>Supplements</p>
              <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-500 dark:text-gray-400`}>{progress.supplements}/{supplementGoal}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Redesigned Action Buttons - New Layout */}
      <div className="space-y-3 sm:space-y-4">
        {/* Primary Action: Log Food (Full Width) */}
        <Button
          onClick={actionButtons[0].action}
          className={`w-full ${actionButtons[0].bgColor} ${actionButtons[0].borderColor} border-2 ${isMobile ? 'h-16 py-3' : 'h-20 py-4'} flex items-center justify-center space-x-3 rounded-2xl hover:shadow-lg transition-all duration-300 hover:scale-[1.02] animate-slide-up`}
          style={{ animationDelay: '0ms' }}
        >
          <div className={`${isMobile ? 'w-8 h-8' : 'w-10 h-10'} bg-gradient-to-r ${actionButtons[0].gradient} rounded-xl flex items-center justify-center neon-glow`}>
            <Camera className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-white`} />
          </div>
          <div className="flex flex-col items-start">
            <span className={`${isMobile ? 'text-base' : 'text-lg'} font-bold text-gray-700 dark:text-gray-200`}>Log Food</span>
            <span className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-500 dark:text-gray-400`}>Take a photo of your meal</span>
          </div>
        </Button>

        {/* Secondary Actions: Hydration & Supplements (Side by Side) */}
        <div className={`grid grid-cols-2 ${isMobile ? 'gap-2' : 'gap-4'}`}>
          <Button
            onClick={actionButtons[1].action}
            className={`${actionButtons[1].bgColor} ${actionButtons[1].borderColor} border-2 ${isMobile ? 'h-16 py-2' : 'h-20 py-3'} flex flex-col items-center justify-center space-y-1 rounded-2xl hover:shadow-lg transition-all duration-300 hover:scale-[1.02] animate-slide-up`}
            style={{ animationDelay: '150ms' }}
          >
            <div className={`${isMobile ? 'w-6 h-6' : 'w-8 h-8'} bg-gradient-to-r ${actionButtons[1].gradient} rounded-xl flex items-center justify-center neon-glow`}>
              <Droplets className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} text-white`} />
            </div>
            <div className="text-center">
              <span className={`${isMobile ? 'text-sm' : 'text-base'} font-semibold text-gray-700 dark:text-gray-200 block`}>Hydration</span>
              <span className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-500 dark:text-gray-400`}>Track water</span>
            </div>
          </Button>

          <Button
            onClick={actionButtons[2].action}
            className={`${actionButtons[2].bgColor} ${actionButtons[2].borderColor} border-2 ${isMobile ? 'h-16 py-2' : 'h-20 py-3'} flex flex-col items-center justify-center space-y-1 rounded-2xl hover:shadow-lg transition-all duration-300 hover:scale-[1.02] animate-slide-up`}
            style={{ animationDelay: '300ms' }}
          >
            <div className={`${isMobile ? 'w-6 h-6' : 'w-8 h-8'} bg-gradient-to-r ${actionButtons[2].gradient} rounded-xl flex items-center justify-center neon-glow`}>
              <Pill className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} text-white`} />
            </div>
            <div className="text-center">
              <span className={`${isMobile ? 'text-sm' : 'text-base'} font-semibold text-gray-700 dark:text-gray-200 block`}>Supplements</span>
              <span className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-500 dark:text-gray-400`}>Log vitamins</span>
            </div>
          </Button>
        </div>
      </div>

      {/* Horizontal Scrollable Macro Cards - Mobile Optimized */}
      <div className="space-y-3 sm:space-y-4">
        <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-bold text-gray-900 dark:text-white text-center drop-shadow-lg`}>Today's Nutrients</h3>
        <div className="flex space-x-3 sm:space-x-4 overflow-x-auto scroll-cards pb-2">
          {macroCards.map((macro, index) => {
            const percentage = Math.min((macro.current / macro.target) * 100, 100);
            const Icon = macro.icon;
            
            return (
              <Card
                key={macro.name}
                className={`visible-card border-0 ${isMobile ? 'min-w-[100px]' : 'min-w-[120px]'} rounded-2xl animate-slide-up`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardContent className={`${isMobile ? 'p-2' : 'p-3'} text-center`}>
                  <div className={`${isMobile ? 'w-6 h-6' : 'w-8 h-8'} bg-gradient-to-r ${macro.color} rounded-xl flex items-center justify-center mx-auto mb-1 sm:mb-2 neon-glow`}>
                    <Icon className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} text-white`} />
                  </div>
                  <h4 className={`font-semibold text-gray-900 dark:text-white mb-1 ${isMobile ? 'text-xs' : 'text-sm'}`}>{macro.name}</h4>
                  <p className={`${isMobile ? 'text-sm' : 'text-base'} font-bold neon-text`}>
                    {macro.current.toFixed(0)}{macro.unit}
                  </p>
                  <p className={`${isMobile ? 'text-xs' : 'text-xs'} text-gray-500 dark:text-gray-400`}>
                    of {macro.target}{macro.unit}
                  </p>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1 mt-1">
                    <div
                      className={`bg-gradient-to-r ${macro.color} h-1 rounded-full transition-all duration-700`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* AI Insights Card - Mobile Optimized */}
      <Card className={`visible-card border-0 rounded-3xl animate-slide-up float-animation ${isMobile ? 'mb-20' : 'mb-32'}`} style={{ animationDelay: '600ms' }}>
        <CardContent className={`${isMobile ? 'p-4' : 'p-6'}`}>
          <div className={`flex items-center ${isMobile ? 'space-x-2' : 'space-x-3'} mb-3 sm:mb-4`}>
            <div className={`${isMobile ? 'w-6 h-6' : 'w-8 h-8'} gradient-primary rounded-full flex items-center justify-center neon-glow`}>
              <Zap className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} text-white`} />
            </div>
            <h3 className={`${isMobile ? 'text-sm' : 'text-base'} font-bold text-gray-900 dark:text-white`}>AI Insights</h3>
          </div>
          <div className="space-y-2 sm:space-y-3">
            <p className={`${isMobile ? 'text-sm' : 'text-base'} text-gray-700 dark:text-gray-300 font-medium`}>
              🎯 You're {progressPercentage >= 80 ? 'crushing' : 'building toward'} your daily goals!
            </p>
            {progressPercentage < 80 && (
              <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600 dark:text-gray-400`}>
                💡 Consider a nutrient-dense snack to optimize your intake.
              </p>
            )}
            <Button
              onClick={() => navigate('/coach')}
              className={`bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white ${isMobile ? 'px-4 py-2 text-sm' : 'px-6 py-3 text-base'} rounded-2xl font-bold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 neon-glow`}
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

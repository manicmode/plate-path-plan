
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

  return (
    <div className="space-y-8 sm:space-y-10 animate-fade-in">
      {/* Celebration Popup */}
      <CelebrationPopup 
        show={showCelebration} 
        message={celebrationType}
        onClose={() => setShowCelebration(false)}
      />

      {/* Enhanced Greeting Section */}
      <div className="enhanced-section text-center space-y-3 sm:space-y-4 py-4 sm:py-6">
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

      {/* Enhanced Progress Rings Section */}
      <div className="enhanced-section">
        <div className={`grid grid-cols-3 ${isMobile ? 'gap-3' : 'gap-4'} animate-scale-in items-stretch`}>
          {/* Enhanced Calories Ring */}
          <Card className={`enhanced-progress-card calories-card border-0 p-3 sm:p-4 rounded-3xl hover:enhanced-hover transition-all duration-300 ${isMobile ? 'h-36' : 'h-44'}`}>
            <CardContent className="flex flex-col items-center justify-between p-0 h-full">
              <div className={`relative ${isMobile ? 'w-20 h-20' : 'w-28 h-28'} flex-shrink-0`}>
                <svg className={`${isMobile ? 'w-20 h-20' : 'w-28 h-28'} enhanced-progress-ring`} viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(0, 200, 150, 0.15)" strokeWidth="6" />
                  <circle
                    cx="60" cy="60" r="52" fill="none" stroke="url(#enhancedCalorieGradient)" strokeWidth="6"
                    strokeLinecap="round" strokeDasharray={327} strokeDashoffset={327 - (progressPercentage / 100) * 327}
                    className="transition-all duration-1500 ease-out drop-shadow-lg animate-pulse-glow"
                  />
                  <defs>
                    <linearGradient id="enhancedCalorieGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#10B981" />
                      <stop offset="50%" stopColor="#00C896" />
                      <stop offset="100%" stopColor="#06B6D4" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl mb-1">🔥</span>
                  <span className={`${isMobile ? 'text-sm' : 'text-lg'} font-bold neon-text`}>{Math.round(progressPercentage)}%</span>
                  {progressPercentage >= 100 && <Sparkles className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} text-emerald-400 animate-pulse`} />}
                </div>
              </div>
              <div className="text-center flex-shrink-0 mt-2">
                <p className={`${isMobile ? 'text-sm' : 'text-base'} font-bold text-gray-900 dark:text-white leading-tight`}>Calories</p>
                <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600 dark:text-gray-400 leading-tight`}>{currentCalories.toFixed(0)}/{totalCalories}</p>
              </div>
            </CardContent>
          </Card>

          {/* Enhanced Hydration Ring */}
          <Card className={`enhanced-progress-card hydration-card border-0 p-3 sm:p-4 rounded-3xl hover:enhanced-hover transition-all duration-300 ${isMobile ? 'h-36' : 'h-44'}`}>
            <CardContent className="flex flex-col items-center justify-between p-0 h-full">
              <div className={`relative ${isMobile ? 'w-20 h-20' : 'w-28 h-28'} flex-shrink-0`}>
                <svg className={`${isMobile ? 'w-20 h-20' : 'w-28 h-28'} enhanced-progress-ring`} viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(6, 182, 212, 0.15)" strokeWidth="6" />
                  <circle
                    cx="60" cy="60" r="52" fill="none" stroke="url(#enhancedHydrationGradient)" strokeWidth="6"
                    strokeLinecap="round" strokeDasharray={327} strokeDashoffset={327 - (hydrationPercentage / 100) * 327}
                    className="transition-all duration-1500 ease-out drop-shadow-lg animate-pulse-glow"
                  />
                  <defs>
                    <linearGradient id="enhancedHydrationGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#0EA5E9" />
                      <stop offset="50%" stopColor="#06B6D4" />
                      <stop offset="100%" stopColor="#3B82F6" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl mb-1">💧</span>
                  <span className={`${isMobile ? 'text-sm' : 'text-lg'} font-bold text-cyan-600 dark:text-cyan-400`}>{Math.round(hydrationPercentage)}%</span>
                  {hydrationPercentage >= 100 && <Sparkles className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} text-cyan-400 animate-pulse`} />}
                </div>
              </div>
              <div className="text-center flex-shrink-0 mt-2">
                <p className={`${isMobile ? 'text-sm' : 'text-base'} font-bold text-gray-900 dark:text-white leading-tight`}>Hydration</p>
                <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600 dark:text-gray-400 leading-tight`}>{progress.hydration}/{hydrationGoal}ml</p>
              </div>
            </CardContent>
          </Card>

          {/* Enhanced Supplements Ring */}
          <Card className={`enhanced-progress-card supplements-card border-0 p-3 sm:p-4 rounded-3xl hover:enhanced-hover transition-all duration-300 ${isMobile ? 'h-36' : 'h-44'}`}>
            <CardContent className="flex flex-col items-center justify-between p-0 h-full">
              <div className={`relative ${isMobile ? 'w-20 h-20' : 'w-28 h-28'} flex-shrink-0`}>
                <svg className={`${isMobile ? 'w-20 h-20' : 'w-28 h-28'} enhanced-progress-ring`} viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(147, 51, 234, 0.15)" strokeWidth="6" />
                  <circle
                    cx="60" cy="60" r="52" fill="none" stroke="url(#enhancedSupplementGradient)" strokeWidth="6"
                    strokeLinecap="round" strokeDasharray={327} strokeDashoffset={327 - (supplementPercentage / 100) * 327}
                    className="transition-all duration-1500 ease-out drop-shadow-lg animate-pulse-glow"
                  />
                  <defs>
                    <linearGradient id="enhancedSupplementGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#9333EA" />
                      <stop offset="50%" stopColor="#A855F7" />
                      <stop offset="100%" stopColor="#EC4899" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl mb-1">💊</span>
                  <span className={`${isMobile ? 'text-sm' : 'text-lg'} font-bold text-purple-600 dark:text-purple-400`}>{Math.round(supplementPercentage)}%</span>
                  {supplementPercentage >= 100 && <Sparkles className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} text-purple-400 animate-pulse`} />}
                </div>
              </div>
              <div className="text-center flex-shrink-0 mt-2">
                <p className={`${isMobile ? 'text-sm' : 'text-base'} font-bold text-gray-900 dark:text-white leading-tight`}>Supplements</p>
                <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600 dark:text-gray-400 leading-tight`}>{progress.supplements}/{supplementGoal}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Enhanced Logging Actions Section */}
      <div className="enhanced-section space-y-4 sm:space-y-6">
        {/* Primary Action: Log Food */}
        <Card 
          className="enhanced-card log-food-card border-0 rounded-3xl overflow-hidden hover:enhanced-hover transition-all duration-300 cursor-pointer"
          onClick={() => navigate('/camera')}
          style={{ animationDelay: '0ms' }}
        >
          <CardContent className={`${isMobile ? 'p-5' : 'p-6'} text-center`}>
            <div className="flex flex-col items-center space-y-3 sm:space-y-4">
              <div className={`${isMobile ? 'w-14 h-14' : 'w-18 h-18'} bg-gradient-to-br from-blue-500 to-sky-500 rounded-3xl flex items-center justify-center enhanced-icon-glow shadow-xl`}>
                <Camera className={`${isMobile ? 'h-7 w-7' : 'h-9 w-9'} text-white`} />
              </div>
              <div className="space-y-1">
                <h3 className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-gray-800 dark:text-gray-100`}>
                  Log Food
                </h3>
                <p className={`${isMobile ? 'text-sm' : 'text-base'} text-gray-600 dark:text-gray-400`}>
                  Take photo or speak to log
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Secondary Actions: Hydration & Supplements */}
        <div className={`grid grid-cols-2 ${isMobile ? 'gap-4' : 'gap-5'} items-stretch`}>
          {/* Enhanced Hydration Card */}
          <Card 
            className={`enhanced-card hydration-action-card border-0 rounded-3xl overflow-hidden hover:enhanced-hover transition-all duration-300 cursor-pointer ${isMobile ? 'h-28' : 'h-32'}`}
            onClick={() => navigate('/hydration')}
            style={{ animationDelay: '150ms' }}
          >
            <CardContent className="flex flex-col items-center justify-center h-full p-0">
              <div className={`flex flex-col items-center space-y-2 ${isMobile ? 'p-3' : 'p-4'}`}>
                <div className={`${isMobile ? 'w-12 h-12' : 'w-14 h-14'} bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg enhanced-icon-glow flex-shrink-0`}>
                  <Droplets className={`${isMobile ? 'h-6 w-6' : 'h-7 w-7'} text-white`} />
                </div>
                <div className="text-center flex-shrink-0">
                  <h4 className={`${isMobile ? 'text-sm' : 'text-base'} font-bold text-gray-800 dark:text-gray-100 leading-tight`}>
                    Hydration
                  </h4>
                  <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600 dark:text-gray-400 leading-tight`}>
                    Track water
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Enhanced Supplements Card */}
          <Card 
            className={`enhanced-card supplements-action-card border-0 rounded-3xl overflow-hidden hover:enhanced-hover transition-all duration-300 cursor-pointer ${isMobile ? 'h-28' : 'h-32'}`}
            onClick={() => navigate('/supplements')}
            style={{ animationDelay: '300ms' }}
          >
            <CardContent className="flex flex-col items-center justify-center h-full p-0">
              <div className={`flex flex-col items-center space-y-2 ${isMobile ? 'p-3' : 'p-4'}`}>
                <div className={`${isMobile ? 'w-12 h-12' : 'w-14 h-14'} bg-gradient-to-br from-purple-500 to-violet-500 rounded-2xl flex items-center justify-center shadow-lg enhanced-icon-glow flex-shrink-0`}>
                  <Pill className={`${isMobile ? 'h-6 w-6' : 'h-7 w-7'} text-white`} />
                </div>
                <div className="text-center flex-shrink-0">
                  <h4 className={`${isMobile ? 'text-sm' : 'text-base'} font-bold text-gray-800 dark:text-gray-100 leading-tight`}>
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

      {/* Enhanced Horizontal Scrollable Macro Cards */}
      <div className="enhanced-section space-y-4 sm:space-y-5 mt-10">
        <h3 className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-gray-900 dark:text-white text-center drop-shadow-lg`}>Today's Nutrients</h3>
        <div className="flex space-x-4 sm:space-x-5 overflow-x-auto scroll-cards pb-3">
          {macroCards.map((macro, index) => {
            const percentage = Math.min((macro.current / macro.target) * 100, 100);
            const Icon = macro.icon;
            
            return (
              <Card
                key={macro.name}
                className={`enhanced-card nutrients-card border-0 ${isMobile ? 'min-w-[110px] h-36' : 'min-w-[130px] h-40'} rounded-3xl animate-slide-up flex-shrink-0 hover:enhanced-hover transition-all duration-300`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardContent className="flex flex-col justify-between h-full p-0">
                  <div className={`${isMobile ? 'p-3' : 'p-4'} text-center flex flex-col justify-between h-full`}>
                    <div className="flex-shrink-0">
                      <div className={`${isMobile ? 'w-8 h-8' : 'w-10 h-10'} bg-gradient-to-br ${macro.color} rounded-2xl flex items-center justify-center mx-auto mb-2 enhanced-icon-glow shadow-lg`}>
                        <Icon className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-white`} />
                      </div>
                      <h4 className={`font-bold text-gray-900 dark:text-white mb-1 ${isMobile ? 'text-sm' : 'text-base'} leading-tight`}>{macro.name}</h4>
                    </div>
                    <div className="flex-grow flex flex-col justify-center">
                      <p className={`${isMobile ? 'text-base' : 'text-lg'} font-bold neon-text leading-tight`}>
                        {macro.current.toFixed(0)}{macro.unit}
                      </p>
                      <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-500 dark:text-gray-400 leading-tight`}>
                        of {macro.target}{macro.unit}
                      </p>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2 flex-shrink-0">
                      <div
                        className={`bg-gradient-to-r ${macro.color} h-2 rounded-full transition-all duration-1000 enhanced-progress-bar`}
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

      {/* Enhanced AI Insights Card */}
      <Card className={`enhanced-section enhanced-card ai-insights-card border-0 rounded-3xl animate-slide-up float-animation hover:enhanced-hover transition-all duration-300 ${isMobile ? 'mb-24' : 'mb-36'}`} style={{ animationDelay: '600ms' }}>
        <CardContent className={`${isMobile ? 'p-5' : 'p-6'}`}>
          <div className={`flex items-center ${isMobile ? 'space-x-3' : 'space-x-4'} mb-4 sm:mb-5`}>
            <div className={`${isMobile ? 'w-8 h-8' : 'w-10 h-10'} gradient-primary rounded-full flex items-center justify-center enhanced-icon-glow shadow-lg`}>
              <Zap className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-white`} />
            </div>
            <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-bold text-gray-900 dark:text-white`}>AI Insights</h3>
          </div>
          <div className="space-y-3 sm:space-y-4">
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
              className={`bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white ${isMobile ? 'px-5 py-3 text-sm' : 'px-7 py-4 text-base'} rounded-3xl font-bold shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 enhanced-icon-glow`}
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

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Camera, TrendingUp, Droplets, Pill, Zap, Target, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNutrition } from '@/contexts/NutritionContext';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import CelebrationPopup from '@/components/CelebrationPopup';

const Home = () => {
  const { user } = useAuth();
  const { getTodaysProgress, getHydrationGoal, getSupplementGoal } = useNutrition();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const progress = getTodaysProgress();
  const trackerCardsRef = useRef<HTMLDivElement>(null);

  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationType, setCelebrationType] = useState('');

  const totalCalories = user?.targetCalories || 2000;
  const currentCalories = progress.calories;
  const progressPercentage = Math.min((currentCalories / totalCalories) * 100, 100);

  const hydrationGoal = getHydrationGoal();
  const hydrationPercentage = Math.min((progress.hydration / hydrationGoal) * 100, 100);

  const supplementGoal = getSupplementGoal();
  const supplementPercentage = Math.min((progress.supplements / supplementGoal) * 100, 100);

  // Auto-scroll to tracker cards position when component mounts
  useEffect(() => {
    const scrollToTrackerCards = () => {
      if (trackerCardsRef.current) {
        const element = trackerCardsRef.current;
        const elementTop = element.offsetTop;
        // Adjust offset for mobile/desktop to position tracker cards at top of viewport
        // Increased offset to hide Today's Nutrients section below menu
        const offset = isMobile ? -10 : 10; 
        
        window.scrollTo({
          top: elementTop - offset,
          behavior: 'smooth'
        });
      }
    };

    // Small delay to ensure DOM is fully rendered and layout is calculated
    const timer = setTimeout(scrollToTrackerCards, 150);
    return () => clearTimeout(timer);
  }, [isMobile]);

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
      <div className="text-center space-y-6 sm:space-y-8 py-6 sm:py-8">
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

      {/* Redesigned Daily Tracker Cards with better spacing - TARGET SCROLL POSITION */}
      <div ref={trackerCardsRef} className={`grid grid-cols-3 ${isMobile ? 'gap-3 mx-2' : 'gap-4 mx-4'} animate-scale-in items-stretch`}>
        {/* Vibrant Calories Tracker */}
        <div 
          className={`calories-tracker-vibrant border-0 ${isMobile ? 'h-48 p-3' : 'h-52 p-4'} rounded-3xl hover:scale-105 transition-all duration-500 cursor-pointer group relative overflow-hidden`}
          onClick={() => navigate('/camera')}
          title={getMotivationalMessage(progressPercentage, 'Calories')}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 via-red-500/15 to-pink-500/10 backdrop-blur-xl"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-orange-600/30 via-transparent to-transparent"></div>
          <div className="relative flex flex-col items-center justify-center h-full">
            <div className={`relative ${isMobile ? 'w-24 h-24' : 'w-32 h-32'} flex items-center justify-center mb-3`}>
              <svg className={`${isMobile ? 'w-24 h-24' : 'w-32 h-32'} enhanced-progress-ring`} viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255, 154, 0, 0.2)" strokeWidth="4" />
                <circle
                  cx="60" cy="60" r="50" fill="none" stroke="url(#calorieGradientVibrant)" strokeWidth="6"
                  strokeLinecap="round" strokeDasharray={314} strokeDashoffset={314 - (progressPercentage / 100) * 314}
                  className="transition-all duration-2000 ease-out filter drop-shadow-lg"
                />
                <defs>
                  <linearGradient id="calorieGradientVibrant" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FF6B35" />
                    <stop offset="50%" stopColor="#F7931E" />
                    <stop offset="100%" stopColor="#FF4500" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`${isMobile ? 'text-2xl' : 'text-3xl'} mb-1 group-hover:scale-110 transition-transform filter drop-shadow-md`}>🔥</span>
                <span className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-orange-900 dark:text-white drop-shadow-lg leading-none`}>
                  {Math.round(progressPercentage)}%
                </span>
                {progressPercentage >= 100 && <Sparkles className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} text-orange-200 animate-pulse mt-1`} />}
              </div>
            </div>
            <div className="text-center">
              <p className={`${isMobile ? 'text-sm' : 'text-base'} font-bold text-orange-900 dark:text-white drop-shadow-md mb-1`}>Calories</p>
              <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-orange-800 dark:text-orange-100 drop-shadow-sm`}>
                {currentCalories.toFixed(0)}/{totalCalories}
              </p>
            </div>
          </div>
        </div>

        {/* Vibrant Hydration Tracker */}
        <div 
          className={`hydration-tracker-vibrant border-0 ${isMobile ? 'h-48 p-3' : 'h-52 p-4'} rounded-3xl hover:scale-105 transition-all duration-500 cursor-pointer group relative overflow-hidden`}
          onClick={() => navigate('/hydration')}
          title={getMotivationalMessage(hydrationPercentage, 'Hydration')}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 via-blue-500/15 to-indigo-500/10 backdrop-blur-xl"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-blue-600/30 via-transparent to-transparent"></div>
          <div className="relative flex flex-col items-center justify-center h-full">
            <div className={`relative ${isMobile ? 'w-24 h-24' : 'w-32 h-32'} flex items-center justify-center mb-3`}>
              <svg className={`${isMobile ? 'w-24 h-24' : 'w-32 h-32'} enhanced-progress-ring`} viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(0, 191, 255, 0.2)" strokeWidth="4" />
                <circle
                  cx="60" cy="60" r="50" fill="none" stroke="url(#hydrationGradientVibrant)" strokeWidth="6"
                  strokeLinecap="round" strokeDasharray={314} strokeDashoffset={314 - (hydrationPercentage / 100) * 314}
                  className="transition-all duration-2000 ease-out filter drop-shadow-lg"
                />
                <defs>
                  <linearGradient id="hydrationGradientVibrant" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#00D4FF" />
                    <stop offset="50%" stopColor="#0099CC" />
                    <stop offset="100%" stopColor="#006699" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`${isMobile ? 'text-2xl' : 'text-3xl'} mb-1 group-hover:scale-110 transition-transform filter drop-shadow-md`}>💧</span>
                <span className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-blue-900 dark:text-white drop-shadow-lg leading-none`}>
                  {Math.round(hydrationPercentage)}%
                </span>
                {hydrationPercentage >= 100 && <Sparkles className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} text-cyan-200 animate-pulse mt-1`} />}
              </div>
            </div>
            <div className="text-center">
              <p className={`${isMobile ? 'text-sm' : 'text-base'} font-bold text-blue-900 dark:text-white drop-shadow-md mb-1`}>Hydration</p>
              <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-blue-800 dark:text-cyan-100 drop-shadow-sm`}>
                {progress.hydration}/{hydrationGoal}ml
              </p>
            </div>
          </div>
        </div>

        {/* Vibrant Supplements Tracker */}
        <div 
          className={`supplements-tracker-vibrant border-0 ${isMobile ? 'h-48 p-3' : 'h-52 p-4'} rounded-3xl hover:scale-105 transition-all duration-500 cursor-pointer group relative overflow-hidden`}
          onClick={() => navigate('/supplements')}
          title={getMotivationalMessage(supplementPercentage, 'Supplements')}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 via-violet-500/15 to-pink-500/10 backdrop-blur-xl"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-purple-600/30 via-transparent to-transparent"></div>
          <div className="relative flex flex-col items-center justify-center h-full">
            <div className={`relative ${isMobile ? 'w-24 h-24' : 'w-32 h-32'} flex items-center justify-center mb-3`}>
              <svg className={`${isMobile ? 'w-24 h-24' : 'w-32 h-32'} enhanced-progress-ring`} viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(147, 51, 234, 0.2)" strokeWidth="4" />
                <circle
                  cx="60" cy="60" r="50" fill="none" stroke="url(#supplementGradientVibrant)" strokeWidth="6"
                  strokeLinecap="round" strokeDasharray={314} strokeDashoffset={314 - (supplementPercentage / 100) * 314}
                  className="transition-all duration-2000 ease-out filter drop-shadow-lg"
                />
                <defs>
                  <linearGradient id="supplementGradientVibrant" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#DA44BB" />
                    <stop offset="50%" stopColor="#9333EA" />
                    <stop offset="100%" stopColor="#7C3AED" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`${isMobile ? 'text-2xl' : 'text-3xl'} mb-1 group-hover:scale-110 transition-transform filter drop-shadow-md`}>💊</span>
                <span className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-purple-900 dark:text-white drop-shadow-lg leading-none`}>
                  {Math.round(supplementPercentage)}%
                </span>
                {supplementPercentage >= 100 && <Sparkles className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} text-purple-200 animate-pulse mt-1`} />}
              </div>
            </div>
            <div className="text-center">
              <p className={`${isMobile ? 'text-sm' : 'text-base'} font-bold text-purple-900 dark:text-white drop-shadow-md mb-1`}>Supplements</p>
              <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-purple-800 dark:text-purple-100 drop-shadow-sm`}>
                {progress.supplements}/{supplementGoal}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Logging Actions Section with proper spacing */}
      <div className="space-y-6 sm:space-y-8 px-2 sm:px-4">
        {/* Primary Action: Log Food - Full Width */}
        <Card 
          className="modern-action-card log-food-card border-0 rounded-3xl overflow-hidden hover:scale-[1.02] transition-all duration-500 cursor-pointer shadow-xl hover:shadow-2xl"
          onClick={() => navigate('/camera')}
        >
          <CardContent className={`${isMobile ? 'p-6' : 'p-8'} text-center`}>
            <div className="flex flex-col items-center space-y-4">
              <div className={`${isMobile ? 'w-16 h-16' : 'w-20 h-20'} bg-gradient-to-br from-blue-500 to-sky-500 rounded-3xl flex items-center justify-center shadow-2xl log-food-glow`}>
                <Camera className={`${isMobile ? 'h-8 w-8' : 'h-10 w-10'} text-white`} />
              </div>
              <div className="space-y-2">
                <h3 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-gray-800 dark:text-gray-100`}>
                  Log Food
                </h3>
                <p className={`${isMobile ? 'text-sm' : 'text-base'} text-gray-600 dark:text-gray-400`}>
                  Take photo to log meals
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Secondary Actions: Hydration & Supplements */}
        <div className={`grid grid-cols-2 ${isMobile ? 'gap-4' : 'gap-6'} items-stretch`}>
          {/* Enhanced Hydration Action Card */}
          <Card 
            className={`modern-action-card hydration-action-card border-0 rounded-3xl overflow-hidden hover:scale-105 transition-all duration-500 cursor-pointer ${isMobile ? 'h-36' : 'h-40'} shadow-lg hover:shadow-xl`}
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
                    Track water intake
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Enhanced Supplements Action Card */}
          <Card 
            className={`modern-action-card supplements-action-card border-0 rounded-3xl overflow-hidden hover:scale-105 transition-all duration-500 cursor-pointer ${isMobile ? 'h-36' : 'h-40'} shadow-lg hover:shadow-xl`}
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
                    Log vitamins & minerals
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Today's Nutrients Section with equal width cards */}
      <div className="space-y-6 sm:space-y-8 px-2 sm:px-4">
        <h3 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-gray-900 dark:text-white text-center`}>Today's Nutrients</h3>
        <div className="flex space-x-3 sm:space-x-4 overflow-x-auto scroll-cards pb-4">
          {macroCards.map((macro, index) => {
            const percentage = Math.min((macro.current / macro.target) * 100, 100);
            const Icon = macro.icon;
            
            return (
              <Card
                key={macro.name}
                className={`modern-nutrient-card nutrients-card border-0 ${isMobile ? 'w-32 h-44' : 'w-36 h-48'} rounded-3xl animate-slide-up flex-shrink-0 hover:scale-105 transition-all duration-500 shadow-lg hover:shadow-xl`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardContent className="flex flex-col justify-between h-full p-0">
                  <div className={`${isMobile ? 'p-4 pb-5' : 'p-5 pb-6'} text-center flex flex-col justify-between h-full`}>
                    <div className="flex-shrink-0">
                      <div className={`${isMobile ? 'w-10 h-10' : 'w-12 h-12'} bg-gradient-to-br ${macro.color} rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg`}>
                        <Icon className={`${isMobile ? 'h-5 w-5' : 'h-6 w-6'} text-white`} />
                      </div>
                      <h4 className={`font-bold text-gray-900 dark:text-white mb-2 ${isMobile ? 'text-sm' : 'text-base'} leading-tight`}>{macro.name}</h4>
                    </div>
                    <div className="flex-grow flex flex-col justify-center space-y-2">
                      <p className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold neon-text leading-tight`}>
                        {macro.current.toFixed(0)}{macro.unit}
                      </p>
                      <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-500 dark:text-gray-400 leading-tight`}>
                        of {macro.target}{macro.unit}
                      </p>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-4 flex-shrink-0">
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

      {/* Compact AI Insights Card */}
      <Card className={`modern-action-card ai-insights-card border-0 rounded-3xl animate-slide-up float-animation hover:scale-[1.02] transition-all duration-500 shadow-xl hover:shadow-2xl mx-2 sm:mx-4`} style={{ animationDelay: '600ms' }}>
        <CardContent className={`${isMobile ? 'p-6' : 'p-8'}`}>
          <div className={`flex items-center ${isMobile ? 'space-x-3' : 'space-x-4'} mb-4 sm:mb-6`}>
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

      {/* Extra bottom padding to ensure menu is always visible */}
      <div className={`${isMobile ? 'pb-24' : 'pb-32'}`}></div>
    </div>
  );
};

export default Home;

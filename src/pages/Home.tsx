import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Camera, TrendingUp, Droplets, Pill, Zap, Target, Sparkles, ChevronDown, ChevronUp, Clock, MoreHorizontal } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNutrition } from '@/contexts/NutritionContext';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useScrollToTop } from '@/hooks/useScrollToTop';
import CelebrationPopup from '@/components/CelebrationPopup';
import FoodConfirmationCard from '@/components/FoodConfirmationCard';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';

// Utility function to get current user preferences from localStorage
const loadUserPreferences = () => {
  try {
    const stored = localStorage.getItem('user_preferences');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Error loading user preferences:', e);
  }
  return {
    selectedTrackers: ['calories', 'hydration', 'supplements'],
  };
};

const Home = () => {
  const { user } = useAuth();
  const { getTodaysProgress, getHydrationGoal, getSupplementGoal, addFood } = useNutrition();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const progress = getTodaysProgress();
  const { toast } = useToast();
  
  // Use the scroll-to-top hook
  useScrollToTop();

  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationType, setCelebrationType] = useState('');
  const [preferences, setPreferences] = useState(loadUserPreferences());
  const [isQuickLogExpanded, setIsQuickLogExpanded] = useState(false);
  
  // Add confirmation card state
  const [showConfirmationCard, setShowConfirmationCard] = useState(false);
  const [selectedFood, setSelectedFood] = useState(null);

  // Listen for changes to localStorage preferences
  useEffect(() => {
    const handleStorageChange = () => {
      const newPreferences = loadUserPreferences();
      setPreferences(newPreferences);
    };

    window.addEventListener('storage', handleStorageChange);
    
    const interval = setInterval(() => {
      const newPreferences = loadUserPreferences();
      if (JSON.stringify(newPreferences) !== JSON.stringify(preferences)) {
        setPreferences(newPreferences);
      }
    }, 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [preferences]);

  // Update preferences when user state changes
  useEffect(() => {
    if (user?.selectedTrackers) {
      setPreferences({ selectedTrackers: user.selectedTrackers });
    }
  }, [user?.selectedTrackers]);

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

  // Use preferences from localStorage/state instead of user object
  const selectedTrackers = preferences.selectedTrackers || ['calories', 'hydration', 'supplements'];

  const allTrackerConfigs = {
    calories: {
      name: 'Calories',
      current: progress.calories,
      target: totalCalories,
      unit: '',
      color: 'from-orange-500/20 via-red-500/15 to-pink-500/10',
      gradient: 'calorieGradientVibrant',
      emoji: '🔥',
      textColor: 'text-orange-900 dark:text-white',
      textColorSecondary: 'text-orange-800 dark:text-orange-100',
      percentage: progressPercentage,
      shadow: 'shadow-[0_0_20px_rgba(255,69,0,0.4)] hover:shadow-[0_0_30px_rgba(255,69,0,0.6)]',
      onClick: () => navigate('/camera'),
    },
    protein: {
      name: 'Protein',
      current: progress.protein,
      target: user?.targetProtein || 150,
      unit: 'g',
      color: 'from-blue-500/20 via-indigo-500/15 to-purple-500/10',
      gradient: 'proteinGradientVibrant',
      emoji: '💪',
      textColor: 'text-blue-900 dark:text-white',
      textColorSecondary: 'text-blue-800 dark:text-blue-100',
      percentage: Math.min((progress.protein / (user?.targetProtein || 150)) * 100, 100),
      shadow: 'shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:shadow-[0_0_30px_rgba(59,130,246,0.6)]',
      onClick: () => navigate('/camera'),
    },
    carbs: {
      name: 'Carbs',
      current: progress.carbs,
      target: user?.targetCarbs || 200,
      unit: 'g',
      color: 'from-yellow-500/20 via-orange-500/15 to-red-500/10',
      gradient: 'carbsGradientVibrant',
      emoji: '🍞',
      textColor: 'text-yellow-900 dark:text-white',
      textColorSecondary: 'text-yellow-800 dark:text-yellow-100',
      percentage: Math.min((progress.carbs / (user?.targetCarbs || 200)) * 100, 100),
      shadow: 'shadow-[0_0_20px_rgba(251,191,36,0.4)] hover:shadow-[0_0_30px_rgba(251,191,36,0.6)]',
      onClick: () => navigate('/camera'),
    },
    fat: {
      name: 'Fat',
      current: progress.fat,
      target: user?.targetFat || 65,
      unit: 'g',
      color: 'from-green-500/20 via-emerald-500/15 to-teal-500/10',
      gradient: 'fatGradientVibrant',
      emoji: '🥑',
      textColor: 'text-green-900 dark:text-white',
      textColorSecondary: 'text-green-800 dark:text-green-100',
      percentage: Math.min((progress.fat / (user?.targetFat || 65)) * 100, 100),
      shadow: 'shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:shadow-[0_0_30px_rgba(16,185,129,0.6)]',
      onClick: () => navigate('/camera'),
    },
    hydration: {
      name: 'Hydration',
      current: progress.hydration,
      target: hydrationGoal,
      unit: 'ml',
      color: 'from-cyan-500/20 via-blue-500/15 to-indigo-500/10',
      gradient: 'hydrationGradientVibrant',
      emoji: '💧',
      textColor: 'text-blue-900 dark:text-white',
      textColorSecondary: 'text-blue-800 dark:text-cyan-100',
      percentage: hydrationPercentage,
      shadow: 'shadow-[0_0_20px_rgba(0,212,255,0.4)] hover:shadow-[0_0_30px_rgba(0,212,255,0.6)]',
      onClick: () => navigate('/hydration'),
    },
    supplements: {
      name: 'Supplements',
      current: progress.supplements,
      target: supplementGoal,
      unit: '',
      color: 'from-purple-500/20 via-violet-500/15 to-pink-500/10',
      gradient: 'supplementGradientVibrant',
      emoji: '💊',
      textColor: 'text-purple-900 dark:text-white',
      textColorSecondary: 'text-purple-800 dark:text-purple-100',
      percentage: supplementPercentage,
      shadow: 'shadow-[0_0_20px_rgba(218,68,187,0.4)] hover:shadow-[0_0_30px_rgba(218,68,187,0.6)]',
      onClick: () => navigate('/supplements'),
    },
  };

  // Get the three selected tracker configs
  const displayedTrackers = selectedTrackers.map(trackerId => allTrackerConfigs[trackerId]).filter(Boolean);

  const getMotivationalMessage = (percentage: number, type: string) => {
    if (percentage >= 100) return `${type} goal crushed! Amazing! 🎉`;
    if (percentage >= 80) return `Almost there! Just ${100 - Math.round(percentage)}% to go! 💪`;
    if (percentage >= 50) return `Great progress! Keep it up! 🔥`;
    if (percentage >= 25) return `Good start! You've got this! ⭐`;
    return `Let's get started with your ${type.toLowerCase()} today! 🚀`;
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

  // Mock data for Smart Quick-Log (placeholder for future AI integration)
  const quickLogSuggestions = [
    { id: 1, name: 'Greek Yogurt', usualTime: '8:30 AM', calories: 150, protein: 15, carbs: 12, fat: 0, fiber: 0, sugar: 12, sodium: 50 },
    { id: 2, name: 'Chicken Salad', usualTime: '12:45 PM', calories: 420, protein: 35, carbs: 8, fat: 28, fiber: 3, sugar: 5, sodium: 890 },
    { id: 3, name: 'Protein Shake', usualTime: '6:00 PM', calories: 280, protein: 25, carbs: 15, fat: 12, fiber: 2, sugar: 8, sodium: 120 },
  ];

  const recentLogs = [
    { id: 4, name: 'Oatmeal with Berries', usualTime: '7:15 AM', calories: 320, protein: 8, carbs: 65, fat: 4, fiber: 8, sugar: 12, sodium: 5 },
    { id: 5, name: 'Turkey Sandwich', usualTime: '1:00 PM', calories: 380, protein: 28, carbs: 42, fat: 12, fiber: 4, sugar: 6, sodium: 1200 },
    { id: 6, name: 'Apple', usualTime: '3:30 PM', calories: 95, protein: 0, carbs: 25, fat: 0, fiber: 4, sugar: 19, sodium: 2 },
    { id: 7, name: 'Grilled Salmon', usualTime: '7:30 PM', calories: 450, protein: 40, carbs: 2, fat: 32, fiber: 0, sugar: 0, sodium: 380 },
    { id: 8, name: 'Almonds', usualTime: '10:00 AM', calories: 160, protein: 6, carbs: 6, fat: 14, fiber: 3, sugar: 1, sodium: 0 },
    { id: 9, name: 'Green Tea', usualTime: '4:00 PM', calories: 5, protein: 0, carbs: 1, fat: 0, fiber: 0, sugar: 0, sodium: 2 },
    { id: 10, name: 'Dark Chocolate', usualTime: '9:00 PM', calories: 70, protein: 1, carbs: 8, fat: 4, fiber: 1, sugar: 6, sodium: 2 },
  ];

  const handleQuickLog = (foodItem: typeof quickLogSuggestions[0]) => {
    console.log('Quick logging:', foodItem);
    
    // Show confirmation card for all food selections
    setSelectedFood({
      name: foodItem.name,
      calories: foodItem.calories,
      protein: foodItem.protein,
      carbs: foodItem.carbs,
      fat: foodItem.fat,
      fiber: foodItem.fiber,
      sugar: foodItem.sugar,
      sodium: foodItem.sodium,
    });
    setShowConfirmationCard(true);
  };

  const handleConfirmFood = (confirmedFood) => {
    // Add the confirmed food to nutrition context
    addFood({
      name: confirmedFood.name,
      calories: confirmedFood.calories,
      protein: confirmedFood.protein,
      carbs: confirmedFood.carbs,
      fat: confirmedFood.fat,
      fiber: confirmedFood.fiber,
      sugar: confirmedFood.sugar,
      sodium: confirmedFood.sodium,
    });

    // Reset selected food
    setSelectedFood(null);
  };

  return (
    <div className="space-y-12 sm:space-y-16 animate-fade-in">
      {/* Celebration Popup */}
      <CelebrationPopup 
        show={showCelebration} 
        message={celebrationType}
        onClose={() => setShowCelebration(false)}
      />

      {/* Food Confirmation Card */}
      <FoodConfirmationCard
        isOpen={showConfirmationCard}
        onClose={() => {
          setShowConfirmationCard(false);
          setSelectedFood(null);
        }}
        onConfirm={handleConfirmFood}
        foodItem={selectedFood}
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

      {/* Dynamic Tracker Cards based on user selection */}
      <div className={`grid grid-cols-3 ${isMobile ? 'gap-3 mx-2' : 'gap-4 mx-4'} animate-scale-in items-stretch relative z-10`}>
        {displayedTrackers.map((tracker, index) => (
          <div 
            key={tracker.name}
            className={`border-0 ${isMobile ? 'h-48 p-3' : 'h-52 p-4'} rounded-3xl hover:scale-105 transition-all duration-500 cursor-pointer group relative overflow-hidden ${tracker.shadow} z-20`}
            onClick={tracker.onClick}
            title={getMotivationalMessage(tracker.percentage, tracker.name)}
            style={{ 
              background: `linear-gradient(135deg, ${tracker.color.replace('from-', '').replace('via-', '').replace('to-', '').split(' ').join(', ')})`,
              position: 'relative',
              zIndex: 20
            }}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${tracker.color} backdrop-blur-sm`} style={{ zIndex: 1 }}></div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" style={{ zIndex: 2 }}></div>
            <div className="relative flex flex-col items-center justify-center h-full" style={{ zIndex: 10 }}>
              <div className={`relative ${isMobile ? 'w-24 h-24' : 'w-32 h-32'} flex items-center justify-center mb-3`}>
                <svg className={`${isMobile ? 'w-24 h-24' : 'w-32 h-32'} enhanced-progress-ring`} viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255, 255, 255, 0.2)" strokeWidth="4" />
                  <circle
                    cx="60" cy="60" r="50" fill="none" stroke={`url(#${tracker.gradient})`} strokeWidth="6"
                    strokeLinecap="round" strokeDasharray={314} strokeDashoffset={314 - (tracker.percentage / 100) * 314}
                    className="transition-all duration-2000 ease-out filter drop-shadow-lg"
                  />
                  <defs>
                    <linearGradient id={tracker.gradient} x1="0%" y1="0%" x2="100%" y2="100%">
                      {tracker.name === 'Calories' && (
                        <>
                          <stop offset="0%" stopColor="#FF6B35" />
                          <stop offset="50%" stopColor="#F7931E" />
                          <stop offset="100%" stopColor="#FF4500" />
                        </>
                      )}
                      {tracker.name === 'Protein' && (
                        <>
                          <stop offset="0%" stopColor="#3B82F6" />
                          <stop offset="50%" stopColor="#1E40AF" />
                          <stop offset="100%" stopColor="#1E3A8A" />
                        </>
                      )}
                      {tracker.name === 'Carbs' && (
                        <>
                          <stop offset="0%" stopColor="#FBBF24" />
                          <stop offset="50%" stopColor="#F59E0B" />
                          <stop offset="100%" stopColor="#D97706" />
                        </>
                      )}
                      {tracker.name === 'Fat' && (
                        <>
                          <stop offset="0%" stopColor="#10B981" />
                          <stop offset="50%" stopColor="#059669" />
                          <stop offset="100%" stopColor="#047857" />
                        </>
                      )}
                      {tracker.name === 'Hydration' && (
                        <>
                          <stop offset="0%" stopColor="#00D4FF" />
                          <stop offset="50%" stopColor="#0099CC" />
                          <stop offset="100%" stopColor="#006699" />
                        </>
                      )}
                      {tracker.name === 'Supplements' && (
                        <>
                          <stop offset="0%" stopColor="#DA44BB" />
                          <stop offset="50%" stopColor="#9333EA" />
                          <stop offset="100%" stopColor="#7C3AED" />
                        </>
                      )}
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`${isMobile ? 'text-2xl' : 'text-3xl'} mb-1 group-hover:scale-110 transition-transform filter drop-shadow-md`}>{tracker.emoji}</span>
                  <span className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold ${tracker.textColor} drop-shadow-lg leading-none`}>
                    {Math.round(tracker.percentage)}%
                  </span>
                  {tracker.percentage >= 100 && <Sparkles className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} text-white animate-pulse mt-1`} />}
                </div>
              </div>
              <div className="text-center">
                <p className={`${isMobile ? 'text-sm' : 'text-base'} font-bold ${tracker.textColor} drop-shadow-md mb-1`}>{tracker.name}</p>
                <p className={`${isMobile ? 'text-xs' : 'text-sm'} ${tracker.textColorSecondary} drop-shadow-sm`}>
                  {tracker.current.toFixed(0)}{tracker.unit}/{tracker.target}{tracker.unit}
                </p>
              </div>
            </div>
          </div>
        ))}
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
                  Take photo or speak to log
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Smart Quick-Log Dropdown Section - Same width as Log Food button */}
        <Collapsible open={isQuickLogExpanded} onOpenChange={setIsQuickLogExpanded}>
          <Card className="border-0 rounded-3xl overflow-hidden bg-gray-50/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-500">
            <CardContent className={`${isMobile ? 'p-4' : 'p-6'}`}>
              {/* AI Quick Predictions Area - Collapsed State */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-blue-500 rounded-full flex items-center justify-center">
                      <Zap className="h-4 w-4 text-white" />
                    </div>
                    <h4 className={`${isMobile ? 'text-sm' : 'text-base'} font-semibold text-gray-800 dark:text-gray-200`}>
                      AI Quick Predictions
                    </h4>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center space-x-1">
                    <Clock className="h-3 w-3" />
                    <span>Smart suggestions</span>
                  </div>
                </div>

                {/* Quick Suggestions - Full width clickable blocks */}
                <div className={`grid grid-cols-1 ${isMobile ? 'gap-2' : 'gap-3'}`}>
                  {quickLogSuggestions.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleQuickLog(item)}
                      className={`${isMobile ? 'p-4' : 'p-5'} bg-white dark:bg-gray-700 rounded-2xl border border-gray-200 dark:border-gray-600 hover:border-emerald-300 dark:hover:border-emerald-500 cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-md group w-full`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="text-3xl">🍽️</div>
                          <div className="flex-1">
                            <p className={`${isMobile ? 'text-sm' : 'text-base'} font-medium text-gray-900 dark:text-gray-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors`}>
                              {item.name}
                            </p>
                            <div className="flex items-center space-x-3 mt-1">
                              <div className="flex items-center space-x-1">
                                <span className="text-xs">🕒</span>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {item.usualTime}
                                </p>
                              </div>
                              <p className="text-xs text-gray-600 dark:text-gray-300 font-medium">
                                {item.calories} cal
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="text-emerald-500 group-hover:scale-110 transition-transform">
                          <span className="text-sm font-medium">Tap to log</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Increased spacing before expand toggle */}
                <div className="pt-4">
                  <CollapsibleTrigger asChild>
                    <div className="flex justify-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                      >
                        {isQuickLogExpanded ? (
                          <>
                            <ChevronUp className="h-4 w-4 mr-1" />
                            Show less
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-4 w-4 mr-1" />
                            Show more
                          </>
                        )}
                      </Button>
                    </div>
                  </CollapsibleTrigger>
                </div>
              </div>

              {/* Expanded Content */}
              <CollapsibleContent className="mt-4">
                <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-gray-600">
                  <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Recent & Saved Logs
                  </h5>
                  <div className="space-y-2">
                    {recentLogs.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => handleQuickLog(item)}
                        className="flex items-center justify-between p-4 bg-white dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-emerald-300 dark:hover:border-emerald-500 transition-all duration-300 cursor-pointer hover:scale-[1.02] hover:shadow-md group w-full"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="text-2xl">🍽️</div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                              {item.name}
                            </p>
                            <div className="flex items-center space-x-3 mt-1">
                              <div className="flex items-center space-x-1">
                                <span className="text-xs">🕒</span>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  Usually {item.usualTime}
                                </p>
                              </div>
                              <p className="text-xs text-gray-600 dark:text-gray-300">
                                {item.calories} cal
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="text-emerald-500 group-hover:scale-110 transition-transform">
                          <span className="text-xs font-medium">Tap to log</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CollapsibleContent>
            </CardContent>
          </Card>
        </Collapsible>

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
                  <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600 dark:text-purple-100 leading-tight`}>
                    Log vitamins & minerals
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Today's Nutrients Section with improved card alignment */}
      <div className="space-y-6 sm:space-y-8 px-2 sm:px-4">
        <h3 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-gray-900 dark:text-white text-center`}>Today's Nutrients</h3>
        <div className="flex justify-center">
          <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 ${isMobile ? 'gap-3 max-w-sm' : 'gap-4 max-w-4xl'} w-full`}>
            {macroCards.map((macro, index) => {
              const percentage = Math.min((macro.current / macro.target) * 100, 100);
              const Icon = macro.icon;
              
              return (
                <Card
                  key={macro.name}
                  className={`modern-nutrient-card nutrients-card border-0 ${isMobile ? 'h-40' : 'h-44'} rounded-3xl animate-slide-up hover:scale-105 transition-all duration-500 shadow-lg hover:shadow-xl w-full`}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <CardContent className="flex flex-col justify-between h-full p-0">
                    <div className={`${isMobile ? 'p-3' : 'p-4'} text-center flex flex-col justify-between h-full`}>
                      <div className="flex-shrink-0">
                        <div className={`${isMobile ? 'w-8 h-8' : 'w-10 h-10'} bg-gradient-to-br ${macro.color} rounded-2xl flex items-center justify-center mx-auto mb-2 shadow-lg`}>
                          <Icon className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-white`} />
                        </div>
                        <h4 className={`font-bold text-gray-900 dark:text-white mb-2 ${isMobile ? 'text-xs' : 'text-sm'} leading-tight`}>{macro.name}</h4>
                      </div>
                      <div className="flex-grow flex flex-col justify-center space-y-1">
                        <p className={`${isMobile ? 'text-base' : 'text-lg'} font-bold neon-text leading-tight`}>
                          {macro.current.toFixed(0)}{macro.unit}
                        </p>
                        <p className={`${isMobile ? 'text-xs' : 'text-xs'} text-gray-500 dark:text-gray-400 leading-tight`}>
                          of {macro.target}{macro.unit}
                        </p>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-2 flex-shrink-0">
                        <div
                          className={`bg-gradient-to-r ${macro.color} h-1.5 rounded-full transition-all duration-1500 shadow-sm`}
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

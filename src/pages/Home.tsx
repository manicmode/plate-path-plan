import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Camera, TrendingUp, Droplets, Pill, Zap, Target, Sparkles, ChevronDown, ChevronUp, Clock, MoreHorizontal, RefreshCw, Plus, Activity, Timer, Footprints, Dumbbell } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNutrition } from '@/contexts/NutritionContext';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useScrollToTop } from '@/hooks/useScrollToTop';
import { useLoadingTimeout } from '@/hooks/useLoadingTimeout';
import CelebrationPopup from '@/components/CelebrationPopup';
import FoodConfirmationCard from '@/components/FoodConfirmationCard';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import HomeAIInsights from '@/components/HomeAIInsights';
import { safeStorage, safeGetJSON, safeSetJSON } from '@/lib/safeStorage';
import { ExerciseLogForm, ExerciseData } from '@/components/ExerciseLogForm';
import { ExerciseReminderForm } from '@/components/ExerciseReminderForm';

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
  const { user, loading: authLoading } = useAuth();
  const { getTodaysProgress, getHydrationGoal, getSupplementGoal, addFood } = useNutrition();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const progress = getTodaysProgress();
  const { toast } = useToast();
  
  // Use the scroll-to-top hook
  useScrollToTop();

  // Loading timeout with recovery
  const { hasTimedOut, showRecovery, retry } = useLoadingTimeout(authLoading, {
    timeoutMs: 10000,
    onTimeout: () => {
      console.warn('Home page loading timeout - showing recovery options');
      toast({
        title: "Loading taking longer than expected",
        description: "Tap to retry or refresh the page",
        variant: "destructive",
      });
    },
  });

  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationType, setCelebrationType] = useState('');
  const [preferences, setPreferences] = useState(loadUserPreferences());
  const [isQuickLogExpanded, setIsQuickLogExpanded] = useState(false);
  
  // Add confirmation card state
  const [showConfirmationCard, setShowConfirmationCard] = useState(false);
  const [selectedFood, setSelectedFood] = useState(null);
  
  // Exercise tracking state
  const [showExerciseForm, setShowExerciseForm] = useState(false);
  const [showExerciseReminder, setShowExerciseReminder] = useState(false);
  const [todaysExercise, setTodaysExercise] = useState({ calories: 0, duration: 0 });
  const [todaysSteps, setTodaysSteps] = useState(3731); // Mock data - will be replaced with real data later

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

  // Helper function to check if celebration was already shown today
  const getCelebrationKey = (type: string) => {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const userId = user?.id || 'guest';
    return `celebration_${type}_${userId}_${today}`;
  };

  const hasShownCelebrationToday = (type: string) => {
    const key = getCelebrationKey(type);
    return safeGetJSON(key, false);
  };

  const markCelebrationShown = (type: string) => {
    const key = getCelebrationKey(type);
    safeSetJSON(key, true);
  };

  // Check for goal completion and trigger celebration (only once per day per goal)
  useEffect(() => {
    if (progressPercentage >= 100 && progressPercentage < 105 && !hasShownCelebrationToday('calories')) {
      setCelebrationType('Calories Goal Smashed! 🔥');
      setShowCelebration(true);
      markCelebrationShown('calories');
    } else if (hydrationPercentage >= 100 && hydrationPercentage < 105 && !hasShownCelebrationToday('hydration')) {
      setCelebrationType('Hydration Goal Achieved! 💧');
      setShowCelebration(true);
      markCelebrationShown('hydration');
    } else if (supplementPercentage >= 100 && supplementPercentage < 105 && !hasShownCelebrationToday('supplements')) {
      setCelebrationType('Supplements Complete! 💊');
      setShowCelebration(true);
      markCelebrationShown('supplements');
    }
  }, [progressPercentage, hydrationPercentage, supplementPercentage, user?.id]);

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

  const handleExerciseLog = (exerciseData: ExerciseData) => {
    setTodaysExercise(prev => ({
      calories: prev.calories + exerciseData.caloriesBurned,
      duration: prev.duration + exerciseData.duration,
    }));
  };

  // Calculate net calories (goal - food intake + burned calories)
  const netCalories = totalCalories - currentCalories + todaysExercise.calories;
  const stepsGoal = 10000;
  const stepsPercentage = Math.min((todaysSteps / stepsGoal) * 100, 100);

  // Emergency recovery handler
  const handleEmergencyRecovery = () => {
    console.log('Emergency recovery triggered');
    retry();
    // Force a page refresh as last resort
    setTimeout(() => {
      if (authLoading) {
        window.location.reload();
      }
    }, 5000);
  };

  // Show loading state with recovery options
  if (authLoading && !hasTimedOut) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // Show recovery options if loading has timed out
  if (authLoading && hasTimedOut && showRecovery) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <RefreshCw className="h-12 w-12 text-muted-foreground mx-auto" />
          <h2 className="text-xl font-semibold text-foreground">Taking longer than usual</h2>
          <p className="text-muted-foreground">
            The app seems to be taking longer to load than expected.
          </p>
          <div className="space-y-2">
            <Button onClick={handleEmergencyRecovery} className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()} 
              className="w-full"
            >
              Refresh Page
            </Button>
          </div>
        </div>
      </div>
    );
  }

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

      {/* Exercise Log Form */}
      <ExerciseLogForm
        isOpen={showExerciseForm}
        onClose={() => setShowExerciseForm(false)}
        onSubmit={handleExerciseLog}
      />

      {/* Exercise Reminder Form */}
      <ExerciseReminderForm
        isOpen={showExerciseReminder}
        onClose={() => setShowExerciseReminder(false)}
      />

      {/* Enhanced Greeting Section */}
      <div className="text-center space-y-6 sm:space-y-8 py-6 sm:py-8">
        <div className="inline-block">
          <h1 className={`${isMobile ? 'text-3xl' : 'text-5xl'} font-bold bg-gradient-to-r from-gray-900 via-emerald-600 to-blue-600 dark:from-gray-100 dark:via-emerald-400 dark:to-blue-400 bg-clip-text text-transparent mb-4`}>
            {isMobile ? "Let's optimize your day," : "Let's optimize your day,"}
          </h1>
          <p className={`${isMobile ? 'text-lg' : 'text-xl'} text-gray-600 dark:text-gray-300`}>
            {user?.name || 'Friend'} 👋
          </p>
        </div>
      </div>

      {/* Enhanced Main Tracking Action Cards */}
      <div className="space-y-8 sm:space-y-12">
        {/* Grid for selected trackers */}
        <div className={`grid ${isMobile ? 'grid-cols-1 gap-4' : 'lg:grid-cols-3 grid-cols-2 gap-6 lg:gap-8'} items-stretch`}>
          {displayedTrackers.map((tracker, index) => (
            <Card
              key={tracker.name}
              onClick={tracker.onClick}
              className={`tracker-card modern-action-card border-0 rounded-3xl overflow-hidden cursor-pointer transition-all duration-500 shadow-lg hover:shadow-xl ${tracker.shadow} animate-slide-up ${isMobile ? 'h-48' : 'h-52'}`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardContent className="flex flex-col justify-between h-full p-0">
                <div className="bg-gradient-to-br from-background/95 to-background/80 backdrop-blur-sm flex flex-col justify-between h-full">
                  <div className={`${isMobile ? 'p-5' : 'p-6'} text-center flex flex-col justify-between h-full`}>
                    <div className="flex-shrink-0 text-center">
                      <div className={`${isMobile ? 'w-16 h-16' : 'w-20 h-20'} bg-gradient-to-br ${tracker.color} rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg tracker-icon-glow`}>
                        <span className={`${isMobile ? 'text-3xl' : 'text-4xl'}`}>{tracker.emoji}</span>
                      </div>
                      <h4 className={`font-bold mb-2 ${isMobile ? 'text-lg' : 'text-xl'} ${tracker.textColor} leading-tight`}>
                        {tracker.name}
                      </h4>
                    </div>
                    <div className="flex-grow flex flex-col justify-center space-y-3">
                      <p className={`${isMobile ? 'text-3xl' : 'text-4xl'} font-bold neon-text leading-tight`}>
                        {tracker.current.toFixed(0)}{tracker.unit}
                      </p>
                      <p className={`${isMobile ? 'text-sm' : 'text-base'} ${tracker.textColorSecondary} leading-tight`}>
                        of {tracker.target}{tracker.unit}
                      </p>
                      <p className={`${isMobile ? 'text-xs' : 'text-sm'} ${tracker.textColorSecondary} opacity-80 leading-tight`}>
                        {getMotivationalMessage(tracker.percentage, tracker.name)}
                      </p>
                    </div>
                    {/* Positioned slider with proper spacing */}
                    <div className="w-full bg-white/20 dark:bg-gray-800/30 rounded-full h-2 mt-4 flex-shrink-0">
                      <div
                        className={`${tracker.gradient} h-2 rounded-full transition-all duration-1500 glow-effect`}
                        style={{ width: `${Math.min(tracker.percentage, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Smart Quick-Log Section */}
        <Collapsible open={isQuickLogExpanded} onOpenChange={setIsQuickLogExpanded}>
          <Card className={`modern-action-card overflow-hidden border-0 rounded-3xl shadow-lg ${isMobile ? 'mx-2' : 'mx-4'}`}>
            <CardContent className={`${isMobile ? 'p-4' : 'p-6'}`}>
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`${isMobile ? 'w-12 h-12' : 'w-14 h-14'} bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg`}>
                      <Sparkles className={`${isMobile ? 'h-6 w-6' : 'h-7 w-7'} text-white`} />
                    </div>
                    <div className="text-left">
                      <h4 className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-gray-800 dark:text-gray-100`}>
                        Smart Quick-Log
                      </h4>
                      <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600 dark:text-gray-400`}>
                        Tap to log frequent foods instantly
                      </p>
                    </div>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/camera')}
                    className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white border-0 rounded-xl px-4 py-2 shadow-lg transition-all duration-300 hover:scale-105"
                  >
                    <Camera className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} mr-2`} />
                    {isMobile ? 'Scan' : 'Scan Food'}
                  </Button>
                </div>

                {/* Quick suggestions grid - Always visible */}
                <div className={`grid ${isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-3 gap-4'}`}>
                  {quickLogSuggestions.map((item) => (
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

        {/* Activity Section - Mobile Optimized */}
        <div className="space-y-4">
          {/* Enhanced Net Calorie Card - Moved to Top */}
          <Card 
            className={`modern-action-card border-0 rounded-3xl overflow-hidden hover:scale-[1.02] transition-all duration-500 shadow-lg hover:shadow-xl h-56`}
          >
            <CardContent className={`${isMobile ? 'p-5' : 'p-6'} relative h-full flex flex-col`}>
              {/* Action Buttons - Upper Right Corner */}
              <div className="absolute top-4 right-4 flex flex-col gap-2">
                <button
                  onClick={() => setShowExerciseForm(true)}
                  className="px-3 py-1.5 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white text-xs rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  <Dumbbell className="w-3 h-3 mr-1 inline" />
                  Log Workout
                </button>
                <button
                  onClick={() => setShowExerciseReminder(true)}
                  className="px-3 py-1.5 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white text-xs rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  <Clock className="w-3 h-3 mr-1 inline" />
                  Log Exercise Reminder
                </button>
              </div>

              {/* Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className={`${isMobile ? 'w-12 h-12' : 'w-14 h-14'} bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg`}>
                  <Target className={`${isMobile ? 'w-6 h-6' : 'w-7 h-7'} text-white`} />
                </div>
                <div>
                  <h3 className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-gray-800 dark:text-gray-100`}>
                    Net Calories
                  </h3>
                  <p className={`${isMobile ? 'text-sm' : 'text-base'} text-gray-600 dark:text-gray-400`}>
                    Daily Balance
                  </p>
                </div>
              </div>

              {/* Balance Display */}
              <div className="text-center mb-4 flex-1 flex flex-col justify-center">
                <div className={`${isMobile ? 'text-3xl' : 'text-4xl'} font-bold mb-2 ${netCalories >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {netCalories >= 0 ? '+' : ''}{netCalories.toLocaleString()} cal
                </div>
                <div className={`${isMobile ? 'text-sm' : 'text-base'} font-medium ${netCalories >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {netCalories >= 0 ? 'Deficit achieved!' : 'Over budget'}
                </div>
              </div>

              {/* Breakdown Cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-100 dark:bg-gray-800 text-center p-3 rounded-xl">
                  <div className="w-8 h-8 mx-auto mb-2 rounded-lg bg-slate-500/20 flex items-center justify-center">
                    <span className="text-lg">🍽️</span>
                  </div>
                  <div className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-gray-800 dark:text-gray-100 mb-1`}>{currentCalories}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Consumed</div>
                </div>
                
                <div className="bg-orange-50 dark:bg-orange-900/30 text-center p-3 rounded-xl">
                  <div className="w-8 h-8 mx-auto mb-2 rounded-lg bg-orange-500/20 flex items-center justify-center">
                    <span className="text-lg">🔥</span>
                  </div>
                  <div className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-gray-800 dark:text-gray-100 mb-1`}>{todaysExercise.calories}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Burned</div>
                </div>
                
                <div className="bg-emerald-50 dark:bg-emerald-900/30 text-center p-3 rounded-xl">
                  <div className="w-8 h-8 mx-auto mb-2 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    <span className="text-lg">🎯</span>
                  </div>
                  <div className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-gray-800 dark:text-gray-100 mb-1`}>{Math.abs(netCalories)}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">{netCalories >= 0 ? 'Remaining' : 'Over'}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Steps and Exercise Cards - Below Net Calories */}
          <div className={`grid grid-cols-2 gap-4`}>
            {/* Steps Tracker Card - Enhanced for Mobile with Larger Text */}
            <Card 
              className="activity-steps-card border-0 rounded-2xl overflow-hidden cursor-pointer h-56"
              onClick={() => navigate('/analytics?section=steps')}
            >
              <CardContent className="p-5 h-full flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <Footprints className="h-7 w-7 text-white/90" />
                    <span className="text-xl font-bold text-white/90">Steps</span>
                  </div>
                  <div className="floating-shoe text-4xl">👟</div>
                </div>
                
                <div className="flex-1 flex flex-col justify-center">
                  <div className="text-white text-4xl font-bold mb-3">
                    {todaysSteps.toLocaleString()}
                  </div>
                  <div className="text-white/80 text-lg mb-4">
                    Goal: {stepsGoal.toLocaleString()}
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between text-white/80 text-lg">
                      <span className="font-semibold">{Math.round(stepsPercentage)}%</span>
                      <span className="font-medium">Complete</span>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-3">
                      <div 
                        className="bg-white h-3 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${Math.min(stepsPercentage, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Exercise Card - Enhanced for Mobile with Larger Text */}
            <Card 
              className="activity-exercise-card border-0 rounded-2xl overflow-hidden cursor-pointer h-56"
              onClick={() => navigate('/analytics?section=exercise')}
            >
              <CardContent className="p-5 h-full flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <Dumbbell className="h-7 w-7 text-white/90" />
                    <span className="text-xl font-bold text-white/90">Exercise</span>
                  </div>
                  <div className="pulsing-flame text-4xl">🔥</div>
                </div>
                
                <div className="flex-1 flex flex-col justify-center">
                  <div className="text-white text-4xl font-bold mb-3">
                    {todaysExercise.calories}
                  </div>
                  <div className="text-white/80 text-lg mb-4">
                    calories burned
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between text-white/80 text-lg">
                      <span className="font-semibold">{Math.floor(todaysExercise.duration / 60)}h {todaysExercise.duration % 60}m</span>
                      <span className="font-medium">Duration</span>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-3">
                      <div 
                        className="bg-white h-3 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${Math.min((todaysExercise.duration / 60) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* NEW: Enhanced AI Insights Window - Positioned here between logging actions and nutrients */}
      <HomeAIInsights />

      {/* Today's Nutrients Section with improved card alignment and positioned sliders */}
      <div className="space-y-6 sm:space-y-8 px-2 sm:px-4">
        <h3 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-gray-900 dark:text-white text-center`}>Today's Nutrients</h3>
        <div className="flex justify-center">
          <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 ${isMobile ? 'gap-3 max-w-sm' : 'gap-4 max-w-4xl'} w-full`}>
            {macroCards.map((macro, index) => {
              const percentage = Math.min((macro.current / macro.target) * 100, 100);
              const Icon = macro.icon;
              
              // Define colors that match the tracker icons
              const getProgressColor = (name: string) => {
                switch (name) {
                  case 'Calories':
                    return 'from-emerald-400 to-emerald-600';
                  case 'Protein':
                    return 'from-blue-400 to-blue-600';
                  case 'Carbs':
                    return 'from-orange-400 to-orange-600';
                  case 'Fat':
                    return 'from-purple-400 to-purple-600';
                  case 'Hydration':
                    return 'from-cyan-400 to-blue-600';
                  case 'Supplements':
                    return 'from-purple-500 to-pink-600';
                  default:
                    return macro.color;
                }
              };
              
              return (
                <Card
                  key={macro.name}
                  className={`modern-nutrient-card nutrients-card border-0 ${isMobile ? 'h-48' : 'h-52'} rounded-3xl animate-slide-up hover:scale-105 transition-all duration-500 shadow-lg hover:shadow-xl w-full`}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <CardContent className="flex flex-col justify-between h-full p-0">
                    <div className={`${isMobile ? 'p-3' : 'p-4'} text-center flex flex-col justify-between h-full`}>
                      <div className="flex-shrink-0">
                        <div className={`${isMobile ? 'w-14 h-14' : 'w-16 h-16'} bg-gradient-to-br ${macro.color} rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg`}>
                          <Icon className={`${isMobile ? 'h-7 w-7' : 'h-8 w-8'} text-white`} />
                        </div>
                        <h4 className={`font-bold text-gray-900 dark:text-white mb-2 ${isMobile ? 'text-base' : 'text-lg'} leading-tight`}>{macro.name}</h4>
                      </div>
                      <div className="flex-grow flex flex-col justify-center space-y-2">
                        <p className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold neon-text leading-tight`}>
                          {macro.current.toFixed(0)}{macro.unit}
                        </p>
                        <p className={`${isMobile ? 'text-sm' : 'text-base'} text-gray-500 dark:text-gray-400 leading-tight`}>
                          of {macro.target}{macro.unit}
                        </p>
                      </div>
                      {/* Positioned slider with proper spacing and matching colors */}
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-4 flex-shrink-0">
                        <div
                          className={`bg-gradient-to-r ${getProgressColor(macro.name)} h-2 rounded-full transition-all duration-1500 shadow-sm`}
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

      {/* Extra bottom padding to ensure menu is always visible */}
      <div className={`${isMobile ? 'pb-24' : 'pb-32'}`}></div>
    </div>
  );
};

export default Home;
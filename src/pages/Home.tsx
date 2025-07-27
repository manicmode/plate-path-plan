import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Camera, TrendingUp, Droplets, Pill, Zap, Target, Sparkles, ChevronDown, ChevronUp, Clock, MoreHorizontal, RefreshCw, Plus, Activity, Timer, Footprints, Dumbbell, Atom } from 'lucide-react';
import { useAuth } from '@/contexts/auth';
import { useNutrition } from '@/contexts/NutritionContext';
import { useDailyScore } from '@/hooks/useDailyScore';
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
import { HomeCtaTicker } from '@/components/HomeCtaTicker';
import { safeStorage, safeGetJSON, safeSetJSON } from '@/lib/safeStorage';
import { ExerciseLogForm, ExerciseData } from '@/components/ExerciseLogForm';
import { ExerciseReminderForm } from '@/components/ExerciseReminderForm';
import { useToxinDetections } from '@/hooks/useToxinDetections';
import { useDeferredToxinData } from '@/hooks/useDeferredToxinData';
import { useAutomaticToxinDetection } from '@/hooks/useAutomaticToxinDetection';
import { TrackerInsightsPopup } from '@/components/tracker-insights/TrackerInsightsPopup';
import { useTrackerInsights } from '@/hooks/useTrackerInsights';
import { HealthCheckModal } from '@/components/health-check/HealthCheckModal';
import { DailyScoreCard } from '@/components/analytics/DailyScoreCard';
import { ComingSoonPopup } from '@/components/ComingSoonPopup';
import { supabase } from '@/integrations/supabase/client';
import { MealScoringTestComponent } from '@/components/debug/MealScoringTestComponent';
import { CoachCtaDemo } from '@/components/debug/CoachCtaDemo';
import { MoodForecastCard } from '@/components/MoodForecastCard';
import { useDeferredHydrationData } from '@/hooks/useDeferredHydrationData';
import { useDeferredDailyScore } from '@/hooks/useDeferredDailyScore';
import { useRealExerciseData } from '@/hooks/useRealExerciseData';
import { useSound } from '@/hooks/useSound';
import { useTeamVictoryCelebrations } from '@/hooks/useTeamVictoryCelebrations';
import { useCriticalDataLoading, useDeferredHomeDataLoading, useNonCriticalDataLoading } from '@/hooks/useDeferredDataLoading';
import { MeditationNudgeBanner } from '@/components/meditation/MeditationNudgeBanner';
import { BreathingNudgeBanner } from '@/components/breathing/BreathingNudgeBanner';

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
  
  // Set up deferred loading for different priority data
  const { shouldLoad: shouldLoadCritical } = useCriticalDataLoading();
  const { shouldLoad: shouldLoadDeferred } = useDeferredHomeDataLoading();
  const { shouldLoad: shouldLoadNonCritical } = useNonCriticalDataLoading();
  
  // Critical data that loads first (basic nutrition progress)
  const progress = getTodaysProgress();
  
  // Deferred data loading - only after initial render
  const { todayTotal: realHydrationToday, isLoading: hydrationLoading } = useDeferredHydrationData();
  const { todayScore, scoreStats, loading: scoreLoading } = useDeferredDailyScore();
  const { summary: exerciseSummary } = useRealExerciseData('7d');
  
  // Non-critical data loading - loads last
  const { toxinData: realToxinData, todayFlaggedCount, isLoading: toxinLoading } = useDeferredToxinData();
  
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const { playGoalHit, playFoodLogConfirm, isEnabled } = useSound();
  
  // State for daily nutrition targets
  const [dailyTargets, setDailyTargets] = useState({
    calories: null,
    protein: null,
    carbs: null,
    fat: null,
    fiber: null,
    sugar: null,
    sodium: null,
    saturated_fat: null,
    hydration_ml: null,
    supplement_count: null
  });
  
  const { detectToxinsForFood } = useToxinDetections(); // Keep for automatic detection
  
  // Enable automatic toxin detection for new food logs
  useAutomaticToxinDetection();
  
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
  const [celebrationMessage, setCelebrationMessage] = useState('');
  const [preferences, setPreferences] = useState(loadUserPreferences());
  const [isQuickLogExpanded, setIsQuickLogExpanded] = useState(false);
  
  // Add confirmation card state
  const [showConfirmationCard, setShowConfirmationCard] = useState(false);
  const [selectedFood, setSelectedFood] = useState(null);
  
  // Exercise tracking state
  const [showExerciseForm, setShowExerciseForm] = useState(false);
  const [showExerciseReminder, setShowExerciseReminder] = useState(false);
  
  // State variables for UI sections
  const [isNutrientsExpanded, setIsNutrientsExpanded] = useState(false);
  const [isMicronutrientsExpanded, setIsMicronutrientsExpanded] = useState(false);
  const [isToxinsExpanded, setIsToxinsExpanded] = useState(false);

  // Tracker Insights state
  const { isOpen: isInsightsOpen, selectedTracker, openInsights, closeInsights } = useTrackerInsights();

  // Health Check Modal state
  const [isHealthCheckOpen, setIsHealthCheckOpen] = useState(false);
  
  // Coming Soon Modal state
  const [isComingSoonOpen, setIsComingSoonOpen] = useState(false);
  
  // Team victory celebrations
  useTeamVictoryCelebrations();

  // Listen for challenge celebration events
  useEffect(() => {
    const handleCelebration = (event) => {
      const { message, type } = event.detail;
      setCelebrationMessage(message);
      setCelebrationType(type);
      setShowCelebration(true);
    };

    window.addEventListener('showCelebration', handleCelebration);
    return () => window.removeEventListener('showCelebration', handleCelebration);
  }, []);

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

  // Load daily targets from database
  useEffect(() => {
    const loadDailyTargets = async () => {
      if (!user?.id) return;
      
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('daily_nutrition_targets')
        .select('calories, protein, carbs, fat, fiber, sugar, sodium, saturated_fat, hydration_ml, supplement_count')
        .eq('user_id', user.id)
        .eq('target_date', today)
        .maybeSingle();
      
      if (data && !error) {
        console.log('📊 Loaded daily targets for Home:', data);
        setDailyTargets({
          calories: data.calories,
          protein: data.protein,
          carbs: data.carbs,
          fat: data.fat,
          fiber: data.fiber,
          sugar: data.sugar,
          sodium: data.sodium,
          saturated_fat: data.saturated_fat,
          hydration_ml: data.hydration_ml,
          supplement_count: data.supplement_count
        });
      }
    };
    
    loadDailyTargets();
  }, [user?.id]);

  const totalCalories = dailyTargets.calories || user?.targetCalories || 2000;
  const currentCalories = progress.calories;
  const progressPercentage = Math.min((currentCalories / totalCalories) * 100, 100);

  const hydrationGoal = getHydrationGoal();
  const actualHydration = realHydrationToday || 0;
  const hydrationPercentage = Math.min((actualHydration / hydrationGoal) * 100, 100);
  
  // Debug hydration calculation
  useEffect(() => {
    if (!hydrationLoading) {
      console.log('💧 Hydration Debug:', {
        realHydrationToday,
        actualHydration,
        hydrationGoal,
        hydrationPercentage,
        calculation: `${actualHydration} / ${hydrationGoal} * 100 = ${(actualHydration / hydrationGoal) * 100}`
      });
    }
  }, [realHydrationToday, actualHydration, hydrationGoal, hydrationPercentage, hydrationLoading]);

  const supplementGoal = getSupplementGoal();
  const supplementPercentage = Math.min((progress.supplements / supplementGoal) * 100, 100);

  // Exercise goals
  const stepsGoal = 10000;
  const stepsPercentage = Math.min((exerciseSummary.todaySteps / stepsGoal) * 100, 100);

  // Unified goal validation function
  const isGoalFullyAchieved = (current: number, target: number, isLoading: boolean = false) => {
    // Defensive checks
    if (isLoading || !target || target <= 0 || current < 0) return false;
    
    // Must be 100% or more to trigger celebration
    const percentage = (current / target) * 100;
    return percentage >= 100;
  };

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
    // Avoid celebrations during loading states
    if (authLoading || hydrationLoading || scoreLoading) return;
    
    // Calories celebration
    if (isGoalFullyAchieved(currentCalories, totalCalories) && !hasShownCelebrationToday('calories')) {
      console.log('🎉 Calories goal achieved:', { current: currentCalories, target: totalCalories });
      setCelebrationType('Calories Goal Smashed! 🔥');
      setShowCelebration(true);
      markCelebrationShown('calories');
      playGoalHit(); // Play celebration sound
    }
    
    // Hydration celebration - using real hydration data
    else if (isGoalFullyAchieved(actualHydration, hydrationGoal, hydrationLoading) && !hasShownCelebrationToday('hydration')) {
      console.log('🎉 Hydration goal achieved:', { current: actualHydration, target: hydrationGoal });
      setCelebrationType('Hydration Goal Achieved! 💧');
      setShowCelebration(true);
      markCelebrationShown('hydration');
      playGoalHit(); // Play celebration sound
    }
    
    // Supplements celebration
    else if (isGoalFullyAchieved(progress.supplements, supplementGoal) && !hasShownCelebrationToday('supplements')) {
      console.log('🎉 Supplements goal achieved:', { current: progress.supplements, target: supplementGoal });
      setCelebrationType('Supplements Complete! 💊');
      setShowCelebration(true);
      markCelebrationShown('supplements');
      playGoalHit(); // Play celebration sound
    }
    
    // Protein celebration
    else if (isGoalFullyAchieved(progress.protein, dailyTargets.protein || user?.targetProtein || 150) && !hasShownCelebrationToday('protein')) {
      console.log('🎉 Protein goal achieved:', { current: progress.protein, target: dailyTargets.protein || user?.targetProtein || 150 });
      setCelebrationType('Protein Goal Crushed! 💪');
      setShowCelebration(true);
      markCelebrationShown('protein');
      playGoalHit(); // Play celebration sound
    }
    
    // Carbs celebration
    else if (isGoalFullyAchieved(progress.carbs, dailyTargets.carbs || user?.targetCarbs || 200) && !hasShownCelebrationToday('carbs')) {
      console.log('🎉 Carbs goal achieved:', { current: progress.carbs, target: dailyTargets.carbs || user?.targetCarbs || 200 });
      setCelebrationType('Carbs Target Hit! 🍞');
      setShowCelebration(true);
      markCelebrationShown('carbs');
      playGoalHit(); // Play celebration sound
    }
    
    // Fat celebration
    else if (isGoalFullyAchieved(progress.fat, dailyTargets.fat || user?.targetFat || 65) && !hasShownCelebrationToday('fat')) {
      console.log('🎉 Fat goal achieved:', { current: progress.fat, target: dailyTargets.fat || user?.targetFat || 65 });
      setCelebrationType('Fat Goal Achieved! 🥑');
      setShowCelebration(true);
      markCelebrationShown('fat');
      playGoalHit(); // Play celebration sound
    }
    
    // Fiber celebration
    else if (isGoalFullyAchieved((progress as any).fiber || 0, dailyTargets.fiber || 25) && !hasShownCelebrationToday('fiber')) {
      console.log('🎉 Fiber goal achieved:', { current: (progress as any).fiber || 0, target: dailyTargets.fiber || 25 });
      setCelebrationType('Fiber Target Reached! 🌾');
      setShowCelebration(true);
      markCelebrationShown('fiber');
      playGoalHit(); // Play celebration sound
    }
    
    // Saturated Fat celebration
    else if (isGoalFullyAchieved((progress as any).saturated_fat || 0, dailyTargets.saturated_fat || 20) && !hasShownCelebrationToday('saturated_fat')) {
      console.log('🎉 Saturated Fat goal achieved:', { current: (progress as any).saturated_fat || 0, target: dailyTargets.saturated_fat || 20 });
      setCelebrationType('Sat Fat Goal Met! 🧈');
      setShowCelebration(true);
      markCelebrationShown('saturated_fat');
      playGoalHit(); // Play celebration sound
    }
    
    // Steps celebration
    else if (isGoalFullyAchieved(exerciseSummary.todaySteps, stepsGoal) && !hasShownCelebrationToday('steps')) {
      console.log('🎉 Steps goal achieved:', { current: exerciseSummary.todaySteps, target: stepsGoal });
      setCelebrationType('Step Goal Crushed! 👟');
      setShowCelebration(true);
      markCelebrationShown('steps');
      playGoalHit(); // Play celebration sound
    }
    
    // Exercise Calories celebration (300 kcal target)
    else if (isGoalFullyAchieved(exerciseSummary.todayCalories, 300) && !hasShownCelebrationToday('exercise_calories')) {
      console.log('🎉 Exercise calories goal achieved:', { current: exerciseSummary.todayCalories, target: 300 });
      setCelebrationType('Workout Goal Achieved! 🏋️');
      setShowCelebration(true);
      markCelebrationShown('exercise_calories');
      playGoalHit(); // Play celebration sound
    }
  }, [
    currentCalories, totalCalories, actualHydration, hydrationGoal, 
    progress.supplements, supplementGoal, progress.protein, progress.carbs, progress.fat,
    (progress as any).fiber, (progress as any).saturated_fat,
    exerciseSummary.todaySteps, exerciseSummary.todayCalories, stepsGoal,
    dailyTargets.protein, dailyTargets.carbs, dailyTargets.fat, dailyTargets.fiber, dailyTargets.saturated_fat,
    user?.targetProtein, user?.targetCarbs, user?.targetFat,
    authLoading, hydrationLoading, scoreLoading, user?.id
  ]);

  // Use preferences from localStorage/state instead of user object
  const selectedTrackers = preferences.selectedTrackers || ['calories', 'hydration', 'supplements'];

  const allTrackerConfigs = {
    calories: {
      name: 'Calories',
      current: Math.round(progress.calories),
      target: Math.round(totalCalories),
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
      current: Math.round(progress.protein),
      target: Math.round(dailyTargets.protein || user?.targetProtein || 150),
      unit: 'g',
      color: 'from-blue-500/20 via-indigo-500/15 to-purple-500/10',
      gradient: 'proteinGradientVibrant',
      emoji: '💪',
      textColor: 'text-blue-900 dark:text-white',
      textColorSecondary: 'text-blue-800 dark:text-blue-100',
      percentage: Math.min((progress.protein / (dailyTargets.protein || user?.targetProtein || 150)) * 100, 100),
      shadow: 'shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:shadow-[0_0_30px_rgba(59,130,246,0.6)]',
      onClick: () => navigate('/camera'),
    },
    carbs: {
      name: 'Carbs',
      current: Math.round(progress.carbs),
      target: Math.round(dailyTargets.carbs || user?.targetCarbs || 200),
      unit: 'g',
      color: 'from-yellow-500/20 via-orange-500/15 to-red-500/10',
      gradient: 'carbsGradientVibrant',
      emoji: '🍞',
      textColor: 'text-yellow-900 dark:text-white',
      textColorSecondary: 'text-yellow-800 dark:text-yellow-100',
      percentage: Math.min((progress.carbs / (dailyTargets.carbs || user?.targetCarbs || 200)) * 100, 100),
      shadow: 'shadow-[0_0_20px_rgba(251,191,36,0.4)] hover:shadow-[0_0_30px_rgba(251,191,36,0.6)]',
      onClick: () => navigate('/camera'),
    },
    fat: {
      name: 'Fat',
      current: Math.round(progress.fat),
      target: Math.round(dailyTargets.fat || user?.targetFat || 65),
      unit: 'g',
      color: 'from-green-500/20 via-emerald-500/15 to-teal-500/10',
      gradient: 'fatGradientVibrant',
      emoji: '🥑',
      textColor: 'text-green-900 dark:text-white',
      textColorSecondary: 'text-green-800 dark:text-green-100',
      percentage: Math.min((progress.fat / (dailyTargets.fat || user?.targetFat || 65)) * 100, 100),
      shadow: 'shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:shadow-[0_0_30px_rgba(16,185,129,0.6)]',
      onClick: () => navigate('/camera'),
    },
    hydration: {
      name: 'Hydration',
      current: Math.round(actualHydration),
      target: Math.round(hydrationGoal),
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
    fiber: {
      name: 'Fiber',
      current: Math.round((progress as any).fiber || 0),
      target: Math.round(dailyTargets.fiber || 25),
      unit: 'g',
      color: 'from-green-500/20 via-lime-500/15 to-emerald-500/10',
      gradient: 'from-green-400 to-lime-500',
      emoji: '🌾',
      textColor: 'text-green-900 dark:text-white',
      textColorSecondary: 'text-green-800 dark:text-green-100',
      percentage: Math.min(((progress as any).fiber || 0) / (dailyTargets.fiber || 25) * 100, 100),
      shadow: 'shadow-[0_0_20px_rgba(34,197,94,0.4)] hover:shadow-[0_0_30px_rgba(34,197,94,0.6)]',
      onClick: () => navigate('/camera'),
    },
    sugar: {
      name: 'Sugar',
      current: Math.round((progress as any).sugar || 0),
      target: Math.round(dailyTargets.sugar || 50),
      unit: 'g',
      color: 'from-pink-500/20 via-rose-500/15 to-red-500/10',
      gradient: 'from-pink-400 to-rose-500',
      emoji: '🍬',
      textColor: 'text-pink-900 dark:text-white',
      textColorSecondary: 'text-pink-800 dark:text-pink-100',
      percentage: Math.min(((progress as any).sugar || 0) / (dailyTargets.sugar || 50) * 100, 100),
      shadow: 'shadow-[0_0_20px_rgba(236,72,153,0.4)] hover:shadow-[0_0_30px_rgba(236,72,153,0.6)]',
      onClick: () => navigate('/camera'),
    },
    sodium: {
      name: 'Sodium',
      current: Math.round((progress as any).sodium || 0),
      target: Math.round(dailyTargets.sodium || 2300),
      unit: 'mg',
      color: 'from-red-500/20 via-orange-500/15 to-yellow-500/10',
      gradient: 'from-red-400 to-orange-500',
      emoji: '🧂',
      textColor: 'text-red-900 dark:text-white',
      textColorSecondary: 'text-red-800 dark:text-red-100',
      percentage: Math.min(((progress as any).sodium || 0) / (dailyTargets.sodium || 2300) * 100, 100),
      shadow: 'shadow-[0_0_20px_rgba(239,68,68,0.4)] hover:shadow-[0_0_30px_rgba(239,68,68,0.6)]',
      onClick: () => navigate('/camera'),
    },
    saturated_fat: {
      name: 'Sat Fat',
      current: Math.round((progress as any).saturated_fat || 0),
      target: Math.round(dailyTargets.saturated_fat || 20),
      unit: 'g',
      color: 'from-purple-500/20 via-indigo-500/15 to-blue-500/10',
      gradient: 'from-purple-400 to-indigo-500',
      emoji: '🧈',
      textColor: 'text-purple-900 dark:text-white',
      textColorSecondary: 'text-purple-800 dark:text-purple-100',
      percentage: Math.min(((progress as any).saturated_fat || 0) / (dailyTargets.saturated_fat || 20) * 100, 100),
      shadow: 'shadow-[0_0_20px_rgba(147,51,234,0.4)] hover:shadow-[0_0_30px_rgba(147,51,234,0.6)]',
      onClick: () => navigate('/camera'),
    },
    micronutrients: {
      name: 'Micronutrients',
      current: Math.round(((progress as any).vitaminA || 0) + ((progress as any).vitaminC || 0) + ((progress as any).vitaminD || 0)) / 3,
      target: 100,
      unit: '%',
      color: 'from-amber-500/20 via-yellow-500/15 to-orange-500/10',
      gradient: 'from-amber-400 to-yellow-500',
      emoji: '🧬',
      textColor: 'text-amber-900 dark:text-white',
      textColorSecondary: 'text-amber-800 dark:text-amber-100',
      percentage: Math.round(((progress as any).vitaminA || 0) + ((progress as any).vitaminC || 0) + ((progress as any).vitaminD || 0)) / 3,
      shadow: 'shadow-[0_0_20px_rgba(245,158,11,0.4)] hover:shadow-[0_0_30px_rgba(245,158,11,0.6)]',
      onClick: () => navigate('/camera'),
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
      current: Math.round(progress.calories),
      target: Math.round(totalCalories),
      unit: '',
      color: 'from-emerald-400 to-emerald-600',
      icon: Zap,
    },
    {
      name: 'Protein',
      current: Math.round(progress.protein),
      target: Math.round(dailyTargets.protein || user?.targetProtein || 150),
      unit: 'g',
      color: 'from-blue-400 to-blue-600',
      icon: Target,
    },
    {
      name: 'Carbs',
      current: Math.round(progress.carbs),
      target: Math.round(dailyTargets.carbs || user?.targetCarbs || 200),
      unit: 'g',
      color: 'from-orange-400 to-orange-600',
      icon: TrendingUp,
    },
    {
      name: 'Fat',
      current: Math.round(progress.fat),
      target: Math.round(dailyTargets.fat || user?.targetFat || 65),
      unit: 'g',
      color: 'from-purple-400 to-purple-600',
      icon: Target,
    },
    {
      name: 'Hydration',
      current: Math.round(progress.hydration),
      target: Math.round(hydrationGoal),
      unit: 'ml',
      color: 'from-cyan-400 to-blue-600',
      icon: Droplets,
    },
    {
      name: 'Supplements',
      current: Math.round(progress.supplements),
      target: Math.round(supplementGoal),
      unit: '',
      color: 'from-purple-500 to-pink-600',
      icon: Pill,
    },
    {
      name: 'Fiber',
      current: Math.round((progress as any).fiber || 0),
      target: Math.round(dailyTargets.fiber || 25),
      unit: 'g',
      color: 'from-green-400 to-green-600',
      icon: Activity,
    },
    {
      name: 'Sugar',
      current: Math.round((progress as any).sugar || 0),
      target: Math.round(dailyTargets.sugar || 50),
      unit: 'g',
      color: 'from-pink-400 to-pink-600',
      icon: Sparkles,
    },
    {
      name: 'Sodium',
      current: Math.round((progress as any).sodium || 0),
      target: Math.round(dailyTargets.sodium || 2300),
      unit: 'mg',
      color: 'from-red-400 to-red-600',
      icon: Activity,
    },
    {
      name: 'Sat Fat',
      current: Math.round((progress as any).saturated_fat || 0),
      target: Math.round(dailyTargets.saturated_fat || 20),
      unit: 'g',
      color: 'from-indigo-400 to-indigo-600',
      icon: Target,
    },
  ];

  // Micronutrients configuration
  const micronutrientCards = [
    {
      name: 'Iron',
      current: (progress as any).iron || 0,
      target: 18,
      unit: 'mg',
      color: 'from-red-400 to-red-600',
      icon: Activity,
    },
    {
      name: 'Magnesium',
      current: (progress as any).magnesium || 0,
      target: 400,
      unit: 'mg',
      color: 'from-green-400 to-green-600',
      icon: Sparkles,
    },
    {
      name: 'Calcium',
      current: (progress as any).calcium || 0,
      target: 1000,
      unit: 'mg',
      color: 'from-blue-400 to-blue-600',
      icon: Target,
    },
    {
      name: 'Zinc',
      current: (progress as any).zinc || 0,
      target: 11,
      unit: 'mg',
      color: 'from-gray-400 to-gray-600',
      icon: Atom,
    },
    {
      name: 'Vitamin A',
      current: (progress as any).vitaminA || 0,
      target: 900,
      unit: 'μg',
      color: 'from-orange-400 to-orange-600',
      icon: Sparkles,
    },
    {
      name: 'Vitamin B12',
      current: (progress as any).vitaminB12 || 0,
      target: 2.4,
      unit: 'μg',
      color: 'from-purple-400 to-purple-600',
      icon: Activity,
    },
    {
      name: 'Vitamin C',
      current: (progress as any).vitaminC || 0,
      target: 90,
      unit: 'mg',
      color: 'from-yellow-400 to-yellow-600',
      icon: Zap,
    },
    {
      name: 'Vitamin D',
      current: (progress as any).vitaminD || 0,
      target: 20,
      unit: 'μg',
      color: 'from-amber-400 to-amber-600',
      icon: Target,
    },
  ];

  // Use real toxin detection data

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

    // Play food log confirmation sound with proper debugging and error handling
    console.log('🔊 [Home] Attempting to play food log confirmation sound');
    console.log('🔊 [Home] Sound enabled:', isEnabled);
    
    // Defer sound playback to ensure it plays after UI renders
    setTimeout(() => {
      try {
        console.log('🔊 [Home] playFoodLogConfirm triggered');
        playFoodLogConfirm().catch(error => {
          console.warn('🔊 [Home] Food log sound failed:', error);
          if (error.name === 'NotAllowedError') {
            console.log('🔊 [Home] Audio blocked by browser - user interaction required');
          }
        });
      } catch (error) {
        console.error('🔊 [Home] Sound playback error:', error);
      }
    }, 0);

    // Reset selected food
    setSelectedFood(null);
  };

  const handleExerciseLog = async (exerciseData: ExerciseData) => {
    try {
      // Insert exercise log into database
      const { error } = await supabase
        .from('exercise_logs')
        .insert({
          user_id: user?.id,
          activity_type: exerciseData.type,
          duration_minutes: exerciseData.duration,
          intensity_level: exerciseData.intensity,
          calories_burned: exerciseData.caloriesBurned,
        });

      if (error) {
        console.error('Error logging exercise:', error);
        toast({
          title: "Error logging exercise",
          description: "Please try again",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error logging exercise:', error);
    }
  };

  // Calculate net calories (goal - food intake + burned calories)
  const netCalories = totalCalories - currentCalories + exerciseSummary.todayCalories;

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
      {/* Meditation Nudge Banner */}
      <MeditationNudgeBanner />
      
      {/* Breathing Nudge Banner */}
      <BreathingNudgeBanner />

      {/* Celebration Popup */}
      <CelebrationPopup 
        show={showCelebration} 
        message={celebrationMessage || celebrationType}
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
          <h1 className={`${isMobile ? 'text-3xl' : 'text-5xl'} font-bold bg-gradient-to-r from-gray-900 via-emerald-600 to-blue-600 dark:from-gray-100 dark:via-emerald-400 dark:to-blue-400 bg-clip-text text-transparent mb-4 relative overflow-hidden shimmer-text motion-reduce:animate-none`}>
            {isMobile ? "Let's optimize your day," : "Let's optimize your day,"}
          </h1>
          <h2 className={`${isMobile ? 'text-3xl' : 'text-5xl'} font-bold neon-text relative`}>
            {user?.name?.split(' ')[0] || 'Superstar'}! 
            <span className="inline-block ml-2 animate-pulse-scale motion-reduce:animate-none">✨</span>
          </h2>
        </div>
        <HomeCtaTicker className={`${isMobile ? 'text-lg' : 'text-xl'} train-slide motion-reduce:animate-none`} />
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
                                  usually {item.usualTime}
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

        {/* Enhanced Net Calorie Card */}
        <Card 
          className={`modern-action-card border-0 rounded-3xl overflow-hidden hover:scale-[1.02] transition-all duration-500 shadow-lg hover:shadow-xl`}
        >
          <CardContent className={`${isMobile ? 'p-5' : 'p-6'} relative`}>
            {/* Action Buttons - Upper Right Corner */}
            <div className="absolute top-4 right-4 flex flex-col gap-2">
              <button
                onClick={() => setShowExerciseForm(true)}
                className="action-button-full log-workout-button text-xs px-3 py-2"
              >
                <Plus className="h-3 w-3" />
                {isMobile ? 'Workout' : 'Log Workout'}
              </button>
              <button
                onClick={() => setShowExerciseReminder(true)}
                className="action-button-full set-reminder-button text-xs px-3 py-2"
              >
                <Clock className="h-3 w-3" />
                {isMobile ? 'Remind' : 'Log Exercise Reminder'}
              </button>
            </div>

            {/* Header with icon and title */}
            <div className="flex items-center space-x-3 mb-4 pr-24">
              <div className={`${isMobile ? 'w-12 h-12' : 'w-14 h-14'} bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg`}>
                <Target className={`${isMobile ? 'h-6 w-6' : 'h-7 w-7'} text-white`} />
              </div>
              <div className="text-left">
                <h4 className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-gray-800 dark:text-gray-100`}>
                  Net Calories
                </h4>
                <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600 dark:text-gray-400`}>
                  Daily Balance
                </p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="text-center">
                <div className={`${isMobile ? 'text-3xl' : 'text-4xl'} font-bold`}>
                  <span className={netCalories >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>
                    {netCalories > 0 ? '+' : ''}{netCalories}
                  </span>
                  <span className="text-gray-600 dark:text-gray-400 text-lg ml-1">cal</span>
                </div>
                <p className={`${isMobile ? 'text-xs' : 'text-sm'} ${netCalories >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'} mt-1`}>
                  {netCalories >= 0 ? 'Deficit achieved!' : 'Need more exercise or less intake'}
                </p>
              </div>

              {/* Enhanced Calorie Breakdown */}
              <div className="net-calories-breakdown">
                <div className="calorie-section consumed">
                  <div className="flex items-center justify-center mb-1">
                    <span className="text-blue-500 text-lg">🍽️</span>
                  </div>
                  <p className={`${isMobile ? 'text-sm' : 'text-base'} font-bold text-gray-900 dark:text-white`}>
                    {currentCalories}
                  </p>
                  <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600 dark:text-gray-400`}>
                    Consumed
                  </p>
                </div>
                
                <div className="calorie-section burned">
                  <div className="flex items-center justify-center mb-1">
                    <span className="text-red-500 text-lg">🔥</span>
                  </div>
                  <p className={`${isMobile ? 'text-sm' : 'text-base'} font-bold text-gray-900 dark:text-white`}>
                    {exerciseSummary.todayCalories}
                  </p>
                  <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600 dark:text-gray-400`}>
                    Burned
                  </p>
                </div>
                
                <div className="calorie-section remaining">
                  <div className="flex items-center justify-center mb-1">
                    <span className="text-green-500 text-lg">🎯</span>
                  </div>
                  <p className={`${isMobile ? 'text-sm' : 'text-base'} font-bold text-gray-900 dark:text-white`}>
                    {totalCalories - currentCalories + exerciseSummary.todayCalories}
                  </p>
                  <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600 dark:text-gray-400`}>
                    Remaining
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Steps and Exercise Cards Container */}
        <div className={`grid grid-cols-2 gap-3 items-stretch`}>
          {/* Steps Tracker Card - Mobile Optimized */}
          <Card 
            className="border-0 rounded-2xl overflow-hidden cursor-pointer h-36"
            onClick={() => openInsights({ type: 'steps', name: 'Steps', color: '#3B82F6' })}
            style={{
              background: 'var(--activity-steps-gradient)',
              boxShadow: 'var(--activity-steps-glow)'
            }}
          >
            <CardContent className="p-4 h-full flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Footprints className="h-5 w-5 text-white/90" />
                  <span className="text-sm font-medium text-white/80">Steps</span>
                </div>
                <div className="animate-bounce text-xl">👟</div>
              </div>
              
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <div className="text-2xl font-bold text-white mb-1">
                    {exerciseSummary.todaySteps.toLocaleString()}
                  </div>
                  <div className="text-sm text-white/70">
                    Goal: {stepsGoal.toLocaleString()}
                  </div>
                </div>
                
                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm text-white/80">
                    <span>{Math.round(stepsPercentage)}%</span>
                    <span>Complete</span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-1.5">
                    <div 
                      className="bg-white h-1.5 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${Math.min(stepsPercentage, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Exercise Card - Mobile Optimized */}
          <Card 
            className="border-0 rounded-2xl overflow-hidden cursor-pointer h-36"
            onClick={() => openInsights({ type: 'exercise', name: 'Exercise', color: '#EF4444' })}
            style={{
              background: 'var(--activity-exercise-gradient)',
              boxShadow: 'var(--activity-exercise-glow)'
            }}
          >
            <CardContent className="p-4 h-full flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Dumbbell className="h-5 w-5 text-white/90" />
                  <span className="text-sm font-medium text-white/80">Exercise</span>
                </div>
                <div className="animate-bounce text-xl">🏋️</div>
              </div>
              
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <div className="text-2xl font-bold text-white mb-1">
                    {exerciseSummary.todayCalories}
                  </div>
                  <div className="text-sm text-white/70">
                    calories burned
                  </div>
                </div>
                
                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm text-white/80">
                    <span>{Math.floor(exerciseSummary.todayDuration / 60)}h {exerciseSummary.todayDuration % 60}m</span>
                    <span>Duration</span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-1.5">
                    <div 
                      className="bg-white h-1.5 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${Math.min((exerciseSummary.todayDuration / 60) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Daily Performance Score Card - Featured prominently */}
      <div className="px-2 sm:px-4 mt-8">
        {!scoreLoading && scoreStats && (
          <DailyScoreCard 
            score={todayScore || 0}
            weeklyAverage={scoreStats.weeklyAverage}
            streak={scoreStats.streak}
            bestScore={scoreStats.bestScore}
            className="mb-6"
          />
        )}
      </div>

      {/* NEW: Enhanced AI Insights Window - Positioned here between logging actions and nutrients */}
      <div className="-mt-12">
        <HomeAIInsights />
      </div>

      {/* Tomorrow's Mood Forecast */}
      <div className="px-2 sm:px-4">
        <MoodForecastCard />
      </div>

      {/* Decorative Separation Line */}
      <div className="flex items-center justify-center px-4 sm:px-8 my-8">
        <div className="flex-grow h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-600 to-transparent"></div>
        <div className="mx-4 p-2 bg-gradient-to-br from-purple-500/20 to-indigo-500/20 rounded-full border border-purple-200/30 dark:border-purple-400/30">
          <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
        </div>
        <div className="flex-grow h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-600 to-transparent"></div>
      </div>

      {/* Today's Nutrients Section - Collapsible */}
      <div className="space-y-6 sm:space-y-8 px-2 sm:px-4 mt-8">
        <Collapsible open={isNutrientsExpanded} onOpenChange={setIsNutrientsExpanded}>
          <CollapsibleTrigger asChild>
            <div className="flex justify-between items-center cursor-pointer hover:opacity-80 transition-opacity">
              <div className="flex items-center gap-2">
                <Zap className="h-6 w-6 text-orange-500" />
                <h3 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-gray-900 dark:text-white`}>
                  Today's Nutrients
                </h3>
              </div>
              {!isNutrientsExpanded && (
                <div className="flex items-center gap-1">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Expand</span>
                  <ChevronDown className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </div>
              )}
            </div>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="space-y-6">
            <div className="flex justify-center pt-6">
              <div className={`grid grid-cols-2 ${isMobile ? 'gap-3 max-w-sm' : 'gap-4 max-w-4xl'} w-full`}>
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
                      case 'Fiber':
                        return 'from-green-400 to-green-600';
                      case 'Micronutrients':
                        return 'from-indigo-400 to-indigo-600';
                      default:
                        return macro.color;
                    }
                  };
                  
                  return (
                    <Card
                      key={macro.name}
                      className={`modern-nutrient-card nutrients-card border-0 ${isMobile ? 'h-48' : 'h-52'} rounded-3xl animate-slide-up hover:scale-105 transition-all duration-500 shadow-lg hover:shadow-xl w-full cursor-pointer`}
                      style={{ animationDelay: `${index * 100}ms` }}
                      onClick={() => openInsights({ 
                        type: macro.name.toLowerCase(), 
                        name: macro.name, 
                        color: getProgressColor(macro.name) 
                      })}
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
            
            {/* Fold Back Button - Matches Expand style */}
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-center gap-2 cursor-pointer hover:opacity-80 transition-opacity pt-4">
                <span className="text-sm text-gray-500 dark:text-gray-400">Fold Back</span>
                <ChevronUp className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </div>
            </CollapsibleTrigger>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Fancy Separator Line */}
      <div className="flex items-center justify-center px-4 sm:px-8 my-8">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-600 to-transparent"></div>
        <div className="mx-4">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center border border-gray-300 dark:border-gray-600">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
        </div>
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-600 to-transparent"></div>
      </div>

      {/* Micronutrients Section - Collapsible */}
      <div className="space-y-6 sm:space-y-8 px-2 sm:px-4">
        <Collapsible open={isMicronutrientsExpanded} onOpenChange={setIsMicronutrientsExpanded}>
          <CollapsibleTrigger asChild>
            <div className="flex justify-between items-center cursor-pointer hover:opacity-80 transition-opacity">
              <div className="flex items-center gap-2">
                <Atom className="h-6 w-6 text-indigo-500" />
                <h3 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-gray-900 dark:text-white`}>
                  Micronutrients
                </h3>
              </div>
              {!isMicronutrientsExpanded && (
                <div className="flex items-center gap-1">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Expand</span>
                  <ChevronDown className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </div>
              )}
            </div>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="space-y-6">
            <div className="flex justify-center pt-6">
              <div className={`grid grid-cols-2 ${isMobile ? 'gap-3 max-w-sm' : 'gap-4 max-w-4xl'} w-full`}>
                {micronutrientCards.map((micro, index) => {
                  const percentage = Math.min((micro.current / micro.target) * 100, 100);
                  const Icon = micro.icon;
                  
                  return (
                    <Card
                      key={micro.name}
                      className={`modern-nutrient-card nutrients-card border-0 ${isMobile ? 'h-48' : 'h-52'} rounded-3xl animate-slide-up hover:scale-105 transition-all duration-500 shadow-lg hover:shadow-xl w-full cursor-pointer`}
                      style={{ animationDelay: `${index * 100}ms` }}
                      onClick={() => openInsights({ 
                        type: micro.name.toLowerCase(), 
                        name: micro.name, 
                        color: micro.color 
                      })}
                    >
                      <CardContent className="flex flex-col justify-between h-full p-0">
                        <div className={`${isMobile ? 'p-3' : 'p-4'} text-center flex flex-col justify-between h-full`}>
                          <div className="flex-shrink-0">
                            <div className={`${isMobile ? 'w-14 h-14' : 'w-16 h-16'} bg-gradient-to-br ${micro.color} rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg`}>
                              <Icon className={`${isMobile ? 'h-7 w-7' : 'h-8 w-8'} text-white`} />
                            </div>
                            <h4 className={`font-bold text-gray-900 dark:text-white mb-2 ${isMobile ? 'text-base' : 'text-lg'} leading-tight`}>{micro.name}</h4>
                          </div>
                          <div className="flex-grow flex flex-col justify-center space-y-2">
                            <p className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold neon-text leading-tight`}>
                              {micro.current.toFixed(0)}{micro.unit}
                            </p>
                            <p className={`${isMobile ? 'text-sm' : 'text-base'} text-gray-500 dark:text-gray-400 leading-tight`}>
                              of {micro.target}{micro.unit}
                            </p>
                          </div>
                          {/* Progress bar */}
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-4 flex-shrink-0">
                            <div
                              className={`bg-gradient-to-r ${micro.color} h-2 rounded-full transition-all duration-1500 shadow-sm`}
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
            
            {/* Fold Back Button - Matches Expand style */}
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-center gap-2 cursor-pointer hover:opacity-80 transition-opacity pt-4">
                <span className="text-sm text-gray-500 dark:text-gray-400">Fold Back</span>
                <ChevronUp className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </div>
            </CollapsibleTrigger>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Fancy Separator Line */}
      <div className="flex items-center justify-center px-4 sm:px-8 my-8">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-600 to-transparent"></div>
        <div className="mx-4">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500/20 to-orange-500/20 flex items-center justify-center border border-gray-300 dark:border-gray-600">
            <span className="text-lg">🚨</span>
          </div>
        </div>
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-600 to-transparent"></div>
      </div>

      {/* Toxins & Flags Section - Collapsible */}
      <div className="space-y-6 sm:space-y-8 px-2 sm:px-4">
        <Collapsible open={isToxinsExpanded} onOpenChange={setIsToxinsExpanded}>
          <CollapsibleTrigger asChild>
            <div className="flex justify-between items-center cursor-pointer hover:opacity-80 transition-opacity">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🧪</span>
                <h3 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-gray-900 dark:text-white`}>
                  Toxins & Flags
                </h3>
              </div>
              {!isToxinsExpanded && (
                <div className="flex items-center gap-1">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Expand</span>
                  <ChevronDown className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </div>
              )}
            </div>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="space-y-6">
            <div className="flex justify-center pt-6">
              <div className={`grid grid-cols-2 ${isMobile ? 'gap-4 max-w-sm' : 'gap-6 max-w-4xl'} w-full`}>
                {realToxinData.map((item, index) => {
                  const isOverThreshold = item.current > item.threshold;
                  
                  return (
                    <Card
                      key={item.name}
                      className={`modern-nutrient-card border-0 ${isMobile ? 'h-48' : 'h-52'} rounded-3xl animate-slide-up hover:scale-105 transition-all duration-500 shadow-lg hover:shadow-xl w-full cursor-pointer ${
                        isOverThreshold 
                          ? 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800' 
                          : 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800'
                      }`}
                      style={{ animationDelay: `${index * 100}ms` }}
                      onClick={() => openInsights({ 
                        type: item.name, 
                        name: item.name, 
                        color: isOverThreshold ? '#ef4444' : '#22c55e' 
                      })}
                    >
                      <CardContent className="h-full p-0">
                        <div className={`${isMobile ? 'p-4' : 'p-6'} h-full flex flex-col text-center`}>
                          {/* Top Section: Icon and Title - Fixed Height */}
                          <div className={`flex-shrink-0 ${isMobile ? 'h-20' : 'h-24'} flex flex-col items-center justify-start`}>
                            <div className={`${isMobile ? 'w-14 h-14' : 'w-16 h-16'} ${item.bgColor} rounded-2xl flex items-center justify-center mb-2 shadow-lg`}>
                              <span className={`${isMobile ? 'text-2xl' : 'text-3xl'}`}>{item.icon}</span>
                            </div>
                            <h4 className={`font-bold text-gray-900 dark:text-white ${isMobile ? 'text-sm' : 'text-base'} leading-tight`}>
                              {item.name}
                            </h4>
                          </div>
                          
                          {/* Middle Section: Values - Centered */}
                          <div className="flex-grow flex flex-col justify-center">
                            <p className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold leading-tight mb-1 ${
                              isOverThreshold ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                            }`}>
                              {item.current}
                            </p>
                            <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-500 dark:text-gray-400 leading-tight`}>
                              Limit: {item.threshold} {item.unit}
                            </p>
                          </div>
                          
                          {/* Alert Emojis positioned as last element inside card */}
                          <div className="flex justify-center mt-2">
                            <span className={`${isMobile ? 'text-xl' : 'text-2xl'}`}>
                              {isOverThreshold ? '🚨🚨🚨' : '✅✅✅'}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
            
            {/* Fold Back Button - Matches Expand style */}
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-center gap-2 cursor-pointer hover:opacity-80 transition-opacity pt-4">
                <span className="text-sm text-gray-500 dark:text-gray-400">Fold Back</span>
                <ChevronUp className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </div>
            </CollapsibleTrigger>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Fancy Separator Line */}
      <div className="flex items-center justify-center px-4 sm:px-8 my-8">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-600 to-transparent"></div>
        <div className="mx-4">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center border border-gray-300 dark:border-gray-600">
            <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
        </div>
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-600 to-transparent"></div>
      </div>

      {/* Explore Tiles Section */}
      <div className="flex-1 flex flex-col px-2 sm:px-4">
        <div className="flex-1 grid grid-cols-2 gap-4">
          {(() => {
            const exploreTiles = [
              {
                id: 'health-check',
                title: 'Health Check',
                emoji: '❤️',
                color: 'from-red-500 via-rose-400 to-rose-500',
                shadowColor: 'shadow-red-500/30',
                glowColor: 'hover:shadow-red-400/50',
                animatedGradient: 'bg-gradient-to-br from-red-400 via-rose-500 to-pink-500',
              },
              {
                id: 'game-challenge',
                title: 'Game & Challenge',
                emoji: '🏆',
                color: 'from-yellow-500 via-orange-400 to-orange-500',
                shadowColor: 'shadow-yellow-500/30',
                glowColor: 'hover:shadow-yellow-400/50',
                animatedGradient: 'bg-gradient-to-br from-yellow-400 via-orange-500 to-orange-600',
              },
              {
                id: 'supplement-hub',
                title: 'Supplement Hub',
                emoji: '🧪',
                color: 'from-purple-500 via-purple-400 to-pink-500',
                shadowColor: 'shadow-purple-500/30',
                glowColor: 'hover:shadow-purple-400/50',
                animatedGradient: 'bg-gradient-to-br from-purple-400 via-purple-500 to-pink-500',
              },
              {
                id: 'exercise-hub',
                title: 'Exercise & Recovery',
                emoji: '💪',
                color: 'from-blue-500 via-blue-400 to-blue-600',
                shadowColor: 'shadow-blue-500/40',
                glowColor: 'hover:shadow-blue-400/60',
                animatedGradient: 'bg-gradient-to-br from-blue-400 via-blue-500 to-blue-700',
              },
              {
                id: 'influencers',
                title: 'Influencers',
                emoji: '⭐️',
                color: 'from-blue-600 via-cyan-400 to-cyan-600',
                shadowColor: 'shadow-cyan-500/40',
                glowColor: 'hover:shadow-cyan-400/60',
                animatedGradient: 'bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-600',
              },
              {
                id: 'my-reports',
                title: 'My Reports',
                emoji: '📄',
                color: 'from-emerald-500 via-emerald-400 to-teal-600',
                shadowColor: 'shadow-emerald-500/40',
                glowColor: 'hover:shadow-emerald-400/60',
                animatedGradient: 'bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-700',
              },
            ];

            return exploreTiles.map((tile) => {
              const handleTileClick = (tileId: string) => {
                if (tileId === 'supplement-hub') {
                  navigate('/supplement-hub');
                } else if (tileId === 'health-check') {
                  setIsHealthCheckOpen(true);
                } else if (tileId === 'game-challenge') {
                  navigate('/game-and-challenge');
                } else if (tileId === 'influencers') {
                  setIsComingSoonOpen(true);
                } else if (tileId === 'exercise-hub') {
                  navigate('/exercise-hub');
                } else if (tileId === 'my-reports') {
                  navigate('/my-reports');
                }
              };

              return (
              <Button
                key={tile.id}
                onClick={() => handleTileClick(tile.id)}
                variant="ghost"
                className={`
                  group relative h-full min-h-[180px] p-6 rounded-3xl 
                  transition-all duration-500 ease-out
                  bg-gradient-to-br ${tile.color} 
                  hover:scale-105 active:scale-95 active:rotate-1
                  shadow-2xl ${tile.shadowColor} ${tile.glowColor} hover:shadow-3xl
                  border-0 text-white hover:text-white
                  flex flex-col items-center justify-center space-y-3
                  backdrop-blur-sm overflow-hidden
                  before:absolute before:inset-0 before:bg-gradient-to-br 
                  before:from-white/20 before:to-transparent before:opacity-0 
                  hover:before:opacity-100 before:transition-opacity before:duration-300
                  after:absolute after:inset-0 after:bg-gradient-to-t
                  after:from-black/5 after:to-transparent after:opacity-100
                `}
              >
                {/* Large Emoji Icon */}
                <div className={`${isMobile ? 'text-5xl' : 'text-6xl'} 
                  group-hover:animate-bounce group-hover:scale-110 
                  transition-all duration-300 z-10 relative filter drop-shadow-2xl`}>
                  {tile.emoji}
                </div>
                {/* Clean Label */}
                <span className={`${isMobile ? 'text-sm' : 'text-base'} 
                  font-black text-center leading-tight text-white z-10 relative
                  drop-shadow-2xl tracking-wide`}
                  style={{ 
                    textShadow: '0 2px 8px rgba(0,0,0,0.8), 0 0 12px rgba(0,0,0,0.4)' 
                  }}>
                  {tile.title}
                </span>
              </Button>
            );
            });
          })()}
        </div>
      </div>

      {/* Tracker Insights Popup */}
      {selectedTracker && (
        <TrackerInsightsPopup
          isOpen={isInsightsOpen}
          onClose={closeInsights}
          trackerType={selectedTracker.type}
          trackerName={selectedTracker.name}
          trackerColor={selectedTracker.color}
        />
      )}

      {/* Health Check Modal */}
      <HealthCheckModal 
        isOpen={isHealthCheckOpen} 
        onClose={() => setIsHealthCheckOpen(false)} 
      />
      
      {/* Development Test Components */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-8 space-y-6">
          <CoachCtaDemo />
          <MealScoringTestComponent />
        </div>
      )}
      
      {/* Coming Soon Popup */}
      <ComingSoonPopup 
        isOpen={isComingSoonOpen} 
        onClose={() => setIsComingSoonOpen(false)}
        feature="Influencers"
      />
    </div>
  );
};

export default Home;

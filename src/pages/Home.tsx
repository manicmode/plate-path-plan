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

import { MoodForecastCard } from '@/components/MoodForecastCard';
import { useDeferredHydrationData } from '@/hooks/useDeferredHydrationData';
import { useDeferredDailyScore } from '@/hooks/useDeferredDailyScore';
import { useRealExerciseData } from '@/hooks/useRealExerciseData';
import { useSound } from '@/hooks/useSound';
import { SoundGate } from '@/lib/soundGate';
import { useTeamVictoryCelebrations } from '@/hooks/useTeamVictoryCelebrations';
import { useCriticalDataLoading, useDeferredHomeDataLoading, useNonCriticalDataLoading } from '@/hooks/useDeferredDataLoading';
import { MeditationNudgeBanner } from '@/components/meditation/MeditationNudgeBanner';
import { BreathingNudgeBanner } from '@/components/breathing/BreathingNudgeBanner';
import { LevelProgressBar } from '@/components/level/LevelProgressBar';
import { MoodCheckinBanner } from '@/components/mood/MoodCheckinBanner';
import { HomeDailyCheckInTab } from '@/components/home/HomeDailyCheckInTab';

import { RecentFoodsTab } from '@/components/camera/RecentFoodsTab';
import { SmartLogAI } from '@/components/SmartLogAI';
import SafeSection, { EmptyState } from '@/components/common/SafeSection';
import HomeLayout from '@/components/home/HomeLayout';

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

// Utility function to get suggested meal time based on current time
const getCurrentMealTime = () => {
  const now = new Date();
  const hour = now.getHours();
  
  if (hour >= 5 && hour < 11) {
    return "Usually eaten for breakfast";
  } else if (hour >= 11 && hour < 16) {
    return "Usually eaten for lunch";
  } else if (hour >= 16 && hour < 21) {
    return "Usually eaten for dinner";
  } else {
    return "Usually eaten as a snack";
  }
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
  const { playGoalHit, playFoodLogConfirm, playStartupChime, isEnabled } = useSound();
  
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

  // Startup chime playback - play once when app loads and user reaches home screen
  useEffect(() => {
    // Only attempt to play startup chime if sound is enabled
    if (!isEnabled) {
      
      return;
    }

    // Check if we've already played the startup chime today to prevent duplicates
    const today = new Date().toISOString().split('T')[0];
    const lastPlayedKey = `startup_chime_played_${today}`;
    const hasPlayedToday = localStorage.getItem(lastPlayedKey) === 'true';
    
    if (hasPlayedToday) {
      
      return;
    }

    // Wait for the app to fully load and render, then play startup chime
    const playStartupSound = async () => {
      try {
        // Small delay to ensure full render completion
        setTimeout(async () => {
          
          await playStartupChime();
          
          // Mark as played today to prevent duplicates
          localStorage.setItem(lastPlayedKey, 'true');
          
        }, 300);
      } catch (error) {
        console.warn('🔊 Startup chime failed to play:', error);
      }
    };

    // Only play if user is logged in and not in loading state
    if (user && !authLoading) {
      playStartupSound();
    }
  }, [user, authLoading, isEnabled, playStartupChime]);

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
      
      setCelebrationType('Calories Goal Smashed! 🔥');
      setShowCelebration(true);
      markCelebrationShown('calories');
      playGoalHit(); // Play celebration sound
    }
    
    // Hydration celebration - using real hydration data
    else if (isGoalFullyAchieved(actualHydration, hydrationGoal, hydrationLoading) && !hasShownCelebrationToday('hydration')) {
      
      setCelebrationType('Hydration Goal Achieved! 💧');
      setShowCelebration(true);
      markCelebrationShown('hydration');
      playGoalHit(); // Play celebration sound
    }
    
    // Supplements celebration
    else if (isGoalFullyAchieved(progress.supplements, supplementGoal) && !hasShownCelebrationToday('supplements')) {
      
      setCelebrationType('Supplements Complete! 💊');
      setShowCelebration(true);
      markCelebrationShown('supplements');
      playGoalHit(); // Play celebration sound
    }
    
    // Protein celebration
    else if (isGoalFullyAchieved(progress.protein, dailyTargets.protein || user?.targetProtein || 150) && !hasShownCelebrationToday('protein')) {
      
      setCelebrationType('Protein Goal Crushed! 💪');
      setShowCelebration(true);
      markCelebrationShown('protein');
      playGoalHit(); // Play celebration sound
    }
    
    // Carbs celebration
    else if (isGoalFullyAchieved(progress.carbs, dailyTargets.carbs || user?.targetCarbs || 200) && !hasShownCelebrationToday('carbs')) {
      
      setCelebrationType('Carbs Target Hit! 🍞');
      setShowCelebration(true);
      markCelebrationShown('carbs');
      playGoalHit(); // Play celebration sound
    }
    
    // Fat celebration
    else if (isGoalFullyAchieved(progress.fat, dailyTargets.fat || user?.targetFat || 65) && !hasShownCelebrationToday('fat')) {
      
      setCelebrationType('Fat Goal Achieved! 🥑');
      setShowCelebration(true);
      markCelebrationShown('fat');
      playGoalHit(); // Play celebration sound
    }
    
    // Fiber celebration
    else if (isGoalFullyAchieved((progress as any).fiber || 0, dailyTargets.fiber || 25) && !hasShownCelebrationToday('fiber')) {
      
      setCelebrationType('Fiber Target Reached! 🌾');
      setShowCelebration(true);
      markCelebrationShown('fiber');
      playGoalHit(); // Play celebration sound
    }
    
    // Saturated Fat celebration
    else if (isGoalFullyAchieved((progress as any).saturated_fat || 0, dailyTargets.saturated_fat || 20) && !hasShownCelebrationToday('saturated_fat')) {
      
      setCelebrationType('Sat Fat Goal Met! 🧈');
      setShowCelebration(true);
      markCelebrationShown('saturated_fat');
      playGoalHit(); // Play celebration sound
    }
    
    // Steps celebration
    else if (isGoalFullyAchieved(exerciseSummary.todaySteps, stepsGoal) && !hasShownCelebrationToday('steps')) {
      
      setCelebrationType('Step Goal Crushed! 👟');
      setShowCelebration(true);
      markCelebrationShown('steps');
      playGoalHit(); // Play celebration sound
    }
    
    // Exercise Calories celebration (300 kcal target)
    else if (isGoalFullyAchieved(exerciseSummary.todayCalories, 300) && !hasShownCelebrationToday('exercise_calories')) {
      
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

  // Real food selection handler - opens confirmation card for ALL food selections
  const handleFoodSelect = (foodItem: any) => {
    
    
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
    
    // Defer sound playback to ensure it plays after UI renders
    setTimeout(() => {
      try {
        
        SoundGate.markConfirm();
        playFoodLogConfirm().catch(error => {
          console.warn('🔊 [Home] Food log sound failed:', error);
          if (error.name === 'NotAllowedError') {
            
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
    
    retry();
    // Force a page refresh as last resort
    setTimeout(() => {
      if (authLoading) {
        window.location.reload();
      }
    }, 5000);
  };

  // Show loading state with recovery options

  // Show recovery options if loading has timed out

  const hasAnyContent = Boolean(
    progress.calories > 0 ||
    actualHydration > 0 ||
    progress.supplements > 0 ||
    (exerciseSummary?.todaySteps ?? 0) > 0 ||
    (todayScore ?? 0) > 0
  );

  // ---- SAFE LOCALS (additions to avoid TS/undefined crashes) ----
  const safeOpenInsights: (arg: any) => void =
    (globalThis as any).openInsights ?? (() => {});

  const safeExerciseSummary =
    (globalThis as any).exerciseSummary ?? { todaySteps: 0, todayCalories: 0, todayDuration: 0 };

  const safeStepsGoal  = (globalThis as any).stepsGoal ?? 0;
  const safeStepsPct   = (globalThis as any).stepsPercentage ?? 0;

  return (
    <HomeLayout>
      <div className="space-y-12 sm:space-y-16 animate-fade-in">
        {/* Minimal known-good content so Home never blanks */}
        <div className="rounded-xl border border-white/10 p-4">
          <div className="text-sm opacity-70">Home is loading…</div>
        </div>

        {/* Steps & Exercise (safe locals used) */}
        <div className="grid grid-cols-2 gap-3 items-stretch mt-8">
          {/* Steps */}
          <Card
            className="border-0 rounded-2xl overflow-hidden cursor-pointer h-36"
            onClick={() => safeOpenInsights({ type: 'steps', name: 'Steps', color: '#3B82F6' })}
            style={{ background: 'var(--activity-steps-gradient)', boxShadow: 'var(--activity-steps-glow)' }}
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
                    {safeExerciseSummary.todaySteps.toLocaleString()}
                  </div>
                  <div className="text-sm text-white/70">
                    Goal: {safeStepsGoal.toLocaleString()}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm text-white/80">
                    <span>{Math.round(safeStepsPct)}%</span>
                    <span>Complete</span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-1.5">
                    <div
                      className="bg-white h-1.5 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${Math.min(safeStepsPct, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Exercise */}
          <Card
            className="border-0 rounded-2xl overflow-hidden cursor-pointer h-36"
            onClick={() => safeOpenInsights({ type: 'exercise', name: 'Exercise', color: '#EF4444' })}
            style={{ background: 'var(--activity-exercise-gradient)', boxShadow: 'var(--activity-exercise-glow)' }}
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
                    {safeExerciseSummary.todayCalories}
                  </div>
                  <div className="text-sm text-white/70">calories burned</div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm text-white/80">
                    <span>
                      {Math.floor(safeExerciseSummary.todayDuration / 60)}h{' '}
                      {safeExerciseSummary.todayDuration % 60}m
                    </span>
                    <span>Duration</span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-1.5">
                    <div
                      className="bg-white h-1.5 rounded-full transition-all duration-500 ease-out"
                      style={{
                        width: `${Math.min(((safeExerciseSummary.todayDuration / 60) * 100), 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </HomeLayout>
  );
};

export default Home;

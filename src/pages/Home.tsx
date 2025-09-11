// 🔒 UI-LOCK: Do not change Home UI without approval. Restore tag: home-restore-2025-08-10

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Camera, TrendingUp, Droplets, Pill, Zap, Target, Sparkles, ChevronDown, ChevronUp, Clock, MoreHorizontal, RefreshCw, Plus, Activity, Timer, Footprints, Dumbbell, Atom } from 'lucide-react';
import { useAuth } from '@/contexts/auth';
import { useNutrition } from '@/contexts/NutritionContext';
import { useDailyScore } from '@/hooks/useDailyScore';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef, useCallback } from 'react';
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
import { ROUTES } from '@/routes/constants';
import { safeStorage, safeGetJSON, safeSetJSON } from '@/lib/safeStorage';
import { ExerciseLogForm, ExerciseData } from '@/components/ExerciseLogForm';
import { ExerciseReminderForm } from '@/components/ExerciseReminderForm';
import { useToxinDetections } from '@/hooks/useToxinDetections';
import { displayName } from '@/utils/displayName';
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
import { LevelProgressBar } from '@/components/level/LevelProgressBar';
import { useNudgeScheduler } from '@/hooks/useNudgeScheduler';
import { HomeDailyCheckInTab } from '@/components/home/HomeDailyCheckInTab';
import { InfluencerHubCTA } from '@/components/InfluencerHubCTA';
import { TrackerTile } from '@/components/trackers/TrackerTile';
import { setHomeTrackerAt, getHomeTrackers } from '@/store/userPrefs';
import { TrackerKey } from '@/lib/trackers/trackerRegistry';
import { isFeatureEnabled } from '@/lib/featureFlags';

import { RecentFoodsTab } from '@/components/camera/RecentFoodsTab';
import { SmartLogAI } from '@/components/SmartLogAI';

// STEP 2: Forensics - log first Home mount
let homeFirstMountLogged = false;

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
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const { user, loading: authLoading } = useAuth();
  const { getTodaysProgress, getHydrationGoal, getSupplementGoal, addFood } = useNutrition();

  useEffect(() => {
    // STEP 2: Forensics - log home first mount only
    if (!homeFirstMountLogged) {
      console.log('[home] first mount', performance.now());
      homeFirstMountLogged = true;
    }
    
    document.body.classList.remove('splash-visible');
    const splash = document.getElementById('SplashRoot');
    if (splash) splash.style.display = 'none';

    // Make sure the page is visible
    document.documentElement.style.visibility = 'visible';
    document.body.style.visibility = 'visible';

    // Mark paint
    requestAnimationFrame(() => {
      (window as any).__homePainted = true;
    });

    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, []);
  
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
  
  // Nudge scheduler integration
  const { selectedNudges, loading: nudgesLoading, dismissNudge, ctaNudge } = useNudgeScheduler();
  
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

  // Temporary debug helper for forensic analysis
  const debugScroll = (label: string, el?: HTMLElement | null) => {
    const scroller = document.scrollingElement || document.documentElement;
    const y = scroller.scrollTop;
    const vh = window.innerHeight;
    const r = el ? el.getBoundingClientRect() : null;
    // eslint-disable-next-line no-console
    console.log(`[FoldBack][${label}]`, {
      y, vh,
      elTop: r?.top, elBottom: r?.bottom, elHeight: el ? el.offsetHeight : undefined,
    });
  };

  // Robust scroll compensation hook
  const useStableCollapse = useCallback(() => {
    return useCallback((contentEl: HTMLElement | null, runToggle: () => void) => {
      const scroller = document.scrollingElement || document.documentElement;
      const startY = scroller.scrollTop;
      const beforeRect = contentEl?.getBoundingClientRect();
      const beforeHeight = contentEl?.offsetHeight ?? 0;

      // Snapshot taken; run the state change
      runToggle();

      // Listen for the height transition to finish; fallback to a short timeout
      let done = false;
      const onEnd = () => {
        if (done) return;
        done = true;
        if (!contentEl) return;

        const afterHeight = contentEl.offsetHeight;
        const delta = beforeHeight - afterHeight; // positive when collapsing

        // If the top of the content was above the viewport when user tapped Fold Back,
        // removing height will cause upward re-anchoring — compensate by moving up by delta.
        if (delta > 0 && beforeRect) {
          scroller.scrollTop = startY - delta;
        }

        contentEl.removeEventListener('transitionend', onEnd);
      };

      if (contentEl) {
        contentEl.addEventListener('transitionend', onEnd, { once: true });
        // Fallback in case there is no transition or the event is swallowed
        window.setTimeout(onEnd, 220);
      } else {
        window.setTimeout(onEnd, 0);
      }
    }, []);
  }, []);

  const stableToggle = useStableCollapse();

  // Refs for collapsible content elements
  const nutrientsContentRef = useRef<HTMLDivElement>(null);
  const micronutrientsContentRef = useRef<HTMLDivElement>(null);
  const toxinsContentRef = useRef<HTMLDivElement>(null);

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

    const handleTrackerChange = () => {
      const newPreferences = loadUserPreferences();
      if (JSON.stringify(newPreferences) !== JSON.stringify(preferences)) {
        setPreferences(newPreferences);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('homeTrackerChanged', handleTrackerChange);
    
    const interval = setInterval(handleTrackerChange, 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('homeTrackerChanged', handleTrackerChange);
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
  const storedTrackers = preferences.selectedTrackers || ['calories', 'hydration', 'supplements'];

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
  const selectedTrackers = getHomeTrackers();
  const displayedTrackers = selectedTrackers.map(trackerId => allTrackerConfigs[trackerId]).filter(Boolean);

  // Handle quick swap
  const handleQuickSwap = async (index: 0 | 1 | 2, newKey: TrackerKey) => {
    try {
      await setHomeTrackerAt(index, newKey);
      
      // Success feedback
      if ('vibrate' in navigator) {
        navigator.vibrate([30, 100, 30]);
      }
    } catch (error) {
      toast({
        title: "Swap Failed",
        description: error instanceof Error ? error.message : "Couldn't switch tracker. Try again.",
        variant: "destructive",
      });
    }
  };

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

  // Runtime gap correction effect - Home page only
  useEffect(() => {
    const header = document.querySelector<HTMLElement>("#app-header");
    const target = document.querySelector<HTMLElement>("#home-correction");
    if (!header || !target) return;

    const compute = () => {
      // bottom of sticky header in viewport
      const headerBottom = header.getBoundingClientRect().bottom;

      // top of our first content container in viewport
      const targetTop = target.getBoundingClientRect().top;

      // positive gap means content is pushed down; we subtract it
      const gap = Math.round(targetTop - headerBottom);

      // apply very aggressive negative margin - deduct gap plus extra 48px to force content up
      const correction = gap > 0 ? -(gap + 48) : -48;

      target.style.setProperty("--home-top-correct", `${correction}px`);
    };

    // initial + whenever window size, safe-area, or fonts change
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(document.documentElement);
    ro.observe(header);
    ro.observe(target);

    window.addEventListener("orientationchange", compute);
    window.addEventListener("scroll", compute, { passive: true }); // header can change height on scroll in some UIs

    return () => {
      ro.disconnect();
      window.removeEventListener("orientationchange", compute);
      window.removeEventListener("scroll", compute);
    };
  }, []);

  return (
    <div className="home-root">
      {/* correction wrapper — this is the element we'll nudge up */}
        <div
          id="home-correction"
          ref={anchorRef}
          style={{ marginTop: "-40px" }}
        >
        <div data-home-content className="space-y-12 sm:space-y-16 animate-fade-in pb-24 sm:pb-28">
          {/* Scheduled Nudges */}
          {!nudgesLoading && selectedNudges.map((nudge) => {
            const Component = nudge.definition.render;
            return (
              <div key={nudge.runId}>
                <Component
                  runId={nudge.runId}
                  onDismiss={() => dismissNudge(nudge)}
                  onCta={() => ctaNudge(nudge)}
                />
              </div>
            );
          })}

      {/* Celebration Popup */}
      <CelebrationPopup 
        show={showCelebration} 
        message={celebrationMessage || celebrationType}
        onClose={() => setShowCelebration(false)}
      />

      {/* Food Confirmation Card */}
      {showConfirmationCard && selectedFood && (
        <FoodConfirmationCard
          mode="standard"
          isOpen={showConfirmationCard}
          onClose={() => {
            setShowConfirmationCard(false);
            setSelectedFood(null);
          }}
          onConfirm={handleConfirmFood}
          foodItem={selectedFood}
        />
      )}

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
          <h2 className={`${isMobile ? 'text-3xl' : 'text-5xl'} font-bold neon-text relative normal-case`}>
            {displayName(user?.name?.split(' ')[0]) || 'Superstar'}! 
            <span className="inline-block ml-2 animate-pulse-scale motion-reduce:animate-none">✨</span>
          </h2>
        </div>
        <HomeCtaTicker className={`${isMobile ? 'text-lg' : 'text-xl'} train-slide motion-reduce:animate-none`} />
      </div>

      {/* Dynamic Tracker Cards based on user selection */}
      <div className={`grid grid-cols-3 ${isMobile ? 'gap-3 mx-2' : 'gap-4 mx-4'} animate-scale-in items-stretch relative z-10`}>
        {displayedTrackers.map((tracker, index) => (
          <TrackerTile
            key={tracker.name}
            tracker={tracker}
            index={index as 0 | 1 | 2}
            visibleTrackers={selectedTrackers}
            onQuickSwap={handleQuickSwap}
            getMotivationalMessage={getMotivationalMessage}
          />
        ))}
      </div>

      {/* Enhanced Logging Actions Section with proper spacing */}
      <div className="space-y-6 sm:space-y-8 px-2 sm:px-4">
        {/* Primary Action: Log Food - Full Width */}
        <Card 
          className="modern-action-card log-food-card border-0 rounded-3xl overflow-hidden hover:scale-[1.02] transition-all duration-500 cursor-pointer"
          onClick={() => navigate('/camera')}
        >
          <CardContent className={`${isMobile ? 'p-6' : 'p-8'} text-center`}>
            <div className="flex flex-col items-center space-y-4">
              <div className={`${isMobile ? 'w-16 h-16' : 'w-20 h-20'} bg-gradient-to-br from-blue-500 to-sky-500 rounded-3xl flex items-center justify-center log-food-glow`}>
                <Camera className={`${isMobile ? 'h-8 w-8' : 'h-10 w-10'} text-white`} />
              </div>
              <div className="space-y-2">
                <h3 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-gray-800 dark:text-gray-100`}>
                  Log Food
                </h3>
                <p className={`${isMobile ? 'text-sm' : 'text-base'} text-gray-600 dark:text-gray-400`}>
                  Exercise, Recovery & Habit
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SmartLog AI Predictions - Separate section with custom spacing */}
      <div className="mt-16 mb-6 sm:mb-8 px-2 sm:px-4">
        <SmartLogAI onFoodSelect={(food) => {
          
          
          // Create food item with estimated nutritional values for the confirmation modal
          const foodItem = {
            name: food.name,
            food_name: food.name,
            calories: food.calories,
            protein: Math.round(food.calories * 0.15 / 4), // 15% of calories from protein
            carbs: Math.round(food.calories * 0.45 / 4), // 45% from carbs
            fat: Math.round(food.calories * 0.35 / 9), // 35% from fat
            fiber: Math.round(food.calories / 100), // Rough estimate
            sugar: Math.round(food.calories * 0.1 / 4), // 10% from sugar
            sodium: Math.round(food.calories * 0.5), // Rough estimate in mg
            saturated_fat: Math.round(food.calories * 0.1 / 9), // 10% of fat calories
            serving_size: '1 serving',
            source: 'SmartLog AI',
            quality_score: 70, // Default moderate score
            confidence: 0.8,
            // Add suggested meal time based on current time
            suggestedMealTime: getCurrentMealTime(),
            // Default portion size
            portionPercentage: 100
          };

          // Open the confirmation modal instead of immediately logging
          setSelectedFood(foodItem);
          setShowConfirmationCard(true);
        }} />
      </div>

      {/* Secondary Actions Section */}
      <div className="space-y-6 sm:space-y-8 px-2 sm:px-4">

        {/* Secondary Actions: Hydration & Supplements */}
        <div className={`grid grid-cols-2 ${isMobile ? 'gap-4' : 'gap-6'} items-stretch`}>
          {/* Enhanced Hydration Action Card */}
          <Card 
            className={`modern-action-card hydration-action-card border-0 rounded-3xl overflow-hidden hover:scale-105 transition-all duration-500 cursor-pointer ${isMobile ? 'h-36' : 'h-40'}`}
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
            className={`modern-action-card supplements-action-card border-0 rounded-3xl overflow-hidden hover:scale-105 transition-all duration-500 cursor-pointer ${isMobile ? 'h-36' : 'h-40'}`}
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

      {/* Enhanced Net Calorie Card - Separate section with proper spacing */}
      <div className="mt-16 px-2 sm:px-4">
        <div>
          <Card 
            className={`modern-action-card net-calories-card border-0 rounded-3xl overflow-hidden hover:scale-[1.02] transition-all duration-500`}
          >
          <CardContent className={`${isMobile ? 'p-5' : 'p-6'} relative`}>
            {/* Action Buttons - Upper Right Corner */}
            <div className="absolute top-4 right-4 flex flex-col gap-2">
              <button
                onClick={() => setShowExerciseForm(true)}
                className="action-button-compact log-workout-button"
              >
                <Plus className="h-3 w-3" />
                {isMobile ? 'Workout' : 'Log Workout'}
              </button>
              <button
                onClick={() => setShowExerciseReminder(true)}
                className="action-button-compact set-reminder-button"
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
        </div>

        {/* Steps and Exercise Cards Container */}
        <div className={`grid grid-cols-2 gap-3 items-stretch mt-8`}>
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

      {/* Level & XP Progress Bar (moved directly under Today's Performance) */}
      <div className="px-4 sm:px-6 -mt-4 mb-6">
        <LevelProgressBar />
      </div>

      {/* Enhanced AI Insights Window */}
      <div className="-mt-12">
        <HomeAIInsights />
      </div>


      {/* Daily Check-In Home Tab */}
      <div className="px-2 sm:px-4 mb-3">
        <HomeDailyCheckInTab />
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
      <div className="space-y-6 sm:space-y-8 px-2 sm:px-4 mt-8" style={{ overflowAnchor: 'none' }}>
        <Collapsible open={isNutrientsExpanded} onOpenChange={(next) => {
          debugScroll('before', nutrientsContentRef.current);
          stableToggle(nutrientsContentRef.current, () => setIsNutrientsExpanded(next));
          debugScroll('after', nutrientsContentRef.current);
        }}>
          <CollapsibleTrigger asChild onPointerDown={(e) => e.preventDefault()}>
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
          
          <CollapsibleContent ref={nutrientsContentRef} className="space-y-6">
            <div className="flex justify-center pt-6">
              <div className={`grid grid-cols-2 ${isMobile ? 'gap-x-4 gap-y-8 max-w-sm' : 'gap-x-6 gap-y-10 max-w-4xl'} w-full`}>
                {macroCards.map((macro, index) => {
                  const percentage = Math.min((macro.current / macro.target) * 100, 100);
                  const Icon = macro.icon;
                  
                  const getProgressColor = (name: string) => {
                    switch (name) {
                      case 'Calories':
                        return 'from-emerald-400 to-emerald-600';
                      case 'Protein':
                        return 'from-cyan-400 to-blue-500 dark:from-cyan-300 dark:to-blue-400';
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
                    <div key={macro.name} className="space-y-3">
                      <Card
                        className={`modern-nutrient-card nutrients-card border-0 ${isMobile ? 'h-40' : 'h-44'} rounded-3xl animate-slide-up hover:scale-105 transition-all duration-500 w-full cursor-pointer`}
                        style={{ animationDelay: `${index * 100}ms` }}
                        onClick={() => openInsights({ 
                          type: macro.name.toLowerCase(), 
                          name: macro.name, 
                          color: getProgressColor(macro.name) 
                        })}
                      >
                        <CardContent className="flex flex-col justify-center h-full p-0">
                          <div className={`${isMobile ? 'p-4' : 'p-5'} text-center`}>
                            <div className={`${isMobile ? 'w-12 h-12' : 'w-14 h-14'} bg-gradient-to-br ${macro.color} rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg`}>
                              <Icon className={`${isMobile ? 'h-6 w-6' : 'h-7 w-7'} text-white`} />
                            </div>
                            <h4 className={`font-bold text-gray-900 dark:text-white mb-2 ${isMobile ? 'text-sm' : 'text-base'} leading-tight`}>{macro.name}</h4>
                            <p className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold neon-text leading-tight`}>
                              {macro.current.toFixed(0)}{macro.unit}
                            </p>
                            <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-500 dark:text-gray-400 leading-tight`}>
                              of {macro.target}{macro.unit}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                      {/* Progress bar outside and below the tile - shorter and centered */}
                      <div className="flex justify-center">
                        <div className={`${isMobile ? 'w-24' : 'w-32'} bg-gray-200 dark:bg-gray-700 rounded-full h-2`}>
                          <div
                            className={`bg-gradient-to-r ${getProgressColor(macro.name)} h-2 rounded-full transition-all duration-1500 shadow-sm`}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Fold Back Button - Matches Expand style */}
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-center gap-2 cursor-pointer hover:opacity-80 transition-opacity pt-4" onPointerDown={(e) => e.preventDefault()}>
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
      <div className="space-y-6 sm:space-y-8 px-2 sm:px-4" style={{ overflowAnchor: 'none' }}>
        <Collapsible open={isMicronutrientsExpanded} onOpenChange={(next) => {
          debugScroll('before', micronutrientsContentRef.current);
          stableToggle(micronutrientsContentRef.current, () => setIsMicronutrientsExpanded(next));
          debugScroll('after', micronutrientsContentRef.current);
        }}>
          <CollapsibleTrigger asChild onPointerDown={(e) => e.preventDefault()}>
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
          
          <CollapsibleContent ref={micronutrientsContentRef} className="space-y-6">
            <div className="flex justify-center pt-6">
              <div className={`grid grid-cols-2 ${isMobile ? 'gap-x-4 gap-y-8 max-w-sm' : 'gap-x-6 gap-y-10 max-w-4xl'} w-full`}>
                {micronutrientCards.map((micro, index) => {
                  const percentage = Math.min((micro.current / micro.target) * 100, 100);
                  const Icon = micro.icon;
                  
                  return (
                    <div key={micro.name} className="space-y-3">
                      <Card
                        className={`modern-nutrient-card nutrients-card border-0 ${isMobile ? 'h-40' : 'h-44'} rounded-3xl animate-slide-up hover:scale-105 transition-all duration-500 w-full cursor-pointer`}
                        style={{ animationDelay: `${index * 100}ms` }}
                        onClick={() => openInsights({ 
                          type: micro.name.toLowerCase(), 
                          name: micro.name, 
                          color: micro.color 
                        })}
                      >
                        <CardContent className="flex flex-col justify-center h-full p-0">
                          <div className={`${isMobile ? 'p-4' : 'p-5'} text-center`}>
                            <div className={`${isMobile ? 'w-12 h-12' : 'w-14 h-14'} bg-gradient-to-br ${micro.color} rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg`}>
                              <Icon className={`${isMobile ? 'h-6 w-6' : 'h-7 w-7'} text-white`} />
                            </div>
                            <h4 className={`font-bold text-gray-900 dark:text-white mb-2 ${isMobile ? 'text-sm' : 'text-base'} leading-tight`}>{micro.name}</h4>
                            <p className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold neon-text leading-tight`}>
                              {micro.current.toFixed(0)}{micro.unit}
                            </p>
                            <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-500 dark:text-gray-400 leading-tight`}>
                              of {micro.target}{micro.unit}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                      {/* Progress bar outside and below the tile - shorter and centered */}
                      <div className="flex justify-center">
                        <div className={`${isMobile ? 'w-24' : 'w-32'} bg-gray-200 dark:bg-gray-700 rounded-full h-2`}>
                          <div
                            className={`bg-gradient-to-r ${micro.color} h-2 rounded-full transition-all duration-1500 shadow-sm`}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Fold Back Button - Matches Expand style */}
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-center gap-2 cursor-pointer hover:opacity-80 transition-opacity pt-4" onPointerDown={(e) => e.preventDefault()}>
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
      <div className="space-y-6 sm:space-y-8 px-2 sm:px-4" style={{ overflowAnchor: 'none' }}>
        <Collapsible open={isToxinsExpanded} onOpenChange={(next) => {
          debugScroll('before', toxinsContentRef.current);
          stableToggle(toxinsContentRef.current, () => setIsToxinsExpanded(next));
          debugScroll('after', toxinsContentRef.current);
        }}>
          <CollapsibleTrigger asChild onPointerDown={(e) => e.preventDefault()}>
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
          
          <CollapsibleContent ref={toxinsContentRef} className="space-y-6">
            <div className="flex justify-center pt-6">
              <div className={`grid grid-cols-2 ${isMobile ? 'gap-x-4 gap-y-8 max-w-sm' : 'gap-x-6 gap-y-10 max-w-4xl'} w-full`}>
                {realToxinData.map((item, index) => {
                  const isOverThreshold = item.current > item.threshold;
                  
                  return (
                    <div key={item.name} className="space-y-3">
                      <Card
                        className={`modern-nutrient-card border-0 ${isMobile ? 'h-40' : 'h-44'} rounded-3xl animate-slide-up hover:scale-105 transition-all duration-500 shadow-lg hover:shadow-xl w-full cursor-pointer ${
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
                          <div className={`${isMobile ? 'p-4' : 'p-5'} h-full flex flex-col text-center justify-center`}>
                            <div className={`${isMobile ? 'w-12 h-12' : 'w-14 h-14'} ${item.bgColor} rounded-2xl flex items-center justify-center mx-auto mb-2 shadow-lg`}>
                              <span className={`${isMobile ? 'text-xl' : 'text-2xl'}`}>{item.icon}</span>
                            </div>
                            <h4 className={`font-bold text-gray-900 dark:text-white ${isMobile ? 'text-sm' : 'text-base'} leading-tight mb-2`}>
                              {item.name}
                            </h4>
                            <p className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold leading-tight mb-1 ${
                              isOverThreshold ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                            }`}>
                              {item.current}
                            </p>
                            <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-500 dark:text-gray-400 leading-tight`}>
                              Limit: {item.threshold} {item.unit}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                      {/* Alert indicator outside and below the tile */}
                      <div className="flex justify-center">
                        <span className={`${isMobile ? 'text-lg' : 'text-xl'}`}>
                          {isOverThreshold ? '🚨🚨🚨' : '✅✅✅'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Fold Back Button - Matches Expand style */}
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-center gap-2 cursor-pointer hover:opacity-80 transition-opacity pt-4" onPointerDown={(e) => e.preventDefault()}>
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
                emoji: '💊',
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
                title: 'Influencer Hub',
                emoji: '⭐️',
                color: 'from-blue-600 via-cyan-400 to-cyan-600',
                shadowColor: 'shadow-cyan-500/40',
                glowColor: 'hover:shadow-cyan-400/60',
                animatedGradient: 'bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-600',
              },
              {
                id: 'habit-central',
                title: 'Habit Central',
                emoji: '⏳',
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
                    // Check if Scan Hub is enabled
                    if (isFeatureEnabled('scan_hub_enabled')) {
                      navigate('/scan', { state: { from: '/' } });
                    } else {
                      setIsHealthCheckOpen(true);
                    }
                } else if (tileId === 'game-challenge') {
                  navigate('/game-and-challenge');
                } else if (tileId === 'influencers') {
                  // Fire analytics event
                  if (typeof window !== 'undefined' && (window as any).gtag) {
                    (window as any).gtag('event', 'influencer_hub.nav_open_from_home');
                  }
                  navigate(ROUTES.INFLUENCER_HUB);
                } else if (tileId === 'exercise-hub') {
                  navigate('/exercise-hub');
                } else if (tileId === 'habit-central') {
                  // Store entry point for back navigation
                  sessionStorage.setItem('habitCentralEntryPoint', '/home');
                  navigate('/habit-central', { state: { from: '/home' } });
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
        onClose={() => {
          setIsHealthCheckOpen(false);
          // Always navigate to health scan page when closing barcode scanner
          navigate('/scan');
        }} 
      />
      
      
      {/* Coming Soon Popup */}
      <ComingSoonPopup 
        isOpen={isComingSoonOpen} 
        onClose={() => setIsComingSoonOpen(false)}
        feature="Influencers"
      />
        </div>
      </div>
    </div>
  );
};

export default Home;
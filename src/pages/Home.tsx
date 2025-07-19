import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Camera, TrendingUp, RefreshCw, Plus } from 'lucide-react';
import { useAuth } from '@/contexts/auth';
import { useNutrition } from '@/contexts/NutritionContext';
import { useDailyScore } from '@/hooks/useDailyScore';
import { useActiveChallenges } from '@/contexts/ActiveChallengesContext';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useScrollToTop } from '@/hooks/useScrollToTop';
import { useLoadingTimeout } from '@/hooks/useLoadingTimeout';
import CelebrationPopup from '@/components/CelebrationPopup';
import { useToast } from '@/hooks/use-toast';
import { useTrackerInsights } from '@/hooks/useTrackerInsights';
import { HealthCheckModal } from '@/components/health-check/HealthCheckModal';
import { DailyScoreCard } from '@/components/analytics/DailyScoreCard';
import { supabase } from '@/integrations/supabase/client';
import { safeStorage, safeGetJSON, safeSetJSON } from '@/lib/safeStorage';

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
  const { getTodaysProgress, getHydrationGoal, getSupplementGoal, currentDay } = useNutrition();
  const { todayScore, scoreStats, loading: scoreLoading } = useDailyScore();
  const { activeChallenges } = useActiveChallenges();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const progress = getTodaysProgress();
  const { toast } = useToast();
  
  // State for user profile data
  const [userProfile, setUserProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  
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
  
  // State management for UI interactions
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationType, setCelebrationType] = useState('');
  const [preferences, setPreferences] = useState(loadUserPreferences());
  const [isHealthCheckOpen, setIsHealthCheckOpen] = useState(false);
  
  // Tracker Insights state
  const { isOpen: isInsightsOpen, selectedTracker, openInsights, closeInsights } = useTrackerInsights();
  
  // Use the scroll-to-top hook
  useScrollToTop();

  // Loading timeout with recovery
  const { hasTimedOut, showRecovery, retry } = useLoadingTimeout(authLoading || profileLoading, {
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

  // Load user profile data
  useEffect(() => {
    const loadUserProfile = async () => {
      if (!user?.id) {
        setProfileLoading(false);
        return;
      }
      
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (error) {
          console.error('Error loading user profile:', error);
        } else if (data) {
          setUserProfile(data);
          console.log('🏠 Loaded user profile for Home:', data);
        }
      } catch (err) {
        console.error('Profile loading error:', err);
      } finally {
        setProfileLoading(false);
      }
    };
    
    loadUserProfile();
  }, [user?.id]);

  // Load daily targets from database or generate them
  useEffect(() => {
    const loadOrGenerateDailyTargets = async () => {
      if (!user?.id) return;
      
      const today = new Date().toISOString().split('T')[0];
      
      try {
        // First try to load existing targets
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
        } else {
          // No targets found, generate them using the edge function
          console.log('📊 No daily targets found, generating...');
          const { data: generatedData, error: generateError } = await supabase.functions.invoke('calculate-daily-targets', {
            body: { user_id: user.id, target_date: today }
          });
          
          if (generatedData && !generateError) {
            console.log('📊 Generated daily targets:', generatedData);
            // Load the newly generated targets
            const { data: newData } = await supabase
              .from('daily_nutrition_targets')
              .select('calories, protein, carbs, fat, fiber, sugar, sodium, saturated_fat, hydration_ml, supplement_count')
              .eq('user_id', user.id)
              .eq('target_date', today)
              .maybeSingle();
              
            if (newData) {
              setDailyTargets({
                calories: newData.calories,
                protein: newData.protein,
                carbs: newData.carbs,
                fat: newData.fat,
                fiber: newData.fiber,
                sugar: newData.sugar,
                sodium: newData.sodium,
                saturated_fat: newData.saturated_fat,
                hydration_ml: newData.hydration_ml,
                supplement_count: newData.supplement_count
              });
            }
          }
        }
      } catch (err) {
        console.error('Error loading/generating daily targets:', err);
        // Use fallback values from user profile or defaults
        setDailyTargets({
          calories: userProfile?.target_calories || 2000,
          protein: userProfile?.target_protein || 150,
          carbs: userProfile?.target_carbs || 200,
          fat: userProfile?.target_fat || 65,
          fiber: 25,
          sugar: 50,
          sodium: 2300,
          saturated_fat: 20,
          hydration_ml: 2000,
          supplement_count: 3
        });
      }
    };
    
    loadOrGenerateDailyTargets();
  }, [user?.id, userProfile]);

  // Update preferences when user state changes
  useEffect(() => {
    if (userProfile?.selected_trackers) {
      setPreferences({ selectedTrackers: userProfile.selected_trackers });
    } else if (user?.selectedTrackers) {
      setPreferences({ selectedTrackers: user.selectedTrackers });
    }
  }, [userProfile?.selected_trackers, user?.selectedTrackers]);

  // Calculate nutrition values with proper fallbacks
  const totalCalories = dailyTargets.calories || userProfile?.target_calories || 2000;
  const currentCalories = progress.calories;
  const progressPercentage = Math.min((currentCalories / totalCalories) * 100, 100);

  const hydrationGoal = dailyTargets.hydration_ml || getHydrationGoal();
  const hydrationPercentage = Math.min((progress.hydration / hydrationGoal) * 100, 100);

  const supplementGoal = dailyTargets.supplement_count || getSupplementGoal();
  const supplementPercentage = Math.min((progress.supplements / supplementGoal) * 100, 100);

  // Helper function to check if celebration was already shown today
  const getCelebrationKey = (type: string) => {
    const today = new Date().toISOString().split('T')[0];
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

  // Use preferences from profile/localStorage/state with proper fallbacks
  const selectedTrackers = userProfile?.selected_trackers || preferences.selectedTrackers || ['calories', 'hydration', 'supplements'];

  // Show loading state while essential data is loading
  const isDataLoading = authLoading || profileLoading || !user;
  
  // Show personalized greeting with user data
  const getUserGreeting = () => {
    const firstName = userProfile?.first_name || user?.email?.split('@')[0] || 'there';
    const hour = new Date().getHours();
    if (hour < 12) return `Good morning, ${firstName}!`;
    if (hour < 18) return `Good afternoon, ${firstName}!`;
    return `Good evening, ${firstName}!`;
  };

  // Check if user has logged anything today
  const hasActivityToday = currentDay && (currentDay.foods.length > 0 || currentDay.hydration.length > 0 || currentDay.supplements.length > 0);
  
  // Show onboarding prompt if user hasn't completed profile
  const showOnboardingPrompt = userProfile && !userProfile.onboarding_completed;
  
  // Enhanced loading state with better UX
  if (isDataLoading && !hasTimedOut) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/20">
        <div className="text-center space-y-4 animate-pulse">
          <div className="h-8 w-48 bg-muted rounded-lg mx-auto" />
          <div className="h-4 w-32 bg-muted rounded mx-auto" />
          <div className="grid grid-cols-3 gap-4 mt-8">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 w-32 bg-muted rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Show error recovery if loading timed out
  if (hasTimedOut) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/20">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold">Connection Issue</h2>
          <p className="text-muted-foreground">Unable to load your nutrition data</p>
          <Button onClick={retry} className="mt-4">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // Enhanced tracker configurations with real data integration
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
      hasData: currentDay.foods.length > 0,
    },
    protein: {
      name: 'Protein',
      current: Math.round(progress.protein),
      target: Math.round(dailyTargets.protein || userProfile?.target_protein || 150),
      unit: 'g',
      color: 'from-blue-500/20 via-indigo-500/15 to-purple-500/10',
      gradient: 'proteinGradientVibrant',
      emoji: '💪',
      textColor: 'text-blue-900 dark:text-white',
      textColorSecondary: 'text-blue-800 dark:text-blue-100',
      percentage: Math.min((progress.protein / (dailyTargets.protein || userProfile?.target_protein || 150)) * 100, 100),
      shadow: 'shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:shadow-[0_0_30px_rgba(59,130,246,0.6)]',
      onClick: () => navigate('/camera'),
      hasData: currentDay.foods.length > 0,
    },
    carbs: {
      name: 'Carbs',
      current: Math.round(progress.carbs),
      target: Math.round(dailyTargets.carbs || userProfile?.target_carbs || 200),
      unit: 'g',
      color: 'from-yellow-500/20 via-orange-500/15 to-red-500/10',
      gradient: 'carbsGradientVibrant',
      emoji: '🍞',
      textColor: 'text-yellow-900 dark:text-white',
      textColorSecondary: 'text-yellow-800 dark:text-yellow-100',
      percentage: Math.min((progress.carbs / (dailyTargets.carbs || userProfile?.target_carbs || 200)) * 100, 100),
      shadow: 'shadow-[0_0_20px_rgba(251,191,36,0.4)] hover:shadow-[0_0_30px_rgba(251,191,36,0.6)]',
      onClick: () => navigate('/camera'),
      hasData: currentDay.foods.length > 0,
    },
    fat: {
      name: 'Fat',
      current: Math.round(progress.fat),
      target: Math.round(dailyTargets.fat || userProfile?.target_fat || 65),
      unit: 'g',
      color: 'from-green-500/20 via-emerald-500/15 to-teal-500/10',
      gradient: 'fatGradientVibrant',
      emoji: '🥑',
      textColor: 'text-green-900 dark:text-white',
      textColorSecondary: 'text-green-800 dark:text-green-100',
      percentage: Math.min((progress.fat / (dailyTargets.fat || userProfile?.target_fat || 65)) * 100, 100),
      shadow: 'shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:shadow-[0_0_30px_rgba(16,185,129,0.6)]',
      onClick: () => navigate('/camera'),
      hasData: currentDay.foods.length > 0,
    },
    hydration: {
      name: 'Hydration',
      current: Math.round(progress.hydration),
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
      hasData: currentDay.hydration.length > 0,
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
      hasData: currentDay.supplements.length > 0,
    },
  };

  // Get the selected tracker configs with real data indicators
  const displayedTrackers = selectedTrackers.map(trackerId => allTrackerConfigs[trackerId]).filter(Boolean);

  // Enhanced motivational messages based on real data
  const getMotivationalMessage = (percentage: number, type: string, hasData: boolean) => {
    if (!hasData) return `Ready to start tracking your ${type.toLowerCase()}? 🚀`;
    if (percentage >= 100) return `${type} goal crushed! Amazing! 🎉`;
    if (percentage >= 80) return `Almost there! Just ${100 - Math.round(percentage)}% to go! 💪`;
    if (percentage >= 50) return `Great progress! Keep it up! 🔥`;
    if (percentage >= 25) return `Good start! You've got this! ⭐`;
    return `Making progress with your ${type.toLowerCase()}! 🌟`;
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Enhanced Header with Personalized Greeting */}
      <div className="text-center space-y-2 pt-4">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-blue-500 to-emerald-500 bg-clip-text text-transparent leading-tight">
          {getUserGreeting()}
        </h1>
        <p className="text-lg text-muted-foreground max-w-md mx-auto">
          {hasActivityToday 
            ? "You're making great progress today!" 
            : "Your intelligent wellness companion is ready"
          }
        </p>
        {showOnboardingPrompt && (
          <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              Complete your profile setup for personalized nutrition goals
            </p>
            <Button variant="link" className="p-0 h-auto text-amber-600" onClick={() => navigate('/profile')}>
              Complete Setup →
            </Button>
          </div>
        )}
      </div>

      {/* Daily Score Card - Enhanced with Real Data */}
      {todayScore !== null && (
        <DailyScoreCard 
          score={todayScore}
        />
      )}

      {/* Main Trackers Grid - Enhanced with Data Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {displayedTrackers.map((tracker, index) => {
          const motivationalMessage = getMotivationalMessage(tracker.percentage, tracker.name, tracker.hasData);
          
          return (
            <Card
              key={tracker.name}
              className={`${tracker.shadow} transition-all duration-300 hover:scale-105 cursor-pointer bg-gradient-to-br ${tracker.color} border-0 relative overflow-hidden`}
              onClick={tracker.onClick}
              data-testid={`tracker-${tracker.name.toLowerCase()}`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/5 pointer-events-none" />
              <CardContent className="p-6 relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-2xl">{tracker.emoji}</span>
                  {tracker.hasData && (
                    <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" title="Has data today" />
                  )}
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className={`font-semibold text-lg ${tracker.textColor}`}>
                      {tracker.name}
                    </h3>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-baseline justify-between">
                      <span className={`text-3xl font-bold ${tracker.textColor}`}>
                        {tracker.current.toLocaleString()}
                      </span>
                      <span className={`text-sm ${tracker.textColorSecondary}`}>
                        /{tracker.target.toLocaleString()}{tracker.unit}
                      </span>
                    </div>
                    
                    <div className="w-full bg-black/10 rounded-full h-2 overflow-hidden">
                      <div 
                        className={`h-full bg-gradient-to-r ${tracker.gradient} transition-all duration-700`}
                        style={{ width: `${Math.min(tracker.percentage, 100)}%` }}
                      />
                    </div>
                    
                    <p className={`text-xs ${tracker.textColorSecondary} leading-relaxed`}>
                      {motivationalMessage}
                    </p>
                  </div>
                  
                  {/* Insights Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-3 bg-white/10 border-white/20 hover:bg-white/20"
                    onClick={(e) => {
                      e.stopPropagation();
                      openInsights({ type: tracker.name.toLowerCase(), name: tracker.name, color: tracker.color });
                    }}
                  >
                    <TrendingUp className="mr-1 h-3 w-3" />
                    Insights
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Enhanced Quick Log Button */}
      <div className="flex justify-center">
        <Card className="w-full max-w-md bg-gradient-to-r from-blue-600 to-purple-600 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
          <CardContent className="p-6">
            <Button 
              onClick={() => navigate('/camera')}
              className="w-full h-16 bg-white/20 hover:bg-white/30 border-0 text-white text-lg font-semibold transition-all duration-300"
              size="lg"
            >
              <Camera className="mr-3 h-6 w-6" />
              Log Food
            </Button>
            <p className="text-center text-white/80 text-sm mt-3">
              Take photo or speak to log
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Celebration Popup */}
      {showCelebration && (
        <CelebrationPopup
          show={showCelebration}
          onClose={() => setShowCelebration(false)}
          message={celebrationType}
        />
      )}

      {/* Tracker Insights Popup */}
      {isInsightsOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">
              {selectedTracker ? selectedTracker.name : 'Tracker'} Insights
            </h3>
            <p className="text-muted-foreground mb-4">
              Detailed insights for your {selectedTracker?.name || 'tracker'} tracking coming soon!
            </p>
            <Button onClick={closeInsights} className="w-full">
              Close
            </Button>
          </div>
        </div>
      )}

      {/* Health Check Modal */}
      <HealthCheckModal 
        isOpen={isHealthCheckOpen} 
        onClose={() => setIsHealthCheckOpen(false)} 
      />
    </div>
  );
};

export default Home;
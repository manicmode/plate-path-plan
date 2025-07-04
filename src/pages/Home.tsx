
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Camera, TrendingUp, Droplets, Pill, Zap, Target, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNutrition } from '@/contexts/NutritionContext';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import CelebrationPopup from '@/components/CelebrationPopup';

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
  const { getTodaysProgress, getHydrationGoal, getSupplementGoal } = useNutrition();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const progress = getTodaysProgress();

  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationType, setCelebrationType] = useState('');
  const [preferences, setPreferences] = useState(loadUserPreferences());

  // Listen for changes to localStorage preferences
  useEffect(() => {
    const handleStorageChange = () => {
      const newPreferences = loadUserPreferences();
      setPreferences(newPreferences);
      console.log('Preferences updated from localStorage:', newPreferences.selectedTrackers);
    };

    window.addEventListener('storage', handleStorageChange);
    
    const interval = setInterval(() => {
      const newPreferences = loadUserPreferences();
      if (JSON.stringify(newPreferences) !== JSON.stringify(preferences)) {
        setPreferences(newPreferences);
        console.log('Preferences refreshed:', newPreferences.selectedTrackers);
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
  console.log('Currently selected trackers for display:', selectedTrackers);

  // Define all tracker configurations
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 text-white">
      {/* Celebration Popup */}
      <CelebrationPopup 
        show={showCelebration} 
        message={celebrationType}
        onClose={() => setShowCelebration(false)}
      />

      {/* Full-width header banner */}
      <div className="w-full bg-gradient-to-r from-gray-800/50 to-gray-700/50 backdrop-blur-sm px-4 py-6 mb-8">
        <div className="flex items-center justify-between max-w-sm mx-auto">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-lg">N</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold">NutriCoach</h1>
              <p className="text-sm text-gray-300">AI Wellness Assistant</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 bg-gray-700/50 rounded-full px-3 py-1">
            <div className="w-4 h-4 bg-blue-400 rounded-full"></div>
            <div className="w-8 h-4 bg-gray-600 rounded-full relative">
              <div className="w-3.5 h-3.5 bg-white rounded-full absolute right-0.5 top-0.5"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content container with proper spacing */}
      <div className="px-4 pb-24 space-y-8">
        {/* Large Tracker Cards - Matching reference image exactly */}
        <div className="grid grid-cols-3 gap-4">
          {displayedTrackers.map((tracker, index) => (
            <div 
              key={tracker.name}
              className="bg-gradient-to-b from-gray-800/80 via-gray-800/60 to-gray-900/80 backdrop-blur-sm rounded-3xl p-6 h-44 flex flex-col items-center justify-center cursor-pointer hover:scale-105 transition-all duration-300 border border-gray-700/50"
              onClick={tracker.onClick}
              title={getMotivationalMessage(tracker.percentage, tracker.name)}
            >
              {/* Progress Ring */}
              <div className="relative w-16 h-16 mb-3">
                <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 64 64">
                  <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(255, 255, 255, 0.1)" strokeWidth="4" />
                  <circle
                    cx="32" cy="32" r="28" fill="none" stroke={`url(#${tracker.gradient})`} strokeWidth="4"
                    strokeLinecap="round" strokeDasharray={176} strokeDashoffset={176 - (tracker.percentage / 100) * 176}
                    className="transition-all duration-1000 ease-out"
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
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-3xl">{tracker.emoji}</span>
                </div>
                <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2">
                  <span className="text-lg font-bold text-white">
                    {Math.round(tracker.percentage)}%
                  </span>
                </div>
              </div>
              
              {/* Tracker Info */}
              <div className="text-center">
                <p className="text-sm font-semibold text-white mb-1">{tracker.name}</p>
                <p className="text-xs text-gray-300">
                  {tracker.current.toFixed(0)}{tracker.unit}/{tracker.target}{tracker.unit}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Log Food Button - Large and centered like reference image */}
        <div className="w-full max-w-sm mx-auto">
          <Card 
            className="bg-gradient-to-b from-gray-800/80 via-gray-800/60 to-gray-900/80 backdrop-blur-sm border-gray-700/50 rounded-3xl overflow-hidden hover:scale-105 transition-all duration-300 cursor-pointer"
            onClick={() => navigate('/camera')}
          >
            <CardContent className="p-8 text-center">
              <div className="flex flex-col items-center space-y-4">
                <div className="w-16 h-16 bg-blue-500 rounded-3xl flex items-center justify-center shadow-lg">
                  <Camera className="h-8 w-8 text-white" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-bold text-white">Log Food</h3>
                  <p className="text-sm text-gray-300">Take photo to log meals</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Secondary Actions: Hydration & Supplements */}
        <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
          {/* Hydration Card */}
          <Card 
            className="bg-gradient-to-b from-gray-800/80 via-gray-800/60 to-gray-900/80 backdrop-blur-sm border-gray-700/50 rounded-3xl overflow-hidden hover:scale-105 transition-all duration-300 cursor-pointer h-32"
            onClick={() => navigate('/hydration')}
          >
            <CardContent className="flex flex-col items-center justify-center h-full p-4">
              <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg mb-2">
                <Droplets className="h-6 w-6 text-white" />
              </div>
              <div className="text-center">
                <h4 className="text-sm font-bold text-white">Hydration</h4>
                <p className="text-xs text-gray-300">Track water intake</p>
              </div>
            </CardContent>
          </Card>

          {/* Supplements Card */}
          <Card 
            className="bg-gradient-to-b from-gray-800/80 via-gray-800/60 to-gray-900/80 backdrop-blur-sm border-gray-700/50 rounded-3xl overflow-hidden hover:scale-105 transition-all duration-300 cursor-pointer h-32"
            onClick={() => navigate('/supplements')}
          >
            <CardContent className="flex flex-col items-center justify-center h-full p-4">
              <div className="w-12 h-12 bg-purple-500 rounded-2xl flex items-center justify-center shadow-lg mb-2">
                <Pill className="h-6 w-6 text-white" />
              </div>
              <div className="text-center">
                <h4 className="text-sm font-bold text-white">Supplements</h4>
                <p className="text-xs text-gray-300">Log vitamins & minerals</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Home;

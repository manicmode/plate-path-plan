import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth';
import { useNutrition } from '@/contexts/NutritionContext';
import { useIsMobile } from '@/hooks/use-mobile';

interface CtaMessage {
  id: string;
  text: string;
  checkTrigger: (context: TriggerContext) => boolean;
}

interface TriggerContext {
  user: any;
  progress: any;
  currentDay: any;
  hasVisitedExplore: boolean;
  hasVisitedGameChallenge: boolean;
  lastFoodLogTime: Date | null;
  currentStreak: number;
  weeklyMealCount: number;
  isFirstWeekOfMonth: boolean;
  isSundayOrMonday: boolean;
  isMondayMorning: boolean;
  isFirstOfMonth: boolean;
  missedOneDayInStreak: boolean;
  isNearGoal: boolean;
  hasOpenedCoach: boolean;
  hasLoggedSmallMeal: boolean;
  hoursInactive: number;
}

const CTA_MESSAGES: CtaMessage[] = [
  {
    id: 'monthly-challenge',
    text: '🏆 This Month\'s Challenge Is ON – Let\'s Climb That Leaderboard!',
    checkTrigger: (ctx) => ctx.hasVisitedGameChallenge || ctx.isFirstWeekOfMonth
  },
  {
    id: 'new-trophies',
    text: '🔥 New Trophies Just Dropped – Can You Earn One This Week?',
    checkTrigger: (ctx) => ctx.isSundayOrMonday && ctx.weeklyMealCount >= 3
  },
  {
    id: 'invite-friends',
    text: '👥 Invite Friends – Every Buddy Makes You Better',
    checkTrigger: (ctx) => true // Simplified - assuming no friends system yet
  },
  {
    id: 'log-meals',
    text: '🍽️ Don\'t Forget to Log Your Meals – It All Counts!',
    checkTrigger: (ctx) => ctx.hoursInactive >= 24
  },
  {
    id: 'explore-tips',
    text: '💡 Did You Know? Smart Health Tips Await in Explore',
    checkTrigger: (ctx) => !ctx.hasVisitedExplore && ctx.hoursInactive >= 48
  },
  {
    id: 'habit-momentum',
    text: '🚀 You\'re One Habit Away from Crushing It – Let\'s Go!',
    checkTrigger: (ctx) => ctx.missedOneDayInStreak
  },
  {
    id: 'streak-building',
    text: '🎯 Stay Consistent – Your Streak Is Building Momentum!',
    checkTrigger: (ctx) => ctx.currentStreak >= 3
  },
  {
    id: 'weekly-progress',
    text: '📈 Weekly Progress Just Updated – Check Out Your Wins!',
    checkTrigger: (ctx) => ctx.isSundayOrMonday && ctx.weeklyMealCount >= 4
  },
  {
    id: 'goal-close',
    text: '🎉 You\'re Closer Than Ever to Your Goal – Keep It Up!',
    checkTrigger: (ctx) => ctx.isNearGoal
  },
  {
    id: 'mindfulness',
    text: '🧠 Mind + Body in Sync – Take a Deep Breath and Thrive',
    checkTrigger: (ctx) => ctx.hasOpenedCoach
  },
  {
    id: 'new-week',
    text: '📅 New Week, New Energy – Plan It Like a Champ',
    checkTrigger: (ctx) => ctx.isMondayMorning
  },
  {
    id: 'hall-fame',
    text: '🥇 Hall of Fame Just Updated – Who Made the Podium?',
    checkTrigger: (ctx) => ctx.isFirstOfMonth
  },
  {
    id: 'comeback',
    text: '⏰ Haven\'t Logged in a While? Let\'s Get Back on Track!',
    checkTrigger: (ctx) => ctx.hoursInactive >= 48
  },
  {
    id: 'small-choices',
    text: '🌱 Small Choices Today = Big Results Tomorrow',
    checkTrigger: (ctx) => ctx.hasLoggedSmallMeal
  },
  {
    id: 'micro-challenges',
    text: '🕹️ Micro-Challenges Open – Time to Level Up!',
    checkTrigger: (ctx) => ctx.hasVisitedGameChallenge
  }
];

interface HomeCtaTickerProps {
  className?: string;
}

export const HomeCtaTicker: React.FC<HomeCtaTickerProps> = ({ className }) => {
  const { user } = useAuth();
  const { getTodaysProgress, currentDay } = useNutrition();
  const isMobile = useIsMobile();
  const progress = getTodaysProgress();

  const [showCta, setShowCta] = useState(false);
  const [currentCtaMessage, setCurrentCtaMessage] = useState<string>('');
  const [lastCtaTime, setLastCtaTime] = useState<number>(0);

  // Check if we should show a CTA
  const shouldShowCta = (): boolean => {
    const now = Date.now();
    const sixHours = 6 * 60 * 60 * 1000; // 6 hours in milliseconds
    const sessionKey = `cta_shown_${new Date().toDateString()}`;
    
    // Check if CTA already shown in this session
    if (sessionStorage.getItem(sessionKey)) {
      return false;
    }
    
    // Check if 6 hours have passed since last CTA
    const storedLastCta = localStorage.getItem('last_cta_time');
    const lastTime = storedLastCta ? parseInt(storedLastCta) : 0;
    
    return (now - lastTime) >= sixHours;
  };

  // Build trigger context
  const buildTriggerContext = (): TriggerContext => {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday
    const dateOfMonth = now.getDate();
    const hour = now.getHours();
    
    // Calculate last food log time
    const foodLogs = currentDay?.foods || [];
    const lastFoodLog = foodLogs.length > 0 ? new Date(foodLogs[foodLogs.length - 1].timestamp) : null;
    const hoursInactive = lastFoodLog ? (now.getTime() - lastFoodLog.getTime()) / (1000 * 60 * 60) : 48;

    // Calculate streak (simplified)
    const currentStreak = foodLogs.length > 0 ? Math.min(foodLogs.length, 7) : 0;

    // Check if near calorie goal (within 15%)
    const calorieGoal = 2000; // Default fallback
    const calorieProgress = (progress.calories / calorieGoal) * 100;
    const isNearGoal = calorieProgress >= 85;

    return {
      user,
      progress,
      currentDay,
      hasVisitedExplore: localStorage.getItem('visited_explore') === 'true',
      hasVisitedGameChallenge: localStorage.getItem('visited_game_challenge') === 'true',
      lastFoodLogTime: lastFoodLog,
      currentStreak,
      weeklyMealCount: foodLogs.length, // Simplified
      isFirstWeekOfMonth: dateOfMonth <= 7,
      isSundayOrMonday: dayOfWeek === 0 || dayOfWeek === 1,
      isMondayMorning: dayOfWeek === 1 && hour < 12,
      isFirstOfMonth: dateOfMonth <= 2,
      missedOneDayInStreak: currentStreak >= 3 && hoursInactive > 24 && hoursInactive < 48,
      isNearGoal,
      hasOpenedCoach: localStorage.getItem('opened_coach') === 'true',
      hasLoggedSmallMeal: foodLogs.some(food => food.calories < 200),
      hoursInactive
    };
  };

  // Find valid CTA message
  const findValidCta = (): string | null => {
    const context = buildTriggerContext();
    
    for (const cta of CTA_MESSAGES) {
      if (cta.checkTrigger(context)) {
        return cta.text;
      }
    }
    
    return null;
  };

  // Initialize CTA check
  useEffect(() => {
    const checkForCta = () => {
      if (!shouldShowCta()) return;
      
      const validCta = findValidCta();
      if (validCta) {
        setCurrentCtaMessage(validCta);
        setShowCta(true);
        
        // Mark CTA as shown
        const now = Date.now();
        localStorage.setItem('last_cta_time', now.toString());
        sessionStorage.setItem(`cta_shown_${new Date().toDateString()}`, 'true');
        
        // Auto-hide after 15 seconds
        setTimeout(() => {
          setShowCta(false);
        }, 15000);
      }
    };

    // Small delay to let other components load
    const timer = setTimeout(checkForCta, 2000);
    return () => clearTimeout(timer);
  }, [user, currentDay]);

  // Track page visits for triggers
  useEffect(() => {
    const currentPath = window.location.pathname;
    if (currentPath === '/explore') {
      localStorage.setItem('visited_explore', 'true');
    } else if (currentPath === '/game-challenge') {
      localStorage.setItem('visited_game_challenge', 'true');
    } else if (currentPath === '/coach') {
      localStorage.setItem('opened_coach', 'true');
    }
  }, []);

  const defaultMessage = "Your intelligent wellness companion is ready";

  if (showCta && currentCtaMessage) {
    return (
      <div className={`overflow-hidden whitespace-nowrap ${className}`}>
        <div className="inline-flex animate-marquee text-gray-600 dark:text-gray-300 font-medium">
          <span className="pr-20">{currentCtaMessage}</span>
          <span className="pr-20">{currentCtaMessage}</span>
        </div>
      </div>
    );
  }

  return (
    <p className={`text-gray-600 dark:text-gray-300 font-medium ${className}`}>
      {defaultMessage}
    </p>
  );
};
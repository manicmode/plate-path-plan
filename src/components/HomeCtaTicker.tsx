import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth';
import { useNutrition } from '@/contexts/NutritionContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';

interface CtaMessage {
  id: string;
  text: string;
  priority: 'seasonal' | 'holiday' | 'personal' | 'default';
  checkTrigger: (context: TriggerContext) => boolean;
}

interface TriggerContext {
  user: any;
  progress: any;
  currentDay: any;
  userProfile: any;
  currentDate: Date;
  currentMonth: number;
  currentDayOfMonth: number;
  currentSeason: 'winter' | 'spring' | 'summer' | 'fall';
  activeHoliday: string | null;
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
  daysSinceGoalStart: number;
  isUserBirthday: boolean;
  hasHitGoalMilestone: boolean;
}

// Seasonal CTAs (Highest Priority)
const SEASONAL_MESSAGES: CtaMessage[] = [
  {
    id: 'winter-reset',
    text: '❄️ Winter reset starts now! Let\'s build strong habits for the cold season.',
    priority: 'seasonal',
    checkTrigger: (ctx) => ctx.currentSeason === 'winter'
  },
  {
    id: 'spring-renewal',
    text: '🌸 Spring into a new you! Try a fresh wellness challenge today.',
    priority: 'seasonal',
    checkTrigger: (ctx) => ctx.currentSeason === 'spring'
  },
  {
    id: 'summer-energy',
    text: '☀️ Summer body, summer mindset! Let\'s level up.',
    priority: 'seasonal',
    checkTrigger: (ctx) => ctx.currentSeason === 'summer'
  },
  {
    id: 'fall-renewal',
    text: '🍂 Fall back in love with your wellness journey.',
    priority: 'seasonal',
    checkTrigger: (ctx) => ctx.currentSeason === 'fall'
  }
];

// Holiday CTAs (Second Priority)
const HOLIDAY_MESSAGES: CtaMessage[] = [
  {
    id: 'new-year',
    text: '🎉 New Year, New You — Let\'s set the tone for the year!',
    priority: 'holiday',
    checkTrigger: (ctx) => ctx.activeHoliday === 'new-year'
  },
  {
    id: 'valentine',
    text: '❤️ Self-love is health love. Let\'s nourish both.',
    priority: 'holiday',
    checkTrigger: (ctx) => ctx.activeHoliday === 'valentine'
  },
  {
    id: 'halloween',
    text: '👻 Treat yourself better than candy this Halloween!',
    priority: 'holiday',
    checkTrigger: (ctx) => ctx.activeHoliday === 'halloween'
  },
  {
    id: 'thanksgiving',
    text: '🦃 Gratitude starts with wellness. Keep going.',
    priority: 'holiday',
    checkTrigger: (ctx) => ctx.activeHoliday === 'thanksgiving'
  },
  {
    id: 'christmas',
    text: '🎄 Healthy body, peaceful mind — that\'s the best gift.',
    priority: 'holiday',
    checkTrigger: (ctx) => ctx.activeHoliday === 'christmas'
  }
];

// Personal Goal CTAs (Third Priority)
const PERSONAL_MESSAGES: CtaMessage[] = [
  {
    id: 'birthday',
    text: '🎂 Happy Birthday! Start your new year with new habits.',
    priority: 'personal',
    checkTrigger: (ctx) => ctx.isUserBirthday
  },
  {
    id: 'goal-anniversary',
    text: `🏁 You began this journey ${0} days ago. Look how far you've come!`,
    priority: 'personal',
    checkTrigger: (ctx) => ctx.daysSinceGoalStart > 0 && ctx.daysSinceGoalStart % 30 === 0
  },
  {
    id: 'goal-milestone',
    text: '🔥 You hit 50% of your goal! Let\'s finish strong.',
    priority: 'personal',
    checkTrigger: (ctx) => ctx.hasHitGoalMilestone
  }
];

// Default CTAs (Lowest Priority)
const DEFAULT_MESSAGES: CtaMessage[] = [
  {
    id: 'monthly-challenge',
    text: '🏆 This Month\'s Challenge Is ON – Let\'s Climb That Leaderboard!',
    priority: 'default',
    checkTrigger: (ctx) => ctx.hasVisitedGameChallenge || ctx.isFirstWeekOfMonth
  },
  {
    id: 'new-trophies',
    text: '🔥 New Trophies Just Dropped – Can You Earn One This Week?',
    priority: 'default',
    checkTrigger: (ctx) => ctx.isSundayOrMonday && ctx.weeklyMealCount >= 3
  },
  {
    id: 'invite-friends',
    text: '👥 Invite Friends – Every Buddy Makes You Better',
    priority: 'default',
    checkTrigger: (ctx) => true // Simplified - assuming no friends system yet
  },
  {
    id: 'log-meals',
    text: '🍽️ Don\'t Forget to Log Your Meals – It All Counts!',
    priority: 'default',
    checkTrigger: (ctx) => ctx.hoursInactive >= 24
  },
  {
    id: 'explore-tips',
    text: '💡 Did You Know? Smart Health Tips Await in Explore',
    priority: 'default',
    checkTrigger: (ctx) => !ctx.hasVisitedExplore && ctx.hoursInactive >= 48
  },
  {
    id: 'habit-momentum',
    text: '🚀 You\'re One Habit Away from Crushing It – Let\'s Go!',
    priority: 'default',
    checkTrigger: (ctx) => ctx.missedOneDayInStreak
  },
  {
    id: 'streak-building',
    text: '🎯 Stay Consistent – Your Streak Is Building Momentum!',
    priority: 'default',
    checkTrigger: (ctx) => ctx.currentStreak >= 3
  },
  {
    id: 'weekly-progress',
    text: '📈 Weekly Progress Just Updated – Check Out Your Wins!',
    priority: 'default',
    checkTrigger: (ctx) => ctx.isSundayOrMonday && ctx.weeklyMealCount >= 4
  },
  {
    id: 'goal-close',
    text: '🎉 You\'re Closer Than Ever to Your Goal – Keep It Up!',
    priority: 'default',
    checkTrigger: (ctx) => ctx.isNearGoal
  },
  {
    id: 'mindfulness',
    text: '🧠 Mind + Body in Sync – Take a Deep Breath and Thrive',
    priority: 'default',
    checkTrigger: (ctx) => ctx.hasOpenedCoach
  },
  {
    id: 'new-week',
    text: '📅 New Week, New Energy – Plan It Like a Champ',
    priority: 'default',
    checkTrigger: (ctx) => ctx.isMondayMorning
  },
  {
    id: 'hall-fame',
    text: '🥇 Hall of Fame Just Updated – Who Made the Podium?',
    priority: 'default',
    checkTrigger: (ctx) => ctx.isFirstOfMonth
  },
  {
    id: 'comeback',
    text: '⏰ Haven\'t Logged in a While? Let\'s Get Back on Track!',
    priority: 'default',
    checkTrigger: (ctx) => ctx.hoursInactive >= 48
  },
  {
    id: 'small-choices',
    text: '🌱 Small Choices Today = Big Results Tomorrow',
    priority: 'default',
    checkTrigger: (ctx) => ctx.hasLoggedSmallMeal
  },
  {
    id: 'micro-challenges',
    text: '🕹️ Micro-Challenges Open – Time to Level Up!',
    priority: 'default',
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
  const [userProfile, setUserProfile] = useState<any>(null);

  // Load user profile data
  useEffect(() => {
    const loadUserProfile = async () => {
      if (!user?.id) return;
      
      try {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        setUserProfile(profile);
      } catch (error) {
        console.error('Error loading user profile:', error);
      }
    };

    loadUserProfile();
  }, [user?.id]);

  // Helper functions for date/season calculations
  const getCurrentSeason = (date: Date): 'winter' | 'spring' | 'summer' | 'fall' => {
    const month = date.getMonth() + 1; // getMonth() returns 0-11
    if (month >= 12 || month <= 2) return 'winter';
    if (month >= 3 && month <= 5) return 'spring';
    if (month >= 6 && month <= 8) return 'summer';
    return 'fall';
  };

  const getActiveHoliday = (date: Date): string | null => {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    // New Year (Dec 27 - Jan 3)
    if ((month === 12 && day >= 27) || (month === 1 && day <= 3)) {
      return 'new-year';
    }
    
    // Valentine's Day (Feb 9 - Feb 16)
    if (month === 2 && day >= 9 && day <= 16) {
      return 'valentine';
    }
    
    // Halloween (Oct 26 - Nov 2)
    if ((month === 10 && day >= 26) || (month === 11 && day <= 2)) {
      return 'halloween';
    }
    
    // Thanksgiving (4th Thursday of November + 5 days before/2 days after)
    if (month === 11) {
      const firstThursday = 1 + (11 - new Date(date.getFullYear(), 10, 1).getDay()) % 7;
      const fourthThursday = firstThursday + 21;
      if (day >= fourthThursday - 5 && day <= fourthThursday + 2) {
        return 'thanksgiving';
      }
    }
    
    // Christmas (Dec 20 - Dec 27)
    if (month === 12 && day >= 20 && day <= 27) {
      return 'christmas';
    }
    
    return null;
  };

  const isUserBirthday = (date: Date, profile: any): boolean => {
    if (!profile?.created_at) return false;
    
    // Simplified birthday check - you could enhance this with actual birthday field
    const profileDate = new Date(profile.created_at);
    return date.getMonth() === profileDate.getMonth() && 
           date.getDate() === profileDate.getDate();
  };

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

    // Calculate days since goal start (simplified)
    const goalStartDate = userProfile?.created_at ? new Date(userProfile.created_at) : now;
    const daysSinceGoalStart = Math.floor((now.getTime() - goalStartDate.getTime()) / (1000 * 60 * 60 * 24));

    // Check for goal milestones (simplified)
    const hasHitGoalMilestone = calorieProgress >= 50 && calorieProgress < 60;

    return {
      user,
      progress,
      currentDay,
      userProfile,
      currentDate: now,
      currentMonth: now.getMonth() + 1,
      currentDayOfMonth: dateOfMonth,
      currentSeason: getCurrentSeason(now),
      activeHoliday: getActiveHoliday(now),
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
      hoursInactive,
      daysSinceGoalStart,
      isUserBirthday: isUserBirthday(now, userProfile),
      hasHitGoalMilestone
    };
  };

  // Find valid CTA message with priority system
  const findValidCta = (): string | null => {
    const context = buildTriggerContext();
    
    // Priority order: Seasonal > Holiday > Personal > Default
    const allMessages = [
      ...SEASONAL_MESSAGES,
      ...HOLIDAY_MESSAGES, 
      ...PERSONAL_MESSAGES,
      ...DEFAULT_MESSAGES
    ];
    
    for (const cta of allMessages) {
      if (cta.checkTrigger(context)) {
        // Handle dynamic text replacement for goal anniversary
        if (cta.id === 'goal-anniversary') {
          return `🏁 You began this journey ${context.daysSinceGoalStart} days ago. Look how far you've come!`;
        }
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

    // Small delay to let other components load and user profile to load
    const timer = setTimeout(checkForCta, 2000);
    return () => clearTimeout(timer);
  }, [user, currentDay, userProfile]);

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
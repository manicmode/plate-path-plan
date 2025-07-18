import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth';
import { useNutrition } from '@/contexts/NutritionContext';
import { useDailyScore } from '@/hooks/useDailyScore';
import { hasVisitedPageRecently } from '@/utils/pageTracking';

interface TickerMessage {
  id: string;
  message: string;
  condition: () => boolean;
}

const DEFAULT_MESSAGE = "Your intelligent wellness companion is ready.";
const TICKER_COOLDOWN_HOURS = 6;

export const useSmartTicker = () => {
  const { user } = useAuth();
  const { getTodaysProgress } = useNutrition();
  const { scoreStats } = useDailyScore();
  const [currentMessage, setCurrentMessage] = useState(DEFAULT_MESSAGE);
  const [lastTickerTime, setLastTickerTime] = useState<number>(0);

  // Helper functions for trigger conditions
  const isFirstWeekOfMonth = () => {
    const now = new Date();
    const dayOfMonth = now.getDate();
    return dayOfMonth <= 7;
  };

  const isWeekStart = () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    return dayOfWeek === 0 || dayOfWeek === 1; // Sunday or Monday
  };

  const isMonthStart = () => {
    const now = new Date();
    const dayOfMonth = now.getDate();
    return dayOfMonth <= 2;
  };

  const isMondayMorning = () => {
    const now = new Date();
    return now.getDay() === 1 && now.getHours() < 12;
  };

  const hasRecentFoodLog = () => {
    const progress = getTodaysProgress();
    // If user has logged food today, consider it recent
    return progress.calories > 50; // Minimum threshold for meaningful logging
  };

  const hasVisitedExploreRecently = () => {
    return hasVisitedPageRecently('Explore', 48);
  };

  const hasActiveStreak = () => {
    // Check if user has been consistently logging
    const progress = getTodaysProgress();
    return progress.calories > 100; // More meaningful threshold for streaks
  };

  const hasWeeklyProgress = () => {
    // Check if user has made progress this week
    const progress = getTodaysProgress();
    return progress.calories > 300; // Threshold for weekly progress
  };

  const isNearGoal = () => {
    // Simplified goal proximity check
    const progress = getTodaysProgress();
    // Calculate percentage manually if needed
    const percentage = progress.calories > 0 ? (progress.calories / 2000) * 100 : 0; // Using 2000 as example target
    return percentage >= 85; // Within 15% of goal
  };

  const hasMinimalActivity = () => {
    // Check for small healthy actions
    const progress = getTodaysProgress();
    return progress.calories > 0 && progress.calories < 500; // Small meal logged
  };

  // Define all ticker messages with their conditions
  const tickerMessages: TickerMessage[] = [
    {
      id: 'monthly-challenge',
      message: '🏆 This Month\'s Challenge Is ON – Let\'s Climb That Leaderboard!',
      condition: () => isFirstWeekOfMonth()
    },
    {
      id: 'new-trophies',
      message: '🔥 New Trophies Just Dropped – Can You Earn One This Week?',
      condition: () => isWeekStart() && hasWeeklyProgress()
    },
    {
      id: 'invite-friends',
      message: '👥 Invite Friends – Every Buddy Makes You Better',
      condition: () => true // Always available if no friends (simplified)
    },
    {
      id: 'log-meals',
      message: '🍽️ Don\'t Forget to Log Your Meals – It All Counts!',
      condition: () => !hasRecentFoodLog()
    },
    {
      id: 'explore-tips',
      message: '💡 Did You Know? Smart Health Tips Await in Explore',
      condition: () => !hasVisitedExploreRecently()
    },
    {
      id: 'one-habit-away',
      message: '🚀 You\'re One Habit Away from Crushing It – Let\'s Go!',
      condition: () => !hasRecentFoodLog() && hasActiveStreak()
    },
    {
      id: 'stay-consistent',
      message: '🎯 Stay Consistent – Your Streak Is Building Momentum!',
      condition: () => hasActiveStreak()
    },
    {
      id: 'weekly-progress',
      message: '📈 Weekly Progress Just Updated – Check Out Your Wins!',
      condition: () => isWeekStart() && hasWeeklyProgress()
    },
    {
      id: 'closer-to-goal',
      message: '🎉 You\'re Closer Than Ever to Your Goal – Keep It Up!',
      condition: () => isNearGoal()
    },
    {
      id: 'mind-body-sync',
      message: '🧠 Mind + Body in Sync – Take a Deep Breath and Thrive',
      condition: () => true // Triggered by coach interaction (simplified)
    },
    {
      id: 'new-week-energy',
      message: '📅 New Week, New Energy – Plan It Like a Champ',
      condition: () => isMondayMorning()
    },
    {
      id: 'hall-of-fame',
      message: '🥇 Hall of Fame Just Updated – Who Made the Podium?',
      condition: () => isMonthStart()
    },
    {
      id: 'get-back-on-track',
      message: '⏰ Haven\'t Logged in a While? Let\'s Get Back on Track!',
      condition: () => !hasRecentFoodLog()
    },
    {
      id: 'small-choices',
      message: '🌱 Small Choices Today = Big Results Tomorrow',
      condition: () => hasMinimalActivity()
    },
    {
      id: 'micro-challenges',
      message: '🕹️ Micro-Challenges Open – Time to Level Up!',
      condition: () => true // Simplified condition
    }
  ];

  // Check if enough time has passed since last ticker display
  const canShowTicker = () => {
    const now = Date.now();
    const timeSinceLastTicker = now - lastTickerTime;
    const cooldownMs = TICKER_COOLDOWN_HOURS * 60 * 60 * 1000;
    
    return timeSinceLastTicker >= cooldownMs;
  };

  // Find the first matching ticker message
  const findActiveMessage = () => {
    if (!canShowTicker()) {
      return DEFAULT_MESSAGE;
    }

    for (const ticker of tickerMessages) {
      try {
        if (ticker.condition()) {
          // Update last ticker time when showing a CTA message
          const now = Date.now();
          setLastTickerTime(now);
          localStorage.setItem('lastTickerTime', now.toString());
          return ticker.message;
        }
      } catch (error) {
        console.error(`Error evaluating ticker condition for ${ticker.id}:`, error);
      }
    }

    return DEFAULT_MESSAGE;
  };

  // Initialize last ticker time from localStorage
  useEffect(() => {
    const storedTime = localStorage.getItem('lastTickerTime');
    if (storedTime) {
      setLastTickerTime(parseInt(storedTime));
    }
  }, []);

  // Update ticker message when conditions change
  useEffect(() => {
    const message = findActiveMessage();
    setCurrentMessage(message);
  }, [user, getTodaysProgress, scoreStats, lastTickerTime]);

  // Trigger specific messages from external events
  const triggerMessage = (messageId: string) => {
    const ticker = tickerMessages.find(t => t.id === messageId);
    if (ticker && canShowTicker()) {
      setCurrentMessage(ticker.message);
      const now = Date.now();
      setLastTickerTime(now);
      localStorage.setItem('lastTickerTime', now.toString());
    }
  };

  return {
    message: currentMessage,
    isDefault: currentMessage === DEFAULT_MESSAGE,
    triggerMessage
  };
};
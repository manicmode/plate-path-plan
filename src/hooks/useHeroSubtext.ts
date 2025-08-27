import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth';
import { useNutrition } from '@/contexts/NutritionContext';
import { flag } from '@/lib/flags';

interface HeroMessage {
  id: string;
  text: string;
  priority: 'system' | 'timely' | 'personalized' | 'motivational';
}

interface MessageContext {
  user: any;
  progress: any;
  currentDay: any;
  currentDate: Date;
  currentHour: number;
  dayOfWeek: number;
  currentMonth: number;
  firstName?: string;
  currentStreak: number;
  lastLogTime: Date | null;
  hoursInactive: number;
  isWeekend: boolean;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  season: 'summer' | 'winter' | 'fall' | 'spring';
  isHoliday: boolean;
}

// System/Alert messages (highest priority)
const SYSTEM_MESSAGES: HeroMessage[] = [
  {
    id: 'maintenance',
    text: 'Scheduled maintenance tonight 11pm-1am PST ⚙️',
    priority: 'system'
  }
];

// Timely messages (today-only moments)
const TIMELY_MESSAGES: HeroMessage[] = [
  {
    id: 'good-morning',
    text: 'New day, new wins! Ready to make it count? 🌅',
    priority: 'timely'
  },
  {
    id: 'afternoon-energy',
    text: 'Afternoon energy check—fuel your next win 🚀',
    priority: 'timely'
  },
  {
    id: 'evening-reflect',
    text: 'Evening wind-down: 3 deep breaths to reset 🌙',
    priority: 'timely'
  },
  {
    id: 'weekend-vibes',
    text: 'Weekend wellness vibes—small steps count too ✨',
    priority: 'timely'
  },
  {
    id: 'monday-fresh',
    text: 'Fresh Monday energy—let\'s set the tone 💪',
    priority: 'timely'
  },
  {
    id: 'holiday-balance',
    text: 'Holiday season balance—celebrate mindfully 🎄',
    priority: 'timely'
  }
];

// Personalized messages (user-specific data)
const PERSONALIZED_MESSAGES: HeroMessage[] = [
  {
    id: 'streak-fire',
    text: 'Streak {streakDays} and climbing—proud of you! 🔥',
    priority: 'personalized'
  },
  {
    id: 'welcome-back',
    text: 'Welcome back, {firstName}! Your journey continues 👋',
    priority: 'personalized'
  },
  {
    id: 'coach-unlocked',
    text: 'Coach plan unlocked—one step at a time 🧭',
    priority: 'personalized'
  },
  {
    id: 'consistency-champion',
    text: 'Consistency champion in the making, {firstName}! 🏆',
    priority: 'personalized'
  }
];

// Motivational messages (general inspiration)
const MOTIVATIONAL_MESSAGES: HeroMessage[] = [
  {
    id: 'hydration-love',
    text: 'Hydration loves consistency—small sips count 💧',
    priority: 'motivational'
  },
  {
    id: 'progress-not-perfection',
    text: 'Progress over perfection—every step matters ⭐',
    priority: 'motivational'
  },
  {
    id: 'small-wins',
    text: 'Small wins build big transformations 🌱',
    priority: 'motivational'
  },
  {
    id: 'mindful-moments',
    text: 'Mindful moments create lasting change 🧘',
    priority: 'motivational'
  },
  {
    id: 'summer-energy',
    text: 'Summer vibes: fresh choices, bright energy ☀️',
    priority: 'motivational'
  },
  {
    id: 'cozy-wellness',
    text: 'Cozy season calls for warm self-care rituals 🍂',
    priority: 'motivational'
  },
  {
    id: 'winter-strength',
    text: 'Winter strength builds from within—stay strong ❄️',
    priority: 'motivational'
  }
];

const DEFAULT_MESSAGE = "Your intelligent wellness companion is ready";

export const useHeroSubtext = () => {
  const { user } = useAuth();
  const { getTodaysProgress, currentDay } = useNutrition();
  const [heroMessage, setHeroMessage] = useState(DEFAULT_MESSAGE);

  const buildContext = (): MessageContext => {
    const now = new Date();
    const progress = getTodaysProgress();
    const foods = currentDay?.foods || [];
    
    // Time calculations
    const currentHour = now.getHours();
    const dayOfWeek = now.getDay();
    const currentMonth = now.getMonth() + 1;
    
    // Time of day classification
    let timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
    if (currentHour >= 6 && currentHour < 12) timeOfDay = 'morning';
    else if (currentHour >= 12 && currentHour < 18) timeOfDay = 'afternoon';
    else if (currentHour >= 18 && currentHour < 23) timeOfDay = 'evening';
    else timeOfDay = 'night';

    // Season calculation
    let season: 'summer' | 'winter' | 'fall' | 'spring';
    if (currentMonth >= 6 && currentMonth <= 8) season = 'summer';
    else if (currentMonth >= 12 || currentMonth <= 2) season = 'winter';
    else if (currentMonth >= 9 && currentMonth <= 11) season = 'fall';
    else season = 'spring';

    // Holiday detection (simplified)
    const isHoliday = (currentMonth === 12 && now.getDate() >= 20) || 
                      (currentMonth === 1 && now.getDate() <= 3) ||
                      (currentMonth === 11 && now.getDate() >= 20);

    // User activity calculations
    const lastLogTime = foods.length > 0 ? new Date(foods[foods.length - 1].timestamp) : null;
    const hoursInactive = lastLogTime ? 
      (now.getTime() - lastLogTime.getTime()) / (1000 * 60 * 60) : 48;

    // Simple streak calculation based on recent activity
    const currentStreak = Math.min(foods.length, 30);

    // Extract first name from user data
    const firstName = user?.user_metadata?.first_name || 
                     user?.user_metadata?.full_name?.split(' ')[0] || 
                     '';

    return {
      user,
      progress,
      currentDay,
      currentDate: now,
      currentHour,
      dayOfWeek,
      currentMonth,
      firstName,
      currentStreak,
      lastLogTime,
      hoursInactive,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      timeOfDay,
      season,
      isHoliday
    };
  };

  const checkMessageFreshness = (messageId: string): boolean => {
    const key = 'hero_subtext_last7';
    const stored = localStorage.getItem(key);
    const last7 = stored ? JSON.parse(stored) : [];
    
    return !last7.includes(messageId);
  };

  const markMessageUsed = (messageId: string): void => {
    const key = 'hero_subtext_last7';
    const stored = localStorage.getItem(key);
    const last7 = stored ? JSON.parse(stored) : [];
    
    // Add new message and keep only last 7
    last7.unshift(messageId);
    if (last7.length > 7) {
      last7.pop();
    }
    
    localStorage.setItem(key, JSON.stringify(last7));
  };

  const findMatchingMessage = (messages: HeroMessage[], context: MessageContext): HeroMessage | null => {
    for (const message of messages) {
      if (!checkMessageFreshness(message.id)) continue;

      // System messages (always match if fresh)
      if (message.priority === 'system') {
        return message;
      }

      // Timely message matching
      if (message.priority === 'timely') {
        const { timeOfDay, dayOfWeek, isWeekend, isHoliday } = context;
        
        if (message.id === 'good-morning' && timeOfDay === 'morning') return message;
        if (message.id === 'afternoon-energy' && timeOfDay === 'afternoon') return message;
        if (message.id === 'evening-reflect' && timeOfDay === 'evening') return message;
        if (message.id === 'weekend-vibes' && isWeekend) return message;
        if (message.id === 'monday-fresh' && dayOfWeek === 1 && timeOfDay === 'morning') return message;
        if (message.id === 'holiday-balance' && isHoliday) return message;
      }

      // Personalized message matching
      if (message.priority === 'personalized') {
        const { currentStreak, firstName, hoursInactive } = context;
        
        if (message.id === 'streak-fire' && currentStreak >= 3) return message;
        if (message.id === 'welcome-back' && firstName && hoursInactive >= 24) return message;
        if (message.id === 'coach-unlocked' && currentStreak >= 7) return message;
        if (message.id === 'consistency-champion' && firstName && currentStreak >= 14) return message;
      }

      // Motivational message matching
      if (message.priority === 'motivational') {
        const { season, timeOfDay } = context;
        
        if (message.id === 'summer-energy' && season === 'summer') return message;
        if (message.id === 'cozy-wellness' && season === 'fall') return message;
        if (message.id === 'winter-strength' && season === 'winter') return message;
        if (message.id === 'hydration-love' && timeOfDay === 'afternoon') return message;
        
        // Generic motivational messages can always match
        if (['progress-not-perfection', 'small-wins', 'mindful-moments'].includes(message.id)) {
          return message;
        }
      }
    }
    
    return null;
  };

  const interpolateMessage = (message: HeroMessage, context: MessageContext): string => {
    let text = message.text;
    
    // Replace placeholders
    text = text.replace('{firstName}', context.firstName || 'friend');
    text = text.replace('{streakDays}', context.currentStreak.toString());
    
    return text;
  };

  const generateHeroMessage = (): string => {
    // Check feature flag
    if (!flag('hero_subtext_dynamic')) {
      return DEFAULT_MESSAGE;
    }

    const context = buildContext();
    
    // Priority order: System → Timely → Personalized → Motivational → Default
    // Production always includes system messages (no QA options here)
    const allMessages = [
      ...SYSTEM_MESSAGES,
      ...TIMELY_MESSAGES, 
      ...PERSONALIZED_MESSAGES,
      ...MOTIVATIONAL_MESSAGES
    ];

    // Log when system message is available for production
    if (SYSTEM_MESSAGES.length > 0) {
      console.debug('[hero-subtext] system override selected');
    }

    const matchedMessage = findMatchingMessage(allMessages, context);
    
    if (matchedMessage) {
      const finalText = interpolateMessage(matchedMessage, context);
      
      // Ensure message is ≤72 characters
      if (finalText.length <= 72) {
        markMessageUsed(matchedMessage.id);
        console.log(`[HeroSubtext] id=${matchedMessage.id}`);
        return finalText;
      }
    }

    return DEFAULT_MESSAGE;
  };

  useEffect(() => {
    const message = generateHeroMessage();
    setHeroMessage(message);
  }, [user, currentDay]);

  return heroMessage;
};

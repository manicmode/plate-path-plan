import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/contexts/auth';
import { useNutrition } from '@/contexts/NutritionContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSound } from '@/hooks/useSound';
import { supabase } from '@/integrations/supabase/client';
import { SoundGate } from '@/lib/soundGate';

type Cta = { key: string; text: string; checkTrigger?: (ctx: any) => boolean };

const ROTATE_MS = 11000; // 11 seconds rotation

// Enhanced CTA pool with more dynamic messages
const ALL_CTAS: Cta[] = [
  {
    key: 'streak-momentum',
    text: '🔥 Your streak is building momentum — keep it alive!',
    checkTrigger: (ctx) => ctx.currentStreak >= 3
  },
  {
    key: 'hydration-reminder', 
    text: '💧 Stay hydrated — your body will thank you!',
    checkTrigger: (ctx) => ctx.waterLogsToday < 6
  },
  {
    key: 'movement-energy',
    text: '🏃‍♀️ A little movement goes a long way — energize your day!',
    checkTrigger: (ctx) => !ctx.activityLast48h
  },
  {
    key: 'mindful-moment',
    text: '🧘‍♀️ Take a mindful moment — breathe and center yourself.',
    checkTrigger: (ctx) => ctx.stressTagsLast48h || ctx.breathingSessionsLast7d < 2
  },
  {
    key: 'evening-reflection',
    text: '🌙 Evening reflection time — how did today treat you?',
    checkTrigger: (ctx) => ctx.upcomingBedtime && !ctx.lastMoodLog
  },
  {
    key: 'goal-progress',
    text: '🎯 Every small step counts toward your bigger goals.',
    checkTrigger: () => true // Always eligible
  },
  {
    key: 'wellness-journey',
    text: '✨ Your wellness journey is uniquely yours — celebrate it!',
    checkTrigger: () => true // Always eligible
  },
  {
    key: 'morning-energy',
    text: '☀️ Start your day with intention and positive energy.',
    checkTrigger: (ctx) => ctx.currentHour >= 6 && ctx.currentHour < 12
  },
  {
    key: 'afternoon-boost',
    text: '⚡ Afternoon energy boost — you\'ve got this!',
    checkTrigger: (ctx) => ctx.currentHour >= 12 && ctx.currentHour < 17
  },
  {
    key: 'consistency-wins',
    text: '📈 Consistency creates lasting change — one day at a time.',
    checkTrigger: () => true // Always eligible
  }
];

interface HomeCtaTickerProps {
  className?: string;
}

export const HomeCtaTicker: React.FC<HomeCtaTickerProps> = ({ className }) => {
  const { user } = useAuth();
  const { getTodaysProgress, currentDay, currentCoachCta, clearCoachCta, lastCoachCtaEnqueueId } = useNutrition();
  const isMobile = useIsMobile();
  const { playReminderChime, playAIThought } = useSound();
  const progress = getTodaysProgress();

  const lastEnqueueIdRef = useRef<number>(0);
  const lastBeepAtRef = useRef<number>(0);
  const [userProfile, setUserProfile] = useState<any>(null);

  // Build context for CTA eligibility checks
  const context = useMemo(() => {
    const now = new Date();
    const foodLogs = currentDay?.foods || [];
    const lastFoodLog = foodLogs.length > 0 ? new Date(foodLogs[foodLogs.length - 1].timestamp) : null;
    const hoursInactive = lastFoodLog ? (now.getTime() - lastFoodLog.getTime()) / (1000 * 60 * 60) : 48;
    
    return {
      user,
      progress,
      currentDay,
      userProfile,
      currentDate: now,
      currentHour: now.getHours(),
      currentStreak: Math.min(foodLogs.length, 7), // Simplified
      waterLogsToday: progress.hydration || 0,
      activityLast48h: hoursInactive < 48, // Simplified
      upcomingBedtime: now.getHours() >= 20,
      stressTagsLast48h: false, // Simplified - would need actual mood data
      breathingSessionsLast7d: 0, // Simplified - would need actual breathing data
      lastMoodLog: null, // Simplified - would need actual mood log
      hoursInactive
    };
  }, [user, progress, currentDay, userProfile]);

  // Build candidates with proper filtering and logging
  const candidates = useMemo(() => {
    const list = ALL_CTAS.filter(cta => (cta.checkTrigger ? cta.checkTrigger(context) : true));
    
    // Debug logging
    const logCandidates = async () => {
      const { nlog } = await import('@/lib/debugNudge');
      nlog("HERO][CANDIDATES", { 
        total: ALL_CTAS.length, 
        filtered: list.length, 
        keys: list.map(c => c.key) 
      });
    };
    logCandidates();
    
    return list;
  }, [context]);

  // Pick & rotate with last-key dedupe
  const [current, setCurrent] = useState<Cta | null>(null);
  const lastKeyRef = useRef<string | null>(localStorage.getItem("hero:lastKey") || null);

  useEffect(() => {
    if (!candidates.length) {
      const logFallback = async () => {
        const { nlog } = await import('@/lib/debugNudge');
        nlog("HERO][FALLBACK", {});
      };
      logFallback();
      setCurrent({ key: "default", text: "Your intelligent wellness companion is ready." });
      return;
    }

    const pickNext = () => {
      let pool = candidates;
      if (pool.length > 1 && lastKeyRef.current) {
        pool = pool.filter(c => c.key !== lastKeyRef.current);
        if (!pool.length) pool = candidates; // edge: all same key
      }
      
      const next = pool[Math.floor(Math.random() * pool.length)];
      lastKeyRef.current = next.key;
      localStorage.setItem("hero:lastKey", next.key);
      
      const logPick = async () => {
        const { nlog } = await import('@/lib/debugNudge');
        nlog("HERO][PICK", { key: next.key, dedupeOk: true });
      };
      logPick();
      
      setCurrent(next);
    };

    pickNext();
    const t = setInterval(pickNext, ROTATE_MS);
    return () => clearInterval(t);
  }, [candidates]);

  // Log render
  useEffect(() => {
    if (current) {
      const logRender = async () => {
        const { nlog } = await import('@/lib/debugNudge');
        nlog("HERO][RENDER", { key: current.key });
      };
      logRender();
    }
  }, [current]);

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

  // Play AI thought only when a new coach CTA is enqueued (with global debounce)
  useEffect(() => {
    if (!lastCoachCtaEnqueueId) return;
    if (lastCoachCtaEnqueueId === lastEnqueueIdRef.current) return;

    // Mark this enqueue id as processed immediately to avoid delayed beeps
    lastEnqueueIdRef.current = lastCoachCtaEnqueueId;

    // If tab is hidden, skip sound entirely
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
      return;
    }

    // Global debounce across all CTAs to ensure one beep per user action
    const SUPPRESS_WINDOW_MS = 3000;
    const now = Date.now();
    const since = now - (lastBeepAtRef.current || 0);
    if (since < SUPPRESS_WINDOW_MS) {
      return;
    }

    if (SoundGate.shouldSuppressAIThought(3000)) {
      return;
    }

    // Play once
    lastBeepAtRef.current = now;
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    playAIThought();
  }, [lastCoachCtaEnqueueId, playAIThought]);

  return (
    <div className={`text-balance ${className}`}>
      {current?.text}
    </div>
  );
};
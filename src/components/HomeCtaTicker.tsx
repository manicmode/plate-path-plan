import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/contexts/auth';
import { useNutrition } from '@/contexts/NutritionContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSound } from '@/hooks/useSound';
import { supabase } from '@/integrations/supabase/client';
import { SoundGate } from '@/lib/soundGate';
import { nlog, HERO_REV } from '@/lib/debugNudge';
import clsx from 'clsx';

type Cta = { key: string; text: string; checkTrigger?: (ctx: any) => boolean };

const ROTATE_MS = 11000;

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
  },
  {
    key: 'progress-celebration',
    text: '🎉 Take a moment to celebrate your progress — you\'re doing great!',
    checkTrigger: () => true // Always eligible
  },
  {
    key: 'healthy-habits',
    text: '🌱 Small healthy habits create big transformations.',
    checkTrigger: () => true // Always eligible
  }
];

// Main hero text rotator component implementing the robust rotator
function HeroTextRotator({
  context,
  allCtas,
  className,
}: { context: any; allCtas: Cta[]; className?: string }) {
  // Build candidates once per input change
  const candidates = useMemo(() => {
    const list = (allCtas || []).filter(c => (c.checkTrigger ? c.checkTrigger(context) : true));
    nlog("HERO][CANDIDATES", { rev: HERO_REV, total: allCtas?.length || 0, filtered: list.length, keys: list.map(c => c.key) });
    return list;
  }, [allCtas, context]);

  // Load last key once (don't thrash state during SSR/hydration)
  const lastKeyRef = useRef<string | null>(null);
  useEffect(() => {
    try { lastKeyRef.current = localStorage.getItem("hero:lastKey"); } catch {}
  }, []);

  const [current, setCurrent] = useState<Cta | null>(null);
  const [fade, setFade] = useState(false);
  const intervalRef = useRef<number | null>(null);
  const visibleRef = useRef<boolean>(true);

  const pickNext = () => {
    let pool = candidates;
    if (!pool.length) {
      nlog("HERO][FALLBACK", { rev: HERO_REV });
      setCurrent({ key: "default", text: "Your intelligent wellness companion is ready." });
      return;
    }
    if (pool.length > 1 && lastKeyRef.current) {
      const filtered = pool.filter(c => c.key !== lastKeyRef.current);
      if (filtered.length) pool = filtered;
    }
    const next = pool[Math.floor(Math.random() * pool.length)];
    lastKeyRef.current = next.key;
    try { localStorage.setItem("hero:lastKey", next.key); } catch {}
    nlog("HERO][PICK", { rev: HERO_REV, key: next.key, total: pool.length });
    // Fade out then in to avoid flash
    setFade(true);
    window.setTimeout(() => {
      setCurrent(next);
      setFade(false);
      nlog("HERO][RENDER", { rev: HERO_REV, key: next.key });
    }, 160);
  };

  // Single interval with StrictMode safety
  useEffect(() => {
    const start = () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      intervalRef.current = window.setInterval(() => {
        if (visibleRef.current) pickNext();
      }, ROTATE_MS) as unknown as number;
    };
    pickNext();
    start();
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidates]); // only when candidate pool changes

  // Pause/resume on tab visibility change
  useEffect(() => {
    const onVis = () => {
      visibleRef.current = document.visibilityState === "visible";
      nlog(visibleRef.current ? "HERO][RESUME" : "HERO][PAUSE", { rev: HERO_REV, state: document.visibilityState });
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  return (
    <div className={clsx("hero-ticker relative", className)} aria-live="polite">
      <div
        className={clsx(
          "transition-opacity duration-200 ease-out",
          fade ? "opacity-0" : "opacity-100"
        )}
        style={{ minHeight: "1.5rem" }} // prevent layout jump
      >
        {current?.text ?? ""}
      </div>
    </div>
  );
}

// Wrapper component that builds context and passes to robust rotator
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

  return <HeroTextRotator context={context} allCtas={ALL_CTAS} className={className} />;
};
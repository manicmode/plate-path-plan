import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';

type SuggestionSignals = {
  hasGoalMatch?: boolean;
  domainGap?: boolean;
  isEasy?: boolean;
  lowRecentLogs?: boolean;
  timeFit?: 'morning'|'evening'|null;
  diversityBoost?: boolean;
};

type Suggestion = {
  id: string;
  slug: string;
  title: string;
  domain: 'nutrition' | 'exercise' | 'recovery';
  difficulty: string;
  description?: string | null;
  icon?: string | null;
  category?: string | null;
  score: number;
  reasons: string[];
};

function scoreSuggestion(habit: any, ctx: {
  goals?: string[];
  activeDomains: Set<string>;
  recentLogsCount?: number;
  typicalTime?: 'morning'|'evening'|null;
  recentAddedSlugs?: string[];
}): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  // Goal match (simple tag/name match)
  const name = (habit.title || habit.name || '').toLowerCase();
  const goalMatch = ctx.goals?.some(g => name.includes(g.toLowerCase())) ?? false;
  if (goalMatch) { 
    score += 3; 
    const matchedGoal = ctx.goals!.find(g => name.includes(g.toLowerCase()));
    reasons.push(`🎯 Matches your goal: **${matchedGoal}**`); 
  }

  // Domain gap
  if (!ctx.activeDomains.has(habit.domain)) { 
    score += 2; 
    reasons.push(`⚖️ Balances your routine (no active **${habit.domain}** habits)`); 
  }

  // Easy starter
  if ((habit.difficulty || '').toLowerCase() === 'easy') { 
    score += 2; 
    reasons.push('🚀 Easy starter habit to build momentum'); 
  }

  // Consistency boost
  if ((ctx.recentLogsCount ?? 0) < 3) { 
    score += 2; 
    reasons.push('🔁 Helps improve consistency (few logs recently)'); 
  }

  // Time fit (simplified for now)
  if (ctx.typicalTime) { 
    score += 1; 
    reasons.push(`☀️ Fits your typical **${ctx.typicalTime}** schedule`); 
  }

  // Diversity boost
  if (ctx.recentAddedSlugs && ctx.recentAddedSlugs.length) { 
    score += 1; 
    reasons.push('🧩 Adds variety to prevent burn-out'); 
  }

  // Default reason if no specific ones
  if (reasons.length === 0) {
    reasons.push('⭐ Popular habit with good success rates');
  }

  return { score, reasons: reasons.slice(0, 3) };
}

const TTL_MS = 12 * 60 * 60 * 1000; // 12h

export function useAiSuggestions(limit = 8) {
  const { user, ready } = useSupabaseAuth();
  const [data, setData] = useState<Suggestion[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  const cacheKey = useMemo(
    () => (user?.id ? `ai_suggestions_v2:${user.id}` : null),
    [user?.id]
  );

  // Clean up on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // read cache once
  useEffect(() => {
    if (!cacheKey) return;
    try {
      const raw = localStorage.getItem(cacheKey);
      if (!raw) return;
      const { ts, payload } = JSON.parse(raw);
      if (Date.now() - ts < TTL_MS && Array.isArray(payload) && payload.length) {
        setData(payload);
      }
    } catch {}
  }, [cacheKey]);

  useEffect(() => {
    if (!ready || !user?.id) return;

    let cancelled = false;

    async function loadSuggestions() {
      if (!mountedRef.current) return;
      
      setLoading(true);
      setError(null);

      // abort any in-flight request
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      try {
        // 1) Fetch all active habits + user's current habits
        const [{ data: all, error: e1 }, { data: mine, error: e2 }] = await Promise.all([
          supabase.rpc('rpc_list_active_habits', { p_domain: null }),
          supabase.rpc('rpc_get_my_habits_with_stats')
        ]);
        if (e1) throw e1;
        if (e2) throw e2;

        const owned = new Set((mine ?? []).map((h: any) => h.habit_slug));
        const activeDomains = new Set((mine ?? []).map((h: any) => h.domain || h.habit_slug.split('-')[0]));
        
        // Get context for scoring
        const totalLogs = (mine ?? []).reduce((sum: number, h: any) => sum + (h.last_30d_count || 0), 0);
        const scoringContext = {
          goals: ['sleep', 'nutrition', 'fitness', 'mindfulness'], // simplified
          activeDomains,
          recentLogsCount: totalLogs,
          typicalTime: 'morning' as const, // simplified
          recentAddedSlugs: (mine ?? []).slice(-3).map((h: any) => h.habit_slug)
        };

        // 2) Score and rank habits
        const scoredHabits = (all ?? [])
          .filter((h: any) => !owned.has(h.slug))
          .map((h: any) => {
            const baseHabit = {
              id: String(h.id || h.slug),
              slug: String(h.slug),
              title: String(h.title || h.name || h.slug.replaceAll('-', ' ')),
              description: String(h.description || h.summary || '').trim(),
              domain: h.domain,
              difficulty: String(h.difficulty || 'easy').toLowerCase(),
              category: h.category || null,
              icon: null,
            };
            
            const { score, reasons } = scoreSuggestion(h, scoringContext);
            
            return {
              ...baseHabit,
              score: score + (h.slug.charCodeAt(0) % 10) / 10, // tiny variety nudge
              reasons
            } as Suggestion;
          })
          .sort((a, b) => b.score - a.score);

        // 3) Pick a balanced mix: limit total (per domain if possible)
        const byDomain = { nutrition: [] as Suggestion[], exercise: [] as Suggestion[], recovery: [] as Suggestion[] };
        for (const h of scoredHabits) { (byDomain as any)[h.domain]?.push(h); }
        const take = (arr: Suggestion[], n: number) => arr.slice(0, n);

        const perDomain = Math.floor(limit / 3);
        const curated = [
          ...take(byDomain.nutrition, perDomain),
          ...take(byDomain.exercise, perDomain),
          ...take(byDomain.recovery, perDomain),
        ];
        const fill = scoredHabits.filter(h => !curated.find(c => c.slug === h.slug)).slice(0, Math.max(0, limit - curated.length));
        const finalList = [...curated, ...fill];

        if (!cancelled && mountedRef.current && !ac.signal.aborted) {
          setData(finalList);
          // cache
          if (cacheKey) {
            localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), payload: finalList }));
          }
        }
      } catch (err: any) {
        console.error('[AI Suggestions] load error', err);
        if (!cancelled && mountedRef.current && !ac.signal.aborted) {
          setError(err?.message ?? 'Failed to load suggestions');
        }
      } finally {
        if (!cancelled && mountedRef.current && !ac.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadSuggestions();
    return () => { 
      cancelled = true; 
      abortRef.current?.abort();
    };
  }, [ready, user?.id, cacheKey, limit]);

  const removeFromSuggestions = (slug: string) => {
    setData(prev => prev ? prev.filter(h => h.slug !== slug) : prev);
  };

  return { data, loading, error, removeFromSuggestions };
}
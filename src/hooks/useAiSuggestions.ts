import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';

type Suggestion = {
  id: string;
  slug: string;
  title: string;
  domain: 'nutrition' | 'exercise' | 'recovery';
  difficulty: string;
  description?: string | null;
  icon?: string | null;
  category?: string | null;
};

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

        // 2) Lightweight "AI" scoring (deterministic, client-side)
        const profile = { preferredDomains: [], preferredDifficulty: null as null | string };
        const weight = {
          newHabit: 4,                // not already owned
          domainMatch: 2,             // if domain is in preferredDomains
          easyBias: 1,                // small bias toward easy if no profile
        };

        function score(h: any): number {
          let s = 0;
          if (!owned.has(h.slug)) s += weight.newHabit;
          if (profile.preferredDomains.includes?.(h.domain)) s += weight.domainMatch;
          if (!profile.preferredDifficulty && String(h.difficulty).toLowerCase() === 'easy') s += weight.easyBias;
          // tiny variety nudge so the order feels alive but stable
          s += (h.slug.charCodeAt(0) % 10) / 10;
          return s;
        }

        const full: Suggestion[] = (all ?? []).map((h: any) => ({
          id: String(h.id || h.slug),
          slug: String(h.slug),
          title: String(h.title || h.name || h.slug.replaceAll('-', ' ')),
          description: String(h.description || h.summary || '').trim(),
          domain: h.domain,
          difficulty: String(h.difficulty || 'easy').toLowerCase(),
          category: h.category || null,
          icon: null,
        }));

        const ranked = full
          .filter(h => !owned.has(h.slug))       // never recommend already added
          .sort((a, b) => score(b) - score(a));

        // 3) Pick a balanced mix: limit total (4 per domain if possible)
        const byDomain = { nutrition: [] as Suggestion[], exercise: [] as Suggestion[], recovery: [] as Suggestion[] };
        for (const h of ranked) { (byDomain as any)[h.domain]?.push(h); }
        const take = (arr: Suggestion[], n: number) => arr.slice(0, n);

        const perDomain = Math.floor(limit / 3);
        const curated = [
          ...take(byDomain.nutrition, perDomain),
          ...take(byDomain.exercise, perDomain),
          ...take(byDomain.recovery, perDomain),
        ];
        const fill = ranked.filter(h => !curated.find(c => c.slug === h.slug)).slice(0, Math.max(0, limit - curated.length));
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
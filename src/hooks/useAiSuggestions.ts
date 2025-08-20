import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';

type Suggestion = {
  slug: string;
  title: string;
  domain: 'nutrition' | 'exercise' | 'recovery';
  difficulty: string;
  description?: string | null;
  icon?: string | null;
};

const TTL_MS = 12 * 60 * 60 * 1000; // 12h

export function useAiSuggestions(limit = 8) {
  const { user, ready } = useSupabaseAuth();
  const [data, setData] = useState<Suggestion[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const cacheKey = useMemo(
    () => (user?.id ? `ai_suggestions_v1:${user.id}` : null),
    [user?.id]
  );

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

    // don't clear existing data (sticky) — just show skeleton overlay via `loading`
    setLoading(true);
    setError(null);

    // abort any in-flight request
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    (async () => {
      try {
        // 1) user's active slugs
        const { data: my, error: e1 } = await supabase
          .rpc('rpc_get_my_habits_with_stats');
        if (e1) throw e1;
        const activeSlugs = new Set((my ?? []).map((h: any) => h.habit_slug));

        // 2) all templates
        const { data: all, error: e2 } = await supabase
          .rpc('rpc_list_active_habits', { p_domain: null });
        if (e2) throw e2;

        // simple client-side ranking: exclude active, prefer easy/medium, diverse domains
        const pool = (all ?? []).filter((t: any) => !activeSlugs.has(t.slug));

        // score
        const scored = pool.map((t: any) => {
          let score = 0;
          if (t.difficulty === 'easy') score += 3;
          if (t.difficulty === 'medium') score += 2;
          // small boost for shorter descriptions
          if ((t.summary?.length ?? 0) < 120) score += 1;
          return { t, score };
        });

        scored.sort((a, b) => b.score - a.score);

        // pick top `limit`, enforce domain diversity
        const seen = new Set();
        const picked: Suggestion[] = [];
        for (const { t } of scored) {
          const key = t.domain;
          if (picked.length < limit && !seen.has(key)) {
            picked.push({
              slug: t.slug,
              title: t.name,
              domain: t.domain,
              difficulty: t.difficulty,
              description: t.summary,
              icon: null,
            });
            seen.add(key);
          }
        }
        // if fewer than limit, top up
        for (const { t } of scored) {
          if (picked.length >= limit) break;
          if (!picked.find(p => p.slug === t.slug)) {
            picked.push({
              slug: t.slug,
              title: t.name,
              domain: t.domain,
              difficulty: t.difficulty,
              description: t.summary,
              icon: null,
            });
          }
        }

        if (!ac.signal.aborted) {
          setData(picked);
          // cache
          if (cacheKey) {
            localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), payload: picked }));
          }
        }
      } catch (err: any) {
        if (!ac.signal.aborted) {
          setError(err?.message ?? 'Failed to load suggestions');
        }
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    })();

    return () => ac.abort();
  }, [ready, user?.id, cacheKey, limit]);

  return { data, loading, error, refetch: () => setData(d => d) };
}
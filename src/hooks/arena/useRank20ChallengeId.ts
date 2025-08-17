import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ARENA_ENABLED, ARENA_SAFE_FALLBACK } from '@/lib/featureFlags';
import { arenaUiHeartbeat } from '@/lib/arenaDiag';

export function useRank20ChallengeId() {
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    async function fetchChallengeId() {
      try {
        setLoading(true);
        setError(null);

        if (!ARENA_ENABLED) {
          setChallengeId(null);
          return;
        }

        // Check auth session first
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setChallengeId(null);
          return;
        }
        
        let challengeIdSource: 'cache' | 'rpc-safe' | 'rpc-fallback' | 'fallback' | 'none' = 'none';
        let lastErr: string | null = null;

        try {
          // 1. Check cached value first
          const cached = queryClient.getQueryData(['r20:chosen-id']) as string | undefined;
          if (cached) {
            setChallengeId(cached);
            challengeIdSource = 'cache';
            arenaUiHeartbeat?.(supabase, 'r20:cid:cache');
            return;
          }

          // 2. Try safe wrapper (SECURITY DEFINER)
          const safe = await supabase.rpc('my_rank20_chosen_challenge_id_safe');
          if (!safe.error && safe.data) {
            setChallengeId(safe.data as string);
            challengeIdSource = 'rpc-safe';
            arenaUiHeartbeat?.(supabase, 'r20:cid:rpc-safe');
            return;
          }
          lastErr = safe.error?.message ?? 'null id from rpc-safe';

          // 3. Try server-side fallback (SECURITY DEFINER)
          const fb = await supabase.rpc('my_rank20_active_challenge_id_fallback');
          if (!fb.error && fb.data) {
            setChallengeId(fb.data as string);
            challengeIdSource = 'rpc-fallback';
            arenaUiHeartbeat?.(supabase, 'r20:cid:rpc-fallback');
            return;
          }
          lastErr = fb.error?.message ?? lastErr ?? 'rpc-fallback failed';

          // 4. DEV fallback (client-side table query)
          if (ARENA_SAFE_FALLBACK) {
            const { data: rows, error: fErr } = await supabase
              .from('private_challenges')
              .select('id,title,status,start_date,challenge_type,category')
              .eq('status', 'active')
              .or('title.ilike.%rank%,challenge_type.ilike.%arena%,category.ilike.%arena%')
              .order('start_date', { ascending: false })
              .limit(1);

            if (!fErr && rows && rows.length) {
              setChallengeId(rows[0].id);
              challengeIdSource = 'fallback';
              arenaUiHeartbeat?.(supabase, 'r20:cid:fallback');
              return;
            } else {
              lastErr = fErr?.message ?? lastErr ?? 'fallback failed';
            }
          }
          
          // 5. Nothing worked
          arenaUiHeartbeat?.(supabase, 'r20:cid:none');
        } finally {
          // DEV-only: expose minimal debug without changing the hook API
          if (typeof window !== 'undefined') {
            (window as any).__arenaDbg = {
              ...(window as any).__arenaDbg,
              cidSource: challengeIdSource,
              cidError: lastErr,
            };
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch challenge ID');
      } finally {
        setLoading(false);
      }
    }

    fetchChallengeId();
  }, [queryClient]);

  return { challengeId, loading, error };
}
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ARENA_ENABLED, ARENA_SAFE_FALLBACK } from '@/lib/featureFlags';
import { arenaUiHeartbeat } from '@/lib/arenaDiag';

export function useRank20ChallengeId() {
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        
        let challengeIdSource: 'rpc' | 'rpc-safe' | 'rpc-fallback' | 'fallback' | 'none' = 'none';
        let lastErr: string | null = null;

        try {
          const { data, error } = await supabase.rpc('my_rank20_chosen_challenge_id');
          if (!error && data) {
            setChallengeId(data as string);
            challengeIdSource = 'rpc';
            arenaUiHeartbeat?.(supabase, 'r20:cid:rpc');
          } else {
            lastErr = error?.message ?? 'null id from rpc';
            
            // Try safe wrapper before fallback
            const safe = await supabase.rpc('my_rank20_chosen_challenge_id_safe');
            if (!safe.error && safe.data) {
              setChallengeId(safe.data as string);
              challengeIdSource = 'rpc-safe';
              arenaUiHeartbeat?.(supabase, 'r20:cid:rpc-safe');
            } else {
              // Try RPC fallback before table fallback
              const fb = await supabase.rpc('my_rank20_active_challenge_id_fallback');
              if (!fb.error && fb.data) {
                setChallengeId(fb.data as string);
                challengeIdSource = 'rpc-fallback';
                arenaUiHeartbeat?.(supabase, 'r20:cid:rpc-fallback');
              } else {
                // DEV fallback
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
                  } else {
                    lastErr = fErr?.message ?? lastErr ?? 'fallback failed';
                    arenaUiHeartbeat?.(supabase, 'r20:cid:none');
                  }
                } else {
                  arenaUiHeartbeat?.(supabase, 'r20:cid:none');
                }
              }
            }
          }
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
  }, []);

  return { challengeId, loading, error };
}
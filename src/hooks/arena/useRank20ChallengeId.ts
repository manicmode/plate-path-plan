import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ARENA_ENABLED, ARENA_SAFE_FALLBACK } from '@/lib/featureFlags';

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
        
        const { data, error: rpcError } = await supabase.rpc('my_rank20_chosen_challenge_id');
        
        if (!rpcError && data) {
          setChallengeId(data);
        } else if (ARENA_SAFE_FALLBACK) {
          // DEV-ONLY fallback: find active 'rank/arena' challenge
          const { data: rows } = await supabase
            .from('private_challenges')
            .select('id,title,challenge_type,category,status,start_date')
            .eq('status', 'active')
            .or('title.ilike.%rank%,challenge_type.ilike.%arena%,category.ilike.%arena%')
            .order('start_date', { ascending: false })
            .limit(1);

          if (rows && rows.length > 0) {
            setChallengeId(rows[0].id);
          } else {
            setChallengeId(null);
          }
        } else if (rpcError) {
          setError(rpcError.message);
          setChallengeId(null);
        } else {
          // Fallback to current active challenge if chosen challenge is null
          const { data: fallbackId } = await supabase.rpc('current_rank20_challenge_id');
          setChallengeId(fallbackId || null);
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
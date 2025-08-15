import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ARENA_ENABLED } from '@/lib/featureFlags';

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
        
        if (rpcError) {
          setError(rpcError.message);
          return;
        }
        
        setChallengeId(data || null);
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
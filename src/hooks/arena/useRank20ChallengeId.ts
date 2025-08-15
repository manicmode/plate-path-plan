import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useRank20ChallengeId() {
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchChallengeId() {
      try {
        setLoading(true);
        setError(null);
        
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
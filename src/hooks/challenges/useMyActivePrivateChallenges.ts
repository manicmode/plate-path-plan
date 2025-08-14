import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PrivateChallenge {
  id: string;
  title: string;
  category: string | null;
  challenge_type: string | null;
  created_at: string;
}

export function useMyActivePrivateChallenges() {
  const [items, setItems] = useState<PrivateChallenge[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      // Auth guard: don't RPC while unauthenticated
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session?.user?.id) {
        if (process.env.NODE_ENV !== 'production') console.warn('No session; skipping my_active_private_challenges RPC');
        setItems([]);
        setIsLoading(false);
        return;
      }

      const { data, error: rpcError } = await supabase.rpc('my_active_private_challenges');
      
      if (rpcError) {
        console.error('[my_active_private_challenges] RPC error:', rpcError);
        setError(rpcError.message);
      } else {
        const safeItems = (data ?? []).filter((i: any) => i.challenge_type !== 'rank_of_20');
        if (safeItems.length !== (data ?? []).length) {
          if (process.env.NODE_ENV !== 'production') console.warn('Filtered rank_of_20 from active challenges');
        }
        setItems(safeItems);
      }

      setIsLoading(false);
    };

    fetchData();
  }, []);

  return { items, isLoading, error };
}
import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useDebouncedFetch } from '@/hooks/useDebouncedFetch';

export type ArenaRow = {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  points: number;   // numeric from SQL -> number
  streak: number;   // int
  rank: number;     // int
};

export function useRank20Leaderboard(limit = 20, offset = 0) {
  const [data, setData] = useState<ArenaRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    // Check authentication first
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) {
      setData([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const { data: rows, error: rpcError } = await supabase
        .rpc('my_rank20_leaderboard', { p_limit: limit, p_offset: offset });

      if (rpcError) {
        console.error('[Arena leaderboard error]', rpcError);
        setError(new Error(rpcError.message));
        setData([]);
        return;
      }

      const processedRows = (rows || []).map((row: any) => ({
        user_id: row.user_id,
        display_name: row.display_name,
        avatar_url: row.avatar_url,
        points: Number(row.points || 0), // Coerce to number
        streak: row.streak || 0,
        rank: row.rank || 0,
      }));

      console.log('[Arena rows]', processedRows);
      setData(processedRows);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('[Arena leaderboard error]', err);
      setError(new Error(errorMessage));
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [limit, offset]);

  // Debounced fetch to avoid double calls during mounts
  const { debouncedFetch } = useDebouncedFetch(fetchLeaderboard, 150);

  // Initial load
  useEffect(() => {
    debouncedFetch();
  }, [debouncedFetch]);

  const refresh = useCallback(async () => {
    await fetchLeaderboard();
  }, [fetchLeaderboard]);

  return { data, loading, error, refresh };
}
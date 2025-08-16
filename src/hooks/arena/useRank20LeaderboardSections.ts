import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ARENA_ENABLED } from '@/lib/featureFlags';

export type ArenaRow = {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  points: number;
  streak: number;
  rank: number;
};

export type LeaderboardSections = {
  combined: ArenaRow[];
  nutrition: ArenaRow[];
  exercise: ArenaRow[];
  recovery: ArenaRow[];
};

export function useRank20LeaderboardSections(limit = 20, offset = 0) {
  const [data, setData] = useState<LeaderboardSections>({
    combined: [],
    nutrition: [],
    exercise: [],
    recovery: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboards = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!ARENA_ENABLED) {
        setData({ combined: [], nutrition: [], exercise: [], recovery: [] });
        return;
      }

      // Check auth session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setData({ combined: [], nutrition: [], exercise: [], recovery: [] });
        return;
      }

      // Fetch all 4 leaderboards in parallel
      const [combinedResult, nutritionResult, exerciseResult, recoveryResult] = await Promise.all([
        supabase.rpc('my_rank20_leaderboard_combined', { p_limit: limit, p_offset: offset }),
        supabase.rpc('my_rank20_leaderboard_nutrition', { p_limit: limit, p_offset: offset }),
        supabase.rpc('my_rank20_leaderboard_exercise', { p_limit: limit, p_offset: offset }),
        supabase.rpc('my_rank20_leaderboard_recovery', { p_limit: limit, p_offset: offset })
      ]);

      // Check for errors
      if (combinedResult.error) throw combinedResult.error;
      if (nutritionResult.error) throw nutritionResult.error;
      if (exerciseResult.error) throw exerciseResult.error;
      if (recoveryResult.error) throw recoveryResult.error;

      setData({
        combined: combinedResult.data || [],
        nutrition: nutritionResult.data || [],
        exercise: exerciseResult.data || [],
        recovery: recoveryResult.data || []
      });

      // Log nutrition RPC rows for verification
      console.log('[Nutrition RPC rows]', nutritionResult.data?.length || 0, (nutritionResult.data || []).slice(0, 2));

      console.log('Leaderboard sections fetched:', {
        combined: combinedResult.data?.length || 0,
        nutrition: nutritionResult.data?.length || 0,
        exercise: exerciseResult.data?.length || 0,
        recovery: recoveryResult.data?.length || 0
      });

    } catch (err) {
      console.error('Error fetching leaderboard sections:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch leaderboard sections');
    } finally {
      setLoading(false);
    }
  }, [limit, offset]);

  useEffect(() => {
    fetchLeaderboards();
  }, [fetchLeaderboards]);

  const refresh = useCallback(() => {
    fetchLeaderboards();
  }, [fetchLeaderboards]);

  return {
    combined: data.combined,
    nutrition: data.nutrition,
    exercise: data.exercise,
    recovery: data.recovery,
    loading,
    error,
    refresh
  };
}
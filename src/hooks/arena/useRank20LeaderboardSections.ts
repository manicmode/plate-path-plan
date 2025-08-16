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

      // Per-section logging
      if (combinedResult.error)   console.error('[Arena RPC error] combined:', combinedResult.error);
      if (nutritionResult.error)  console.error('[Arena RPC error] nutrition:', nutritionResult.error);
      if (exerciseResult.error)   console.error('[Arena RPC error] exercise:', exerciseResult.error);
      if (recoveryResult.error)   console.error('[Arena RPC error] recovery:', recoveryResult.error);

      // Coerce to arrays
      const combinedRows  = combinedResult.data  ?? [];
      const nutritionRows = nutritionResult.data ?? [];
      const exerciseRows  = exerciseResult.data  ?? [];
      const recoveryRows  = recoveryResult.data  ?? [];

      // Determine partial success
      const anyData  = [combinedRows, nutritionRows, exerciseRows, recoveryRows].some(a => a.length > 0);
      const errors   = {
        combined:  combinedResult.error?.message ?? null,
        nutrition: nutritionResult.error?.message ?? null,
        exercise:  exerciseResult.error?.message ?? null,
        recovery:  recoveryResult.error?.message ?? null,
      };
      const anyError  = Object.values(errors).some(Boolean);
      const showError = !anyData && anyError;

      // Optional: quick visibility on counts
      console.log('[Arena sections] counts', {
        combined: combinedRows.length,
        nutrition: nutritionRows.length,
        exercise: exerciseRows.length,
        recovery: recoveryRows.length,
      });

      // Log nutrition RPC rows for verification
      console.log('[Nutrition RPC rows]', nutritionRows.length, nutritionRows.slice(0, 2));

      setData({
        combined: combinedRows,
        nutrition: nutritionRows,
        exercise: exerciseRows,
        recovery: recoveryRows
      });

      setError(showError ? 'Failed to fetch leaderboard sections' : null);
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
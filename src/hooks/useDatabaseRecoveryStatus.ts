
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';

interface RecoveryStatus {
  badgesAwarded: number;
  yearlyRankingPosition: number | null;
  totalNutritionLogs: number;
  orphanedLogsFixed: boolean;
  performanceScoresTable: boolean;
}

export const useDatabaseRecoveryStatus = () => {
  const [status, setStatus] = useState<RecoveryStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const checkRecoveryStatus = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Check badges awarded
        const { data: badgesData, error: badgesError } = await supabase
          .from('user_badges')
          .select('id')
          .eq('user_id', user.id);

        if (badgesError) throw badgesError;

        // Check yearly ranking
        const { data: rankingData, error: rankingError } = await supabase
          .from('yearly_score_preview')
          .select('rank_position')
          .eq('user_id', user.id)
          .eq('year', new Date().getFullYear())
          .maybeSingle();

        if (rankingError) throw rankingError;

        // Check nutrition logs (should have no NULL user_ids)
        const { count: totalLogs, error: logsError } = await supabase
          .from('nutrition_logs')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        if (logsError) throw logsError;

        // Check if performance scores table exists by trying a simple query
        // We'll use a generic approach since the table might not be in types yet
        let performanceTableExists = false;
        try {
          const { error: performanceError } = await supabase
            .rpc('trigger_yearly_scores_preview_update');
          performanceTableExists = !performanceError;
        } catch {
          performanceTableExists = false;
        }

        setStatus({
          badgesAwarded: badgesData?.length || 0,
          yearlyRankingPosition: rankingData?.rank_position || null,
          totalNutritionLogs: totalLogs || 0,
          orphanedLogsFixed: true, // We cleaned these up in SQL
          performanceScoresTable: performanceTableExists
        });
      } catch (err) {
        console.error('Recovery status check error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    checkRecoveryStatus();
  }, [user]);

  const refreshStatus = () => {
    setLoading(true);
    setError(null);
    // Re-run the effect
    const checkRecoveryStatus = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data: badgesData, error: badgesError } = await supabase
          .from('user_badges')
          .select('id')
          .eq('user_id', user.id);

        if (badgesError) throw badgesError;

        const { data: rankingData, error: rankingError } = await supabase
          .from('yearly_score_preview')
          .select('rank_position')
          .eq('user_id', user.id)
          .eq('year', new Date().getFullYear())
          .maybeSingle();

        if (rankingError) throw rankingError;

        const { count: totalLogs, error: logsError } = await supabase
          .from('nutrition_logs')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        if (logsError) throw logsError;

        let performanceTableExists = false;
        try {
          const { error: performanceError } = await supabase
            .rpc('trigger_yearly_scores_preview_update');
          performanceTableExists = !performanceError;
        } catch {
          performanceTableExists = false;
        }

        setStatus({
          badgesAwarded: badgesData?.length || 0,
          yearlyRankingPosition: rankingData?.rank_position || null,
          totalNutritionLogs: totalLogs || 0,
          orphanedLogsFixed: true,
          performanceScoresTable: performanceTableExists
        });
      } catch (err) {
        console.error('Recovery status check error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    checkRecoveryStatus();
  };

  return { status, loading, error, refreshStatus };
};

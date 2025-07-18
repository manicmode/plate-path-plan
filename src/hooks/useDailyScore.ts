import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';

interface DailyScore {
  target_date: string;
  daily_performance_score: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  hydration_ml: number;
  supplement_count: number;
}

interface ScoreStats {
  currentScore: number;
  weeklyAverage: number;
  monthlyAverage: number;
  streak: number;
  bestScore: number;
}

export const useDailyScore = () => {
  const { user } = useAuth();
  const [todayScore, setTodayScore] = useState<number | null>(null);
  const [scoreStats, setScoreStats] = useState<ScoreStats | null>(null);
  const [weeklyScores, setWeeklyScores] = useState<DailyScore[]>([]);
  const [monthlyScores, setMonthlyScores] = useState<DailyScore[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDailyScores = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Fetch today's score
      const { data: todayData } = await supabase
        .from('daily_nutrition_targets')
        .select('daily_performance_score')
        .eq('user_id', user.id)
        .eq('target_date', today)
        .maybeSingle();

      setTodayScore(todayData?.daily_performance_score || 0);

      // Fetch weekly scores for trend analysis
      const { data: weeklyData } = await supabase
        .from('daily_nutrition_targets')
        .select('*')
        .eq('user_id', user.id)
        .gte('target_date', weekAgo)
        .order('target_date', { ascending: false });

      setWeeklyScores(weeklyData || []);

      // Fetch monthly scores for leaderboard and stats
      const { data: monthlyData } = await supabase
        .from('daily_nutrition_targets')
        .select('*')
        .eq('user_id', user.id)
        .gte('target_date', monthAgo)
        .order('target_date', { ascending: false });

      setMonthlyScores(monthlyData || []);

      // Calculate stats
      if (monthlyData && monthlyData.length > 0) {
        const scores = monthlyData.map(d => d.daily_performance_score || 0);
        const validScores = scores.filter(s => s > 0);
        
        const weeklyAverage = weeklyData && weeklyData.length > 0
          ? weeklyData.reduce((sum, d) => sum + (d.daily_performance_score || 0), 0) / weeklyData.length
          : 0;

        const monthlyAverage = validScores.length > 0
          ? validScores.reduce((sum, score) => sum + score, 0) / validScores.length
          : 0;

        const bestScore = Math.max(...scores);

        // Calculate streak (consecutive days with score > 70)
        let streak = 0;
        for (const score of scores) {
          if (score >= 70) {
            streak++;
          } else {
            break;
          }
        }

        setScoreStats({
          currentScore: todayData?.daily_performance_score || 0,
          weeklyAverage,
          monthlyAverage,
          streak,
          bestScore
        });
      }

    } catch (error) {
      console.error('Error fetching daily scores:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDailyScores();
  }, [user?.id]);

  const refreshScores = () => {
    fetchDailyScores();
  };

  return {
    todayScore,
    scoreStats,
    weeklyScores,
    monthlyScores,
    loading,
    refreshScores
  };
};
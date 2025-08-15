import { supabase } from "@/integrations/supabase/client";

export type UserStats = {
  score: number;
  streak: number;
  progressPct?: number;
};

// Fetch user stats from various sources to calculate a comprehensive score
export async function fetchUserStats(userId: string): Promise<UserStats> {
  try {
    // Get user profile for basic streak info
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('current_nutrition_streak, current_hydration_streak, current_supplement_streak')
      .eq('user_id', userId)
      .single();

    // Get recent activity logs for score calculation
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      { data: nutritionLogs },
      { data: hydrationLogs },
      { data: supplementLogs },
      { data: exerciseLogs },
      { data: recoveryLogs }
    ] = await Promise.all([
      supabase
        .from('nutrition_logs')
        .select('id, created_at')
        .eq('user_id', userId)
        .gte('created_at', thirtyDaysAgo.toISOString()),
      
      supabase
        .from('hydration_logs')
        .select('id, created_at')
        .eq('user_id', userId)
        .gte('created_at', thirtyDaysAgo.toISOString()),
      
      supabase
        .from('supplement_logs')
        .select('id, created_at')
        .eq('user_id', userId)
        .gte('created_at', thirtyDaysAgo.toISOString()),
      
      supabase
        .from('exercise_logs')
        .select('id, created_at')
        .eq('user_id', userId)
        .gte('created_at', thirtyDaysAgo.toISOString()),
      
      supabase
        .from('recovery_session_logs')
        .select('id, created_at')
        .eq('user_id', userId)
        .gte('created_at', thirtyDaysAgo.toISOString())
    ]);

    // Calculate score based on activity
    const nutritionScore = (nutritionLogs?.length || 0) * 5;
    const hydrationScore = (hydrationLogs?.length || 0) * 3;
    const supplementScore = (supplementLogs?.length || 0) * 2;
    const exerciseScore = (exerciseLogs?.length || 0) * 10;
    const recoveryScore = (recoveryLogs?.length || 0) * 8;
    
    const totalScore = nutritionScore + hydrationScore + supplementScore + exerciseScore + recoveryScore;

    // Calculate best streak from all tracking types
    const bestStreak = Math.max(
      profile?.current_nutrition_streak || 0,
      profile?.current_hydration_streak || 0,
      profile?.current_supplement_streak || 0
    );

    // Calculate progress percentage based on activity in last 7 days vs previous 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const [recentActivity, previousActivity] = await Promise.all([
      supabase
        .from('nutrition_logs')
        .select('id')
        .eq('user_id', userId)
        .gte('created_at', sevenDaysAgo.toISOString())
        .then(({ data }) => data?.length || 0),
      
      supabase
        .from('nutrition_logs')
        .select('id')
        .eq('user_id', userId)
        .gte('created_at', fourteenDaysAgo.toISOString())
        .lt('created_at', sevenDaysAgo.toISOString())
        .then(({ data }) => data?.length || 0)
    ]);

    const progressPct = previousActivity > 0 
      ? Math.round((recentActivity / previousActivity) * 100)
      : recentActivity > 0 ? 100 : 0;

    return {
      score: totalScore,
      streak: bestStreak,
      progressPct: Math.min(progressPct, 999) // Cap at 999%
    };
  } catch (error) {
    console.error('Error fetching user stats:', error);
    return {
      score: 0,
      streak: 0,
      progressPct: 0
    };
  }
}
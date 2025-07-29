import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface LogWorkoutXPRequest {
  routine_id: string;
  intensity_level: 'low' | 'medium' | 'high';
  duration_minutes?: number;
  difficulty_multiplier?: number;
}

interface XPCalculation {
  base_xp: number;
  bonus_xp: number;
  total_xp: number;
  reason: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: corsHeaders }
      );
    }

    // Get user from JWT token
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: corsHeaders }
      );
    }

    const { routine_id, intensity_level, duration_minutes = 45, difficulty_multiplier = 1.0 }: LogWorkoutXPRequest = await req.json();

    if (!routine_id || !intensity_level) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: routine_id, intensity_level' }),
        { status: 400, headers: corsHeaders }
      );
    }

    console.log(`Processing workout XP for user ${user.id}, routine ${routine_id}, intensity ${intensity_level}`);

    // Check daily XP limit to prevent spamming
    const today = new Date().toISOString().split('T')[0];
    const { data: todayXP, error: dailyXPError } = await supabaseClient
      .from('workout_xp_logs')
      .select('total_xp')
      .eq('user_id', user.id)
      .gte('created_at', `${today}T00:00:00.000Z`)
      .lt('created_at', `${today}T23:59:59.999Z`);

    if (dailyXPError) {
      console.error('Error checking daily XP:', dailyXPError);
      return new Response(
        JSON.stringify({ error: 'Failed to check daily XP limit' }),
        { status: 500, headers: corsHeaders }
      );
    }

    const dailyXPTotal = todayXP?.reduce((sum, log) => sum + log.total_xp, 0) || 0;
    const DAILY_XP_LIMIT = 500; // Prevent XP farming

    if (dailyXPTotal >= DAILY_XP_LIMIT) {
      return new Response(
        JSON.stringify({ 
          error: 'Daily XP limit reached',
          daily_xp_earned: dailyXPTotal,
          daily_xp_limit: DAILY_XP_LIMIT
        }),
        { status: 429, headers: corsHeaders }
      );
    }

    // Calculate XP based on intensity, duration, and difficulty
    const xpCalculation = calculateWorkoutXP(intensity_level, duration_minutes, difficulty_multiplier);

    // Ensure we don't exceed daily limit
    const remainingDailyXP = DAILY_XP_LIMIT - dailyXPTotal;
    if (xpCalculation.total_xp > remainingDailyXP) {
      xpCalculation.total_xp = remainingDailyXP;
      xpCalculation.bonus_xp = Math.max(0, remainingDailyXP - xpCalculation.base_xp);
      xpCalculation.reason += ' (capped at daily limit)';
    }

    // Log the XP using the existing database function
    const { error: xpError } = await supabaseClient.rpc('add_workout_xp', {
      p_user_id: user.id,
      p_routine_id: routine_id,
      p_score: 100, // Performance score (can be customized later)
      p_reason: xpCalculation.reason
    });

    if (xpError) {
      console.error('Error logging workout XP:', xpError);
      return new Response(
        JSON.stringify({ error: 'Failed to log workout XP' }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Get updated user level information
    const { data: userLevel, error: levelError } = await supabaseClient
      .from('user_levels')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (levelError) {
      console.error('Error fetching user level:', levelError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch updated level' }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Check if user leveled up (comparing with previous level)
    const { data: previousLogs, error: prevLogError } = await supabaseClient
      .from('workout_xp_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(2);

    let leveledUp = false;
    let previousLevel = 1;

    if (!prevLogError && previousLogs && previousLogs.length > 1) {
      // Calculate what the level was before this XP addition
      const previousTotalXP = userLevel.current_xp + userLevel.xp_to_next_level - xpCalculation.total_xp;
      previousLevel = Math.floor(previousTotalXP / 100) + 1;
      leveledUp = userLevel.level > previousLevel;
    }

    console.log(`Workout XP logged successfully: ${xpCalculation.total_xp} XP, Level: ${userLevel.level}, Leveled up: ${leveledUp}`);

    return new Response(
      JSON.stringify({
        success: true,
        xp_earned: xpCalculation.total_xp,
        base_xp: xpCalculation.base_xp,
        bonus_xp: xpCalculation.bonus_xp,
        reason: xpCalculation.reason,
        current_level: userLevel.level,
        current_xp: userLevel.current_xp,
        xp_to_next_level: userLevel.xp_to_next_level,
        leveled_up: leveledUp,
        previous_level: previousLevel,
        daily_xp_earned: dailyXPTotal + xpCalculation.total_xp,
        daily_xp_limit: DAILY_XP_LIMIT
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Unexpected error in log-workout-xp:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: corsHeaders }
    );
  }
});

function calculateWorkoutXP(
  intensity: 'low' | 'medium' | 'high',
  duration: number,
  difficultyMultiplier: number
): XPCalculation {
  // Base XP calculation
  let baseXP = 20; // Base XP for completing any workout
  
  // Intensity multiplier
  const intensityMultipliers = {
    low: 1.0,
    medium: 1.5,
    high: 2.0
  };
  
  // Duration bonus (1 XP per minute, capped at 60 minutes)
  const durationBonus = Math.min(duration, 60);
  
  // Calculate total
  const intensityBonus = Math.floor(baseXP * (intensityMultipliers[intensity] - 1));
  const difficultyBonus = Math.floor(baseXP * (difficultyMultiplier - 1));
  
  const totalBaseXP = baseXP;
  const totalBonusXP = intensityBonus + durationBonus + difficultyBonus;
  const totalXP = totalBaseXP + totalBonusXP;
  
  const reason = `Workout completed - ${intensity} intensity, ${duration}min duration`;
  
  return {
    base_xp: totalBaseXP,
    bonus_xp: totalBonusXP,
    total_xp: totalXP,
    reason
  };
}
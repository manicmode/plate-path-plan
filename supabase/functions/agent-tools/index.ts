import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

// Allowed tools (read-only operations only)
const ALLOWED_TOOLS = [
  'get_week_summary',
  'get_trends', 
  'get_last_meal',
  'get_last_workout',
  'get_goals'
];

interface ToolRequest {
  tool: string;
  args: Record<string, any>;
}

interface ToolResponse {
  ok: boolean;
  data?: any;
  took_ms?: number;
  code?: string;
  message?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // Get auth token from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ 
          ok: false, 
          code: 'UNAUTHORIZED', 
          message: 'Missing or invalid authorization header' 
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const jwt = authHeader.split(' ')[1];
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ 
          ok: false, 
          code: 'UNAUTHORIZED', 
          message: 'Invalid or expired token' 
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse request body
    const body: ToolRequest = await req.json();
    const { tool, args = {} } = body;

    // Validate tool name
    if (!ALLOWED_TOOLS.includes(tool)) {
      return new Response(
        JSON.stringify({ 
          ok: false, 
          code: 'INVALID_TOOL', 
          message: `Tool '${tool}' is not allowed` 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`[agent-tools] Processing ${tool} for user ${user.id}`);

    // Execute the requested tool
    let result;
    switch (tool) {
      case 'get_week_summary':
        result = await getWeekSummary(supabase, user.id, args);
        break;
      case 'get_trends':
        result = await getTrends(supabase, user.id, args);
        break;
      case 'get_last_meal':
        result = await getLastMeal(supabase, user.id);
        break;
      case 'get_last_workout':
        result = await getLastWorkout(supabase, user.id);
        break;
      case 'get_goals':
        result = await getGoals(supabase, user.id);
        break;
      default:
        throw new Error(`Unhandled tool: ${tool}`);
    }

    const tookMs = Date.now() - startTime;

    return new Response(
      JSON.stringify({ 
        ok: true, 
        data: result,
        took_ms: tookMs
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('[agent-tools] Error:', error);
    const tookMs = Date.now() - startTime;
    
    return new Response(
      JSON.stringify({ 
        ok: false, 
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        took_ms: tookMs
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// Tool implementations

async function getWeekSummary(supabase: any, userId: string, args: any) {
  const { domain = 'nutrition', days = 7 } = args;
  
  // Validate domain
  if (!['nutrition', 'exercise', 'recovery'].includes(domain)) {
    throw new Error('Invalid domain. Must be nutrition, exercise, or recovery');
  }

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  switch (domain) {
    case 'nutrition':
      return await getNutritionSummary(supabase, userId, startDate, days);
    case 'exercise':
      return await getExerciseSummary(supabase, userId, startDate, days);
    case 'recovery':
      return await getRecoverySummary(supabase, userId, startDate, days);
    default:
      throw new Error('Invalid domain');
  }
}

async function getNutritionSummary(supabase: any, userId: string, startDate: Date, days: number) {
  // Get nutrition logs for the period
  const { data: nutritionLogs, error: nutritionError } = await supabase
    .from('nutrition_logs')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: false });

  if (nutritionError) throw nutritionError;

  // Get hydration logs
  const { data: hydrationLogs, error: hydrationError } = await supabase
    .from('hydration_logs')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', startDate.toISOString());

  if (hydrationError) throw hydrationError;

  // Calculate totals
  const totalCalories = nutritionLogs?.reduce((sum: number, log: any) => sum + (log.calories || 0), 0) || 0;
  const totalProtein = nutritionLogs?.reduce((sum: number, log: any) => sum + (log.protein || 0), 0) || 0;
  const totalCarbs = nutritionLogs?.reduce((sum: number, log: any) => sum + (log.carbs || 0), 0) || 0;
  const totalFat = nutritionLogs?.reduce((sum: number, log: any) => sum + (log.fat || 0), 0) || 0;
  const totalHydration = hydrationLogs?.reduce((sum: number, log: any) => sum + (log.volume || 0), 0) || 0;
  
  const loggedDays = new Set(nutritionLogs?.map((log: any) => new Date(log.created_at).toDateString()) || []).size;

  return {
    period_days: days,
    logged_days: loggedDays,
    total_calories: Math.round(totalCalories),
    avg_calories_per_day: loggedDays > 0 ? Math.round(totalCalories / loggedDays) : 0,
    total_protein: Math.round(totalProtein),
    total_carbs: Math.round(totalCarbs),
    total_fat: Math.round(totalFat),
    total_hydration_ml: Math.round(totalHydration),
    avg_hydration_per_day: loggedDays > 0 ? Math.round(totalHydration / loggedDays) : 0,
    meal_count: nutritionLogs?.length || 0
  };
}

async function getExerciseSummary(supabase: any, userId: string, startDate: Date, days: number) {
  const { data: exerciseLogs, error } = await supabase
    .from('exercise_logs')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: false });

  if (error) throw error;

  const totalDuration = exerciseLogs?.reduce((sum: number, log: any) => sum + (log.duration_minutes || 0), 0) || 0;
  const totalCalories = exerciseLogs?.reduce((sum: number, log: any) => sum + (log.calories_burned || 0), 0) || 0;
  const workoutDays = new Set(exerciseLogs?.map((log: any) => new Date(log.created_at).toDateString()) || []).size;

  return {
    period_days: days,
    workout_count: exerciseLogs?.length || 0,
    workout_days: workoutDays,
    total_duration_minutes: totalDuration,
    avg_duration_per_workout: exerciseLogs?.length > 0 ? Math.round(totalDuration / exerciseLogs.length) : 0,
    total_calories_burned: Math.round(totalCalories),
    avg_calories_per_workout: exerciseLogs?.length > 0 ? Math.round(totalCalories / exerciseLogs.length) : 0
  };
}

async function getRecoverySummary(supabase: any, userId: string, startDate: Date, days: number) {
  // For now, return basic structure - can be enhanced when recovery tables are available
  return {
    period_days: days,
    sleep_sessions: 0,
    avg_sleep_hours: 0,
    meditation_sessions: 0,
    total_meditation_minutes: 0,
    recovery_score: null
  };
}

async function getTrends(supabase: any, userId: string, args: any) {
  const { metric, days = 30 } = args;
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  switch (metric) {
    case 'calories_in':
      return await getCaloriesTrend(supabase, userId, startDate, days);
    case 'hydration_ml':
      return await getHydrationTrend(supabase, userId, startDate, days);
    case 'weight':
      return await getWeightTrend(supabase, userId, startDate, days);
    case 'exercise_calories':
      return await getExerciseCaloriesTrend(supabase, userId, startDate, days);
    default:
      throw new Error(`Unsupported metric: ${metric}`);
  }
}

async function getCaloriesTrend(supabase: any, userId: string, startDate: Date, days: number) {
  const { data, error } = await supabase
    .from('nutrition_logs')
    .select('created_at, calories')
    .eq('user_id', userId)
    .gte('created_at', startDate.toISOString())
    .order('created_at');

  if (error) throw error;

  // Group by day
  const dailyTotals: Record<string, number> = {};
  data?.forEach((log: any) => {
    const day = new Date(log.created_at).toDateString();
    dailyTotals[day] = (dailyTotals[day] || 0) + (log.calories || 0);
  });

  const values = Object.values(dailyTotals);
  const avg = values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
  
  let trend = 'flat';
  if (values.length >= 2) {
    const recent = values.slice(-7).reduce((sum, val) => sum + val, 0) / Math.min(7, values.length);
    const earlier = values.slice(0, -7).reduce((sum, val) => sum + val, 0) / Math.max(1, values.length - 7);
    if (recent > earlier * 1.1) trend = 'up';
    else if (recent < earlier * 0.9) trend = 'down';
  }

  return {
    metric: 'calories_in',
    period_days: days,
    data_points: values.length,
    average: Math.round(avg),
    trend,
    daily_values: Object.keys(dailyTotals).map(day => ({
      date: day,
      value: Math.round(dailyTotals[day])
    })).slice(-14) // Return last 14 days for brevity
  };
}

async function getHydrationTrend(supabase: any, userId: string, startDate: Date, days: number) {
  const { data, error } = await supabase
    .from('hydration_logs')
    .select('created_at, volume')
    .eq('user_id', userId)
    .gte('created_at', startDate.toISOString())
    .order('created_at');

  if (error) throw error;

  // Group by day
  const dailyTotals: Record<string, number> = {};
  data?.forEach((log: any) => {
    const day = new Date(log.created_at).toDateString();
    dailyTotals[day] = (dailyTotals[day] || 0) + (log.volume || 0);
  });

  const values = Object.values(dailyTotals);
  const avg = values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;

  return {
    metric: 'hydration_ml',
    period_days: days,
    data_points: values.length,
    average: Math.round(avg),
    trend: 'flat', // Simplified for now
    daily_values: Object.keys(dailyTotals).map(day => ({
      date: day,
      value: Math.round(dailyTotals[day])
    })).slice(-14)
  };
}

async function getWeightTrend(supabase: any, userId: string, startDate: Date, days: number) {
  // Simplified - would need body scan or weight tracking table
  return {
    metric: 'weight',
    period_days: days,
    data_points: 0,
    average: null,
    trend: 'no_data',
    message: 'Weight tracking not yet available'
  };
}

async function getExerciseCaloriesTrend(supabase: any, userId: string, startDate: Date, days: number) {
  const { data, error } = await supabase
    .from('exercise_logs')
    .select('created_at, calories_burned')
    .eq('user_id', userId)
    .gte('created_at', startDate.toISOString())
    .order('created_at');

  if (error) throw error;

  const values = data?.map((log: any) => log.calories_burned || 0) || [];
  const avg = values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;

  return {
    metric: 'exercise_calories',
    period_days: days,
    data_points: values.length,
    average: Math.round(avg),
    trend: 'flat',
    recent_workouts: values.slice(-5)
  };
}

async function getLastMeal(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from('nutrition_logs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) throw error;

  if (!data?.length) {
    return { message: 'No meals logged yet' };
  }

  const lastMeal = data[0];
  return {
    timestamp: lastMeal.created_at,
    food_name: lastMeal.food_name,
    calories: lastMeal.calories || 0,
    protein: lastMeal.protein || 0,
    carbs: lastMeal.carbs || 0,
    fat: lastMeal.fat || 0,
    hours_ago: Math.round((Date.now() - new Date(lastMeal.created_at).getTime()) / (1000 * 60 * 60))
  };
}

async function getLastWorkout(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from('exercise_logs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) throw error;

  if (!data?.length) {
    return { message: 'No workouts logged yet' };
  }

  const lastWorkout = data[0];
  return {
    timestamp: lastWorkout.created_at,
    activity_type: lastWorkout.activity_type,
    duration_minutes: lastWorkout.duration_minutes || 0,
    intensity: lastWorkout.intensity_level || 'moderate',
    calories_burned: lastWorkout.calories_burned || 0,
    hours_ago: Math.round((Date.now() - new Date(lastWorkout.created_at).getTime()) / (1000 * 60 * 60))
  };
}

async function getGoals(supabase: any, userId: string) {
  // Get user profile for targets
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('target_calories, target_protein, target_carbs, target_fat, hydration_target_ml')
    .eq('user_id', userId)
    .single();

  if (profileError) {
    console.log('No profile found, returning default goals');
  }

  // Get today's nutrition targets
  const today = new Date().toISOString().split('T')[0];
  const { data: dailyTargets, error: targetsError } = await supabase
    .from('daily_nutrition_targets')
    .select('*')
    .eq('user_id', userId)
    .eq('date', today)
    .single();

  return {
    calories: dailyTargets?.calories || profile?.target_calories || 2000,
    protein: dailyTargets?.protein || profile?.target_protein || 150,
    carbs: dailyTargets?.carbs || profile?.target_carbs || 200,
    fat: dailyTargets?.fat || profile?.target_fat || 67,
    hydration_ml: profile?.hydration_target_ml || 2000,
    source: dailyTargets ? 'daily_target' : profile ? 'profile' : 'default'
  };
}
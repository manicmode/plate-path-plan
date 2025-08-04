import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WorkoutTrend {
  total_weeks_analyzed: number;
  avg_weekly_workouts: number;
  overall_completion_rate: number;
  overall_skip_rate: number;
  trend_direction: string;
  consistency_rating: string;
  top_exercise_categories: string[];
}

interface ForecastData {
  forecast_week: number;
  predicted_workouts: number;
  predicted_completion_rate: number;
  predicted_skipped_sets: number;
  confidence_score: number;
  trend_direction: string;
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

    console.log(`Generating workout forecast for user ${user.id}`);

    // Get workout trends summary
    const { data: trendsData, error: trendsError } = await supabaseClient
      .rpc('get_workout_trends_summary', { target_user_id: user.id });

    if (trendsError) {
      console.error('Error fetching trends:', trendsError);
      return new Response(
        JSON.stringify({ error: 'Failed to analyze workout trends' }),
        { status: 500, headers: corsHeaders }
      );
    }

    const trends: WorkoutTrend = trendsData[0] || {
      total_weeks_analyzed: 0,
      avg_weekly_workouts: 3,
      overall_completion_rate: 75,
      overall_skip_rate: 15,
      trend_direction: 'stable',
      consistency_rating: 'moderate',
      top_exercise_categories: ['general']
    };

    // Get 4-week forecast predictions
    const { data: forecastData, error: forecastError } = await supabaseClient
      .rpc('calculate_workout_forecast', { target_user_id: user.id });

    if (forecastError) {
      console.error('Error generating forecast:', forecastError);
      return new Response(
        JSON.stringify({ error: 'Failed to generate forecast' }),
        { status: 500, headers: corsHeaders }
      );
    }

    const forecast: ForecastData[] = forecastData || [];

    // Generate AI summary text
    const forecastSummary = generateForecastSummary(trends, forecast);

    console.log(`Workout forecast generated successfully`);

    return new Response(
      JSON.stringify({
        success: true,
        trends,
        forecast,
        summary: forecastSummary
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Unexpected error in ai-workout-forecast:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: corsHeaders }
    );
  }
});

function generateForecastSummary(trends: WorkoutTrend, forecast: ForecastData[]): {
  text: string;
  emoji: string;
  confidence: string;
  highlights: string[];
} {
  const avgForecastWorkouts = forecast.reduce((sum, week) => sum + week.predicted_workouts, 0) / 4;
  const currentWorkouts = trends.avg_weekly_workouts;
  const workoutChange = ((avgForecastWorkouts - currentWorkouts) / currentWorkouts) * 100;
  
  const avgForecastCompletion = forecast.reduce((sum, week) => sum + week.predicted_completion_rate, 0) / 4;
  const completionChange = avgForecastCompletion - trends.overall_completion_rate;
  
  const avgConfidence = forecast.reduce((sum, week) => sum + week.confidence_score, 0) / 4;
  
  let emoji = '📊';
  let mainText = '';
  const highlights: string[] = [];

  // Determine main trend and emoji
  if (trends.trend_direction === 'improving' && workoutChange > 5) {
    emoji = '🚀📈';
    mainText = `You're on a fantastic trajectory! Expect ${Math.abs(workoutChange).toFixed(0)}% more consistency`;
  } else if (trends.trend_direction === 'improving') {
    emoji = '📈💪';
    mainText = `Steady progress ahead! You're building momentum with improved consistency`;
  } else if (trends.trend_direction === 'declining') {
    emoji = '⚡🎯';
    mainText = `Time to refocus! Small adjustments can get you back on track`;
  } else {
    emoji = '🎯✨';
    mainText = `Maintaining steady progress with ${avgForecastWorkouts.toFixed(1)} workouts per week`;
  }

  // Add completion rate insight
  if (completionChange > 5) {
    highlights.push(`+${completionChange.toFixed(0)}% completion rate improvement`);
  } else if (completionChange < -5) {
    highlights.push(`Focus needed: completion rate trending down`);
  }

  // Add workout frequency insight
  if (workoutChange > 10) {
    highlights.push(`+${Math.round(avgForecastWorkouts - currentWorkouts)} more workouts monthly`);
  } else if (workoutChange < -10) {
    highlights.push(`Risk of ${Math.abs(Math.round(avgForecastWorkouts - currentWorkouts))} fewer workouts`);
  }

  // Add consistency insight
  if (trends.consistency_rating === 'excellent') {
    highlights.push(`Excellent consistency maintained`);
  } else if (trends.consistency_rating === 'good') {
    highlights.push(`Good rhythm established`);
  }

  // Add focus area insight
  if (trends.top_exercise_categories.length > 0) {
    const topCategory = trends.top_exercise_categories[0];
    highlights.push(`Strong ${topCategory} focus continuing`);
  }

  // Generate full text
  const fullText = `${mainText}${highlights.length > 0 ? ` with ${highlights.slice(0, 2).join(' and ')}.` : '.'}`;

  // Determine confidence level
  let confidenceLevel = 'moderate';
  if (avgConfidence > 80) confidenceLevel = 'high';
  else if (avgConfidence < 60) confidenceLevel = 'low';

  return {
    text: fullText,
    emoji,
    confidence: confidenceLevel,
    highlights
  };
}
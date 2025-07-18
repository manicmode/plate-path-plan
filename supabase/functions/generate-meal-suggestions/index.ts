import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface SuggestionRequest {
  user_id?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get user from auth header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verify the user token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const sixDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    console.log(`🎯 Generating meal suggestions for user: ${userId}`);

    // Fetch meal scores from the last 6 days (to compare current 3 days vs previous 3 days)
    const { data: allMealScores, error: scoresError } = await supabase
      .from('meal_scores')
      .select('score, created_at')
      .eq('user_id', userId)
      .gte('created_at', sixDaysAgo + 'T00:00:00.000Z')
      .order('created_at', { ascending: true });

    if (scoresError) {
      console.error('Error fetching meal scores:', scoresError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch meal scores' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!allMealScores || allMealScores.length === 0) {
      console.log('📊 No meal scores found for analysis');
      return new Response(
        JSON.stringify({ message: 'No meal scores found for analysis' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Split scores into current 3 days and previous 3 days
    const currentPeriodScores = allMealScores.filter(ms => 
      ms.created_at >= threeDaysAgo + 'T00:00:00.000Z'
    );
    const previousPeriodScores = allMealScores.filter(ms => 
      ms.created_at < threeDaysAgo + 'T00:00:00.000Z'
    );

    // Need at least 3 scores in current period
    if (currentPeriodScores.length < 3) {
      console.log(`📊 Need at least 3 scores in current period, found ${currentPeriodScores.length}`);
      return new Response(
        JSON.stringify({ message: 'Need at least 3 meal scores in the last 3 days for analysis' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📈 Found ${currentPeriodScores.length} current scores, ${previousPeriodScores.length} previous scores`);

    // Calculate current 3-day average
    const currentScores = currentPeriodScores.map(ms => Number(ms.score));
    const currentAverage = currentScores.reduce((sum, score) => sum + score, 0) / currentScores.length;
    
    console.log(`📊 Current 3-day average: ${currentAverage.toFixed(1)}`);

    let suggestionType: 'praise' | 'warning' | 'tip';
    let message: string;
    let scoreTriggered = currentAverage;

    // Check if we already have a suggestion of any type for today
    const { data: existingSuggestion } = await supabase
      .from('meal_suggestions')
      .select('id, type')
      .eq('user_id', userId)
      .eq('date', today);

    // Determine suggestion type and message
    if (currentAverage > 85) {
      suggestionType = 'praise';
      message = '🔥 Amazing! Your meals have been top-notch the last 3 days.';
    } else if (currentAverage < 60) {
      suggestionType = 'warning';
      message = '⚠️ Heads up! You\'ve had several low-quality meals recently. Need help bouncing back?';
    } else {
      // Check for significant improvement (compare current vs previous 3-day average)
      if (previousPeriodScores.length >= 3) {
        const previousScores = previousPeriodScores.map(ms => Number(ms.score));
        const previousAverage = previousScores.reduce((sum, score) => sum + score, 0) / previousScores.length;
        const improvement = currentAverage - previousAverage;
        
        console.log(`📈 Previous 3-day average: ${previousAverage.toFixed(1)}, improvement: ${improvement.toFixed(1)}`);
        
        if (improvement >= 20) {
          suggestionType = 'tip';
          message = '🚀 Wow! Your meal quality is improving fast. Keep this momentum going!';
          scoreTriggered = improvement;
        } else {
          // No significant change, no suggestion needed
          console.log('📊 No significant change detected, no suggestion needed');
          return new Response(
            JSON.stringify({ message: 'No new suggestion needed' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } else {
        // Not enough previous data for comparison, no suggestion needed
        console.log('📊 Not enough previous data for comparison');
        return new Response(
          JSON.stringify({ message: 'No new suggestion needed' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Check if we already have a suggestion of this type for today
    if (existingSuggestion && existingSuggestion.some(s => s.type === suggestionType)) {
      console.log(`⚠️ ${suggestionType} suggestion already exists for today`);
      return new Response(
        JSON.stringify({ message: `${suggestionType} suggestion already exists for today` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert the suggestion
    const { data: newSuggestion, error: insertError } = await supabase
      .from('meal_suggestions')
      .insert({
        user_id: userId,
        date: today,
        message,
        type: suggestionType,
        score_triggered: scoreTriggered
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting suggestion:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to create suggestion' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`✅ Created ${suggestionType} suggestion:`, message);

    return new Response(
      JSON.stringify({
        success: true,
        suggestion: newSuggestion,
        analysis: {
          meal_count: currentPeriodScores.length,
          average_score: Math.round(currentAverage * 10) / 10,
          days_analyzed: 3
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-meal-suggestions:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
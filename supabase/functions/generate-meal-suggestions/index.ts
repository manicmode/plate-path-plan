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

    console.log(`🎯 Generating meal suggestions for user: ${userId}`);

    // Check if suggestion already exists for today
    const { data: existingSuggestion } = await supabase
      .from('meal_suggestions')
      .select('id')
      .eq('user_id', userId)
      .eq('date', today)
      .single();

    if (existingSuggestion) {
      console.log('⚠️ Suggestion already exists for today');
      return new Response(
        JSON.stringify({ message: 'Suggestion already exists for today', suggestion_id: existingSuggestion.id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch meal scores from the last 3 days
    const { data: mealScores, error: scoresError } = await supabase
      .from('meal_scores')
      .select('score, created_at')
      .eq('user_id', userId)
      .gte('created_at', threeDaysAgo + 'T00:00:00.000Z')
      .order('created_at', { ascending: true });

    if (scoresError) {
      console.error('Error fetching meal scores:', scoresError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch meal scores' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!mealScores || mealScores.length === 0) {
      console.log('📊 No meal scores found for the last 3 days');
      return new Response(
        JSON.stringify({ message: 'No meal scores found for analysis' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📈 Found ${mealScores.length} meal scores for analysis`);

    // Calculate average score
    const scores = mealScores.map(ms => Number(ms.score));
    const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    
    console.log(`📊 Average score over last 3 days: ${averageScore.toFixed(1)}`);

    let suggestionType: 'praise' | 'warning' | 'tip';
    let message: string;
    let scoreTriggered = averageScore;

    // Determine suggestion type and message
    if (averageScore >= 85) {
      suggestionType = 'praise';
      message = '🌟 Outstanding work! Your meals have been top-notch lately. Keep riding that healthy wave!';
    } else if (averageScore < 60) {
      suggestionType = 'warning';
      message = '💪 Let\'s turn things around! Small changes in your meal choices can make a big difference. You\'ve got this!';
    } else {
      // Check for improvement (compare first day vs last day)
      if (scores.length >= 2) {
        const firstDayScore = scores[0];
        const lastDayScore = scores[scores.length - 1];
        const improvement = lastDayScore - firstDayScore;
        
        if (improvement >= 20) {
          suggestionType = 'tip';
          message = `🚀 Incredible improvement! You've boosted your meal quality by ${improvement.toFixed(0)} points. This momentum is amazing!`;
          scoreTriggered = improvement;
        } else {
          // Default motivational tip
          suggestionType = 'tip';
          message = '🎯 You\'re doing well! Consider adding more colorful vegetables or lean proteins to boost your meal scores even higher.';
        }
      } else {
        suggestionType = 'tip';
        message = '🎯 You\'re doing well! Consider adding more colorful vegetables or lean proteins to boost your meal scores even higher.';
      }
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
          meal_count: mealScores.length,
          average_score: Math.round(averageScore * 10) / 10,
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
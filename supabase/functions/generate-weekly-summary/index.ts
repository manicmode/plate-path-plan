import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('❌ Error getting user:', userError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`🔄 Generating weekly summary for user: ${user.id}`);

    // Get today's date and calculate the start of this week (last Sunday)
    const today = new Date();
    const currentDayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const thisWeekStart = new Date(today);
    thisWeekStart.setDate(today.getDate() - currentDayOfWeek);
    thisWeekStart.setHours(0, 0, 0, 0);

    // Calculate the start of the previous week
    const previousWeekStart = new Date(thisWeekStart);
    previousWeekStart.setDate(thisWeekStart.getDate() - 7);

    const weekStartStr = thisWeekStart.toISOString().split('T')[0];
    const previousWeekStartStr = previousWeekStart.toISOString().split('T')[0];

    console.log(`📅 This week start: ${weekStartStr}`);
    console.log(`📅 Previous week start: ${previousWeekStartStr}`);

    // Check if summary already exists for this week
    const { data: existingSummary } = await supabase
      .from('weekly_summaries')
      .select('id, message')
      .eq('user_id', user.id)
      .eq('week_start', weekStartStr)
      .maybeSingle();

    if (existingSummary) {
      console.log(`⏭️ Summary already exists for week ${weekStartStr}`);
      return new Response(JSON.stringify({
        message: 'Weekly summary already exists',
        existing_summary: existingSummary.message
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get this week's meal scores (from last Sunday to today)
    const { data: thisWeekScores, error: thisWeekError } = await supabase
      .from('meal_scores')
      .select('score, created_at')
      .eq('user_id', user.id)
      .gte('created_at', thisWeekStart.toISOString())
      .lte('created_at', today.toISOString());

    if (thisWeekError) {
      console.error(`❌ Error fetching this week's scores:`, thisWeekError);
      return new Response(JSON.stringify({ error: thisWeekError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get previous week's meal scores
    const { data: previousWeekScores, error: previousWeekError } = await supabase
      .from('meal_scores')
      .select('score, created_at')
      .eq('user_id', user.id)
      .gte('created_at', previousWeekStart.toISOString())
      .lt('created_at', thisWeekStart.toISOString());

    if (previousWeekError) {
      console.error(`❌ Error fetching previous week's scores:`, previousWeekError);
      return new Response(JSON.stringify({ error: previousWeekError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Calculate this week's stats
    const mealsLoggedCount = thisWeekScores?.length || 0;
    const averageScoreThisWeek = mealsLoggedCount > 0 
      ? thisWeekScores!.reduce((sum, score) => sum + Number(score.score), 0) / mealsLoggedCount
      : 0;

    // Calculate days with meals this week
    const uniqueDaysThisWeek = new Set(
      (thisWeekScores || []).map(score => score.created_at.split('T')[0])
    );
    const daysWithMeals = uniqueDaysThisWeek.size;

    // Calculate previous week's average
    const previousWeekMealsCount = previousWeekScores?.length || 0;
    const averageScoreLastWeek = previousWeekMealsCount > 0
      ? previousWeekScores!.reduce((sum, score) => sum + Number(score.score), 0) / previousWeekMealsCount
      : null;

    console.log(`📊 Stats - This week: ${averageScoreThisWeek.toFixed(1)} avg, ${mealsLoggedCount} meals, ${daysWithMeals} days`);
    console.log(`📊 Stats - Last week: ${averageScoreLastWeek?.toFixed(1) || 'N/A'} avg, ${previousWeekMealsCount} meals`);

    // Generate personalized message based on performance
    let message = '';

    if (mealsLoggedCount === 0) {
      message = "Hey, we missed you this week! Let's restart strong tomorrow 💪";
    } else if (daysWithMeals <= 2) {
      message = "Hey, we missed you this week! Let's restart strong tomorrow 💪";
    } else if (daysWithMeals >= 6) {
      message = "👏 You logged meals almost every day this week!";
    } else if (averageScoreLastWeek && averageScoreThisWeek > averageScoreLastWeek) {
      const improvement = ((averageScoreThisWeek - averageScoreLastWeek) / averageScoreLastWeek * 100).toFixed(1);
      message = `🔥 Your average meal score improved by ${improvement}%! Keep it up!`;
    } else if (averageScoreLastWeek && averageScoreThisWeek < averageScoreLastWeek) {
      const decline = ((averageScoreLastWeek - averageScoreThisWeek) / averageScoreLastWeek * 100).toFixed(1);
      message = `😕 Your average dropped by ${decline}% — want help planning next week?`;
    } else if (averageScoreThisWeek >= 80) {
      message = `⭐ Solid week with an average score of ${averageScoreThisWeek.toFixed(1)}!`;
    } else if (averageScoreThisWeek >= 60) {
      message = `💪 Decent week! You're averaging ${averageScoreThisWeek.toFixed(1)} — room to grow!`;
    } else {
      message = `🎯 This week averaged ${averageScoreThisWeek.toFixed(1)}. Let's aim higher next week!`;
    }

    // Insert the weekly summary
    const { data: insertedSummary, error: insertError } = await supabase
      .from('weekly_summaries')
      .insert({
        user_id: user.id,
        week_start: weekStartStr,
        average_score: Math.round(averageScoreThisWeek * 100) / 100,
        previous_week_average: averageScoreLastWeek ? Math.round(averageScoreLastWeek * 100) / 100 : null,
        meals_logged_count: mealsLoggedCount,
        days_with_meals: daysWithMeals,
        message
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Error inserting weekly summary:', insertError);
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`✅ Generated weekly summary: ${message}`);

    return new Response(JSON.stringify({
      message: 'Weekly summary generated successfully',
      summary: {
        week_start: weekStartStr,
        average_score_this_week: Math.round(averageScoreThisWeek * 100) / 100,
        average_score_last_week: averageScoreLastWeek ? Math.round(averageScoreLastWeek * 100) / 100 : null,
        meals_logged_count: mealsLoggedCount,
        days_with_meals: daysWithMeals,
        generated_message: message
      },
      inserted_summary: insertedSummary
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
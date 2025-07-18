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

    console.log(`🔄 Generating monthly summary for user: ${user.id}`);

    // Get today's date and calculate the current month start
    const today = new Date();
    const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    
    // Calculate the previous month start
    const previousMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    
    // Calculate the end of previous month
    const previousMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
    
    const currentMonthStartStr = currentMonthStart.toISOString().split('T')[0];
    const previousMonthStartStr = previousMonthStart.toISOString().split('T')[0];

    console.log(`📅 Current month start: ${currentMonthStartStr}`);
    console.log(`📅 Previous month start: ${previousMonthStartStr}`);

    // Check if summary already exists for this month
    const { data: existingSummary } = await supabase
      .from('monthly_summaries')
      .select('id, message')
      .eq('user_id', user.id)
      .eq('month_start', currentMonthStartStr)
      .maybeSingle();

    if (existingSummary) {
      console.log(`⏭️ Summary already exists for month ${currentMonthStartStr}`);
      return new Response(JSON.stringify({
        message: 'Monthly summary already exists',
        existing_summary: existingSummary.message
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get this month's meal scores (from first day of month to today)
    const { data: currentMonthScores, error: currentMonthError } = await supabase
      .from('meal_scores')
      .select('score, created_at')
      .eq('user_id', user.id)
      .gte('created_at', currentMonthStart.toISOString())
      .lte('created_at', today.toISOString());

    if (currentMonthError) {
      console.error(`❌ Error fetching current month's scores:`, currentMonthError);
      return new Response(JSON.stringify({ error: currentMonthError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get previous month's meal scores
    const { data: previousMonthScores, error: previousMonthError } = await supabase
      .from('meal_scores')
      .select('score, created_at')
      .eq('user_id', user.id)
      .gte('created_at', previousMonthStart.toISOString())
      .lte('created_at', previousMonthEnd.toISOString());

    if (previousMonthError) {
      console.error(`❌ Error fetching previous month's scores:`, previousMonthError);
      return new Response(JSON.stringify({ error: previousMonthError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Calculate current month's stats
    const mealsLoggedCount = currentMonthScores?.length || 0;
    const averageScoreCurrentMonth = mealsLoggedCount > 0 
      ? currentMonthScores!.reduce((sum, score) => sum + Number(score.score), 0) / mealsLoggedCount
      : 0;

    // Calculate days with meals this month
    const uniqueDaysCurrentMonth = new Set(
      (currentMonthScores || []).map(score => score.created_at.split('T')[0])
    );
    const daysWithMeals = uniqueDaysCurrentMonth.size;

    // Calculate previous month's average
    const previousMonthMealsCount = previousMonthScores?.length || 0;
    const averageScoreLastMonth = previousMonthMealsCount > 0
      ? previousMonthScores!.reduce((sum, score) => sum + Number(score.score), 0) / previousMonthMealsCount
      : null;

    console.log(`📊 Stats - Current month: ${averageScoreCurrentMonth.toFixed(1)} avg, ${mealsLoggedCount} meals, ${daysWithMeals} days`);
    console.log(`📊 Stats - Previous month: ${averageScoreLastMonth?.toFixed(1) || 'N/A'} avg, ${previousMonthMealsCount} meals`);

    // Calculate days in current month so far
    const daysInMonth = today.getDate();

    // Generate personalized message based on performance
    let message = '';

    if (mealsLoggedCount === 0) {
      message = "Time for a fresh start this month! Let's build some healthy habits 🌱";
    } else if (daysWithMeals <= 3) {
      message = "🔄 Let's get back on track! Small steps lead to big changes.";
    } else if (daysWithMeals >= Math.floor(daysInMonth * 0.8)) {
      message = `🎉 Outstanding consistency! You logged meals ${daysWithMeals} out of ${daysInMonth} days!`;
    } else if (averageScoreLastMonth && averageScoreCurrentMonth > averageScoreLastMonth) {
      const improvement = ((averageScoreCurrentMonth - averageScoreLastMonth) / averageScoreLastMonth * 100).toFixed(1);
      message = `📈 Fantastic progress! Your average score improved by ${improvement}% this month!`;
    } else if (averageScoreLastMonth && averageScoreCurrentMonth < averageScoreLastMonth) {
      const decline = ((averageScoreLastMonth - averageScoreCurrentMonth) / averageScoreLastMonth * 100).toFixed(1);
      message = `📉 Your average dipped by ${decline}% — but every new day is a chance to improve!`;
    } else if (averageScoreCurrentMonth >= 85) {
      message = `🌟 Exceptional month with an average score of ${averageScoreCurrentMonth.toFixed(1)}!`;
    } else if (averageScoreCurrentMonth >= 70) {
      message = `💪 Strong month! You're averaging ${averageScoreCurrentMonth.toFixed(1)} — keep building momentum!`;
    } else if (averageScoreCurrentMonth >= 50) {
      message = `🎯 This month averaged ${averageScoreCurrentMonth.toFixed(1)}. Every meal is a step forward!`;
    } else {
      message = `🌅 Ready for a fresh start? This month's journey begins with your next meal!`;
    }

    // Insert the monthly summary
    const { data: insertedSummary, error: insertError } = await supabase
      .from('monthly_summaries')
      .insert({
        user_id: user.id,
        month_start: currentMonthStartStr,
        average_score: Math.round(averageScoreCurrentMonth * 100) / 100,
        previous_month_average: averageScoreLastMonth ? Math.round(averageScoreLastMonth * 100) / 100 : null,
        meals_logged_count: mealsLoggedCount,
        days_with_meals: daysWithMeals,
        message
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Error inserting monthly summary:', insertError);
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`✅ Generated monthly summary: ${message}`);

    return new Response(JSON.stringify({
      message: 'Monthly summary generated successfully',
      summary: {
        month_start: currentMonthStartStr,
        average_score_current_month: Math.round(averageScoreCurrentMonth * 100) / 100,
        average_score_last_month: averageScoreLastMonth ? Math.round(averageScoreLastMonth * 100) / 100 : null,
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
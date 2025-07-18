import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WeeklySummaryData {
  user_id: string;
  week_start: string;
  average_score: number;
  previous_week_average: number | null;
  meals_logged_count: number;
  days_with_meals: number;
  message: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🔄 Starting weekly summary generation...');

    // Calculate the start of the current week (Sunday)
    const now = new Date();
    const currentDayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const currentWeekStart = new Date(now);
    currentWeekStart.setDate(now.getDate() - currentDayOfWeek);
    currentWeekStart.setHours(0, 0, 0, 0);

    // Calculate the start of the previous week
    const previousWeekStart = new Date(currentWeekStart);
    previousWeekStart.setDate(currentWeekStart.getDate() - 7);

    const weekStartStr = currentWeekStart.toISOString().split('T')[0];
    const previousWeekStartStr = previousWeekStart.toISOString().split('T')[0];

    console.log(`📅 Current week start: ${weekStartStr}`);
    console.log(`📅 Previous week start: ${previousWeekStartStr}`);

    // Get all users who have meal scores
    const { data: users, error: usersError } = await supabase
      .from('meal_scores')
      .select('user_id')
      .gte('created_at', previousWeekStartStr)
      .group('user_id');

    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
      return new Response(JSON.stringify({ error: usersError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!users || users.length === 0) {
      console.log('ℹ️ No users with meal scores found');
      return new Response(JSON.stringify({ message: 'No users with meal scores found' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const uniqueUsers = [...new Set(users.map(u => u.user_id))];
    console.log(`👥 Processing ${uniqueUsers.length} users`);

    const summariesToInsert: WeeklySummaryData[] = [];

    for (const userId of uniqueUsers) {
      console.log(`📊 Processing user: ${userId}`);

      // Check if summary already exists for this week
      const { data: existingSummary } = await supabase
        .from('weekly_summaries')
        .select('id')
        .eq('user_id', userId)
        .eq('week_start', weekStartStr)
        .single();

      if (existingSummary) {
        console.log(`⏭️ Summary already exists for user ${userId} for week ${weekStartStr}`);
        continue;
      }

      // Get current week meal scores
      const { data: currentWeekScores, error: currentError } = await supabase
        .from('meal_scores')
        .select('score, created_at')
        .eq('user_id', userId)
        .gte('created_at', currentWeekStart.toISOString())
        .lt('created_at', new Date(currentWeekStart.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString());

      if (currentError) {
        console.error(`❌ Error fetching current week scores for user ${userId}:`, currentError);
        continue;
      }

      // Get previous week meal scores
      const { data: previousWeekScores, error: previousError } = await supabase
        .from('meal_scores')
        .select('score, created_at')
        .eq('user_id', userId)
        .gte('created_at', previousWeekStart.toISOString())
        .lt('created_at', currentWeekStart.toISOString());

      if (previousError) {
        console.error(`❌ Error fetching previous week scores for user ${userId}:`, previousError);
        continue;
      }

      if (!currentWeekScores || currentWeekScores.length === 0) {
        console.log(`⏭️ No current week scores for user ${userId}`);
        continue;
      }

      // Calculate current week stats
      const currentWeekAverage = currentWeekScores.reduce((sum, score) => sum + Number(score.score), 0) / currentWeekScores.length;
      const mealsLoggedCount = currentWeekScores.length;

      // Calculate days with meals
      const uniqueDays = new Set(
        currentWeekScores.map(score => score.created_at.split('T')[0])
      );
      const daysWithMeals = uniqueDays.size;

      // Calculate previous week average
      const previousWeekAverage = previousWeekScores && previousWeekScores.length > 0
        ? previousWeekScores.reduce((sum, score) => sum + Number(score.score), 0) / previousWeekScores.length
        : null;

      // Generate message based on performance
      let message = '';

      if (previousWeekAverage && currentWeekAverage > previousWeekAverage) {
        const improvement = ((currentWeekAverage - previousWeekAverage) / previousWeekAverage * 100).toFixed(1);
        message = `🎉 Great work! Your average meal score improved by ${improvement}% this week.`;
      } else if (previousWeekAverage && currentWeekAverage < previousWeekAverage) {
        const decline = ((previousWeekAverage - currentWeekAverage) / previousWeekAverage * 100).toFixed(1);
        message = `📉 You dropped ${decline}% this week — let's bounce back!`;
      } else if (daysWithMeals >= 6) {
        message = `🔥 Awesome consistency this week — keep the streak going!`;
      } else if (daysWithMeals <= 2) {
        message = `😴 Looks like a quiet week. Want help getting back on track?`;
      } else if (currentWeekAverage >= 80) {
        message = `⭐ Solid week with an average score of ${currentWeekAverage.toFixed(1)}!`;
      } else if (currentWeekAverage >= 60) {
        message = `💪 Decent week! You're averaging ${currentWeekAverage.toFixed(1)} — room to grow!`;
      } else {
        message = `🎯 This week averaged ${currentWeekAverage.toFixed(1)}. Let's aim higher next week!`;
      }

      summariesToInsert.push({
        user_id: userId,
        week_start: weekStartStr,
        average_score: Math.round(currentWeekAverage * 100) / 100,
        previous_week_average: previousWeekAverage ? Math.round(previousWeekAverage * 100) / 100 : null,
        meals_logged_count: mealsLoggedCount,
        days_with_meals: daysWithMeals,
        message
      });

      console.log(`✅ Generated summary for user ${userId}: ${message}`);
    }

    if (summariesToInsert.length === 0) {
      console.log('ℹ️ No new summaries to insert');
      return new Response(JSON.stringify({ 
        message: 'No new weekly summaries generated',
        processed_users: uniqueUsers.length
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Insert all summaries
    const { data: insertedSummaries, error: insertError } = await supabase
      .from('weekly_summaries')
      .insert(summariesToInsert)
      .select();

    if (insertError) {
      console.error('❌ Error inserting weekly summaries:', insertError);
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`🎉 Successfully generated ${insertedSummaries?.length || 0} weekly summaries`);

    return new Response(JSON.stringify({
      message: `Generated ${insertedSummaries?.length || 0} weekly summaries`,
      summaries: insertedSummaries,
      processed_users: uniqueUsers.length
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
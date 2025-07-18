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

    // Get the current user for authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('❌ Error getting user:', userError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`🏆 Starting monthly rankings assignment process...`);

    // Get the latest month_start value from monthly_summaries
    const { data: latestMonth, error: latestMonthError } = await supabase
      .from('monthly_summaries')
      .select('month_start')
      .order('month_start', { ascending: false })
      .limit(1)
      .single();

    if (latestMonthError) {
      console.error('❌ Error getting latest month:', latestMonthError);
      return new Response(JSON.stringify({ error: 'No monthly summaries found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const targetMonth = latestMonth.month_start;
    console.log(`📅 Processing rankings for month: ${targetMonth}`);

    // Get all summaries for that month, sorted by average_score DESC
    const { data: monthSummaries, error: summariesError } = await supabase
      .from('monthly_summaries')
      .select('id, user_id, average_score, ranking_position')
      .eq('month_start', targetMonth)
      .not('average_score', 'is', null)
      .order('average_score', { ascending: false });

    if (summariesError) {
      console.error('❌ Error fetching monthly summaries:', summariesError);
      return new Response(JSON.stringify({ error: summariesError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!monthSummaries || monthSummaries.length === 0) {
      console.log('⚠️ No summaries found for ranking assignment');
      return new Response(JSON.stringify({ 
        message: 'No summaries found for ranking assignment',
        month: targetMonth
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`📊 Found ${monthSummaries.length} summaries to rank`);

    // Check if rankings have already been assigned
    const alreadyRanked = monthSummaries.some(summary => summary.ranking_position !== null);
    if (alreadyRanked) {
      console.log('⏭️ Rankings already assigned for this month');
      return new Response(JSON.stringify({
        message: 'Rankings already assigned for this month',
        month: targetMonth,
        total_users: monthSummaries.length
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Assign rankings: Top 3 get positions 1, 2, 3; others get NULL
    const rankingUpdates = [];
    const topPerformers = [];

    for (let i = 0; i < monthSummaries.length; i++) {
      const summary = monthSummaries[i];
      const position = i < 3 ? i + 1 : null; // Top 3 get ranks 1, 2, 3; others get NULL
      
      rankingUpdates.push({
        id: summary.id,
        ranking_position: position
      });

      if (position) {
        topPerformers.push({
          position,
          user_id: summary.user_id,
          score: summary.average_score
        });
      }

      console.log(`🏅 User ${summary.user_id}: Score ${summary.average_score?.toFixed(1)} → Rank ${position || 'Unranked'}`);
    }

    // Update all rankings in batch
    const updatePromises = rankingUpdates.map(update => 
      supabase
        .from('monthly_summaries')
        .update({ ranking_position: update.ranking_position })
        .eq('id', update.id)
    );

    const updateResults = await Promise.allSettled(updatePromises);
    
    // Check for any failed updates
    const failedUpdates = updateResults.filter(result => result.status === 'rejected');
    if (failedUpdates.length > 0) {
      console.error('❌ Some ranking updates failed:', failedUpdates);
      return new Response(JSON.stringify({ 
        error: 'Some ranking updates failed',
        failed_count: failedUpdates.length 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`✅ Successfully assigned rankings for ${monthSummaries.length} users`);
    console.log(`🥇 Top 3 performers:`, topPerformers);

    return new Response(JSON.stringify({
      message: 'Monthly rankings assigned successfully',
      month: targetMonth,
      total_users: monthSummaries.length,
      ranked_users: topPerformers.length,
      top_performers: topPerformers,
      updates_applied: rankingUpdates.length
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Unexpected error in ranking assignment:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
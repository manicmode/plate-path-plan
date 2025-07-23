import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Starting weekly exercise insights cron job');

    // Get all users who have exercise logs in the past 2 weeks
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const { data: activeUsers, error: usersError } = await supabaseClient
      .from('exercise_logs')
      .select('user_id')
      .gte('created_at', twoWeeksAgo.toISOString())
      .neq('user_id', null);

    if (usersError) {
      console.error('Error fetching active users:', usersError);
      throw usersError;
    }

    // Get unique user IDs
    const uniqueUserIds = [...new Set(activeUsers?.map(log => log.user_id) || [])];
    console.log(`Found ${uniqueUserIds.length} active users for analysis`);

    // Process each user
    const results = [];
    for (const userId of uniqueUserIds) {
      try {
        console.log(`Processing weekly insights for user: ${userId}`);
        
        // Call the analyze function for each user
        const { data, error } = await supabaseClient.functions.invoke(
          'analyze-weekly-exercise-progress',
          {
            body: { 
              user_id: userId,
              manual_trigger: false // This is automated
            }
          }
        );

        if (error) {
          console.error(`Error analyzing user ${userId}:`, error);
          results.push({ userId, success: false, error: error.message });
        } else {
          console.log(`Successfully analyzed user ${userId}`);
          results.push({ userId, success: true, data });
        }
      } catch (err) {
        console.error(`Failed to process user ${userId}:`, err);
        results.push({ userId, success: false, error: err.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    console.log(`Weekly insights cron completed: ${successCount} successful, ${failureCount} failed`);

    return new Response(JSON.stringify({
      success: true,
      message: 'Weekly exercise insights cron job completed',
      processed: uniqueUserIds.length,
      successful: successCount,
      failed: failureCount,
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in weekly exercise insights cron:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
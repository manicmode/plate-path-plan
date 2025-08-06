import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    // Get authorization header and authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with user auth
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Get current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create service role client for database operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, data } = await req.json();

    switch (action) {
      case 'generate_monthly_recovery_rankings':
        return await generateMonthlyRecoveryRankings(supabase);
      
      case 'join_recovery_challenge':
        return await joinRecoveryChallenge(supabase, data);
      
      case 'create_recovery_challenge':
        return await createRecoveryChallenge(supabase, data);
      
      case 'update_recovery_progress':
        return await updateRecoveryProgress(supabase, data);
      
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Error processing recovery challenge request:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function generateMonthlyRecoveryRankings(supabase: any) {
  try {
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const monthYear = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}-01`;

    // Call the database function to generate rankings
    const { error } = await supabase.rpc('assign_monthly_recovery_rankings', {
      target_month_year: monthYear
    });

    if (error) throw error;

    // Get the top 3 winners for Hall of Fame
    const { data: winners, error: winnersError } = await supabase
      .from('recovery_challenge_metrics')
      .select(`
        user_id,
        final_recovery_score,
        total_recovery_sessions,
        meditation_sessions,
        breathing_sessions,
        yoga_sessions,
        sleep_sessions,
        rank_position,
        user_profiles!inner(first_name, last_name)
      `)
      .eq('month_year', monthYear)
      .lte('rank_position', 3)
      .order('rank_position');

    if (winnersError) throw winnersError;

    // Add winners to Hall of Fame
    if (winners && winners.length > 0) {
      const hallOfFameEntries = winners.map(winner => ({
        year: lastMonth.getFullYear(),
        user_id: winner.user_id,
        group_id: 1, // Recovery challenges group
        final_score: winner.final_recovery_score,
        challenge_type: 'recovery'
      }));

      const { error: hallOfFameError } = await supabase
        .from('hall_of_fame_winners')
        .insert(hallOfFameEntries);

      if (hallOfFameError) {
        console.warn('Could not add to Hall of Fame:', hallOfFameError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Recovery rankings generated successfully',
        winners: winners || []
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating recovery rankings:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function joinRecoveryChallenge(supabase: any, data: any) {
  try {
    const { challengeId, userId, username } = data;

    // Add user to challenge via challenge_messages
    const { error } = await supabase
      .from('challenge_messages')
      .insert({
        challenge_id: challengeId,
        user_id: userId,
        username: username,
        text: `${username} joined the recovery challenge! 🧘‍♂️`,
        emoji: '🧘‍♂️'
      });

    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true, message: 'Successfully joined recovery challenge' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error joining recovery challenge:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function createRecoveryChallenge(supabase: any, data: any) {
  try {
    const { 
      challengeName, 
      recoveryTypes, 
      duration, 
      maxParticipants, 
      creatorId, 
      creatorName,
      description,
      isPrivate = false
    } = data;

    const challengeId = `recovery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create challenge entry
    const challengeMessage = {
      challenge_id: challengeId,
      user_id: creatorId,
      username: creatorName,
      text: `🌟 ${challengeName} - ${description}. Recovery types: ${recoveryTypes.join(', ')}. Duration: ${duration} days. Join us! 🧘‍♂️`,
      emoji: '🧘‍♂️'
    };

    const { error } = await supabase
      .from('challenge_messages')
      .insert(challengeMessage);

    if (error) throw error;

    return new Response(
      JSON.stringify({ 
        success: true, 
        challengeId,
        message: 'Recovery challenge created successfully' 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating recovery challenge:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function updateRecoveryProgress(supabase: any, data: any) {
  try {
    const { challengeId, userId, username, recoveryType, sessionCount } = data;

    // Update progress message
    const progressMessage = {
      challenge_id: challengeId,
      user_id: userId,
      username: username,
      text: `Completed ${sessionCount} ${recoveryType} session${sessionCount !== 1 ? 's' : ''} today! 🌟`,
      emoji: getRecoveryEmoji(recoveryType)
    };

    const { error } = await supabase
      .from('challenge_messages')
      .insert(progressMessage);

    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true, message: 'Recovery progress updated' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error updating recovery progress:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

function getRecoveryEmoji(recoveryType: string): string {
  const emojiMap: { [key: string]: string } = {
    'meditation': '🧘‍♂️',
    'breathing': '🌬️',
    'yoga': '🧎‍♀️',
    'sleep': '😴',
    'stretching': '🤸',
    'muscle-recovery': '🧪'
  };
  return emojiMap[recoveryType] || '🧘‍♂️';
}
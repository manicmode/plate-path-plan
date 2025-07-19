import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { 
      participation_id, 
      challenge_id, 
      user_id,
      progress_type = 'daily',
      progress_value = 1,
      notes = '',
      is_public_challenge = true
    } = await req.json();

    console.log('Updating challenge progress:', { 
      participation_id, 
      challenge_id, 
      user_id, 
      progress_type, 
      progress_value 
    });

    const today = new Date().toISOString().split('T')[0];

    if (is_public_challenge) {
      // Handle public challenge progress
      const { data: participation, error: participationError } = await supabase
        .from('user_challenge_participations')
        .select('*, public_challenges(*)')
        .eq('id', participation_id)
        .single();

      if (participationError) {
        throw new Error(`Failed to get participation: ${participationError.message}`);
      }

      // Update daily completion
      const currentDailyCompletions = participation.daily_completions || {};
      currentDailyCompletions[today] = true;

      // Calculate updated progress
      const startDate = new Date(participation.start_date);
      const endDate = new Date(participation.end_date);
      const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const completedDays = Object.keys(currentDailyCompletions).length;
      const completionPercentage = Math.min((completedDays / totalDays) * 100, 100);

      // Calculate streak
      let currentStreak = 0;
      let checkDate = new Date();
      while (checkDate >= startDate) {
        const dateKey = checkDate.toISOString().split('T')[0];
        if (currentDailyCompletions[dateKey]) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }

      // Update participation record
      const { error: updateError } = await supabase
        .from('user_challenge_participations')
        .update({
          daily_completions: currentDailyCompletions,
          current_progress: completedDays,
          completion_percentage: completionPercentage,
          streak_count: currentStreak,
          best_streak: Math.max(participation.best_streak || 0, currentStreak),
          is_completed: completionPercentage >= 100,
          completed_at: completionPercentage >= 100 ? new Date().toISOString() : null,
          last_progress_update: new Date().toISOString()
        })
        .eq('id', participation_id);

      if (updateError) {
        throw updateError;
      }

      // Log progress entry
      const { error: logError } = await supabase
        .from('challenge_progress_logs')
        .insert({
          participation_id,
          user_id,
          challenge_id,
          log_date: today,
          progress_value: completedDays,
          notes
        });

      if (logError) {
        console.error('Error logging progress:', logError);
      }

      return new Response(JSON.stringify({
        success: true,
        current_progress: completedDays,
        completion_percentage: completionPercentage,
        streak_count: currentStreak,
        is_completed: completionPercentage >= 100,
        message: 'Public challenge progress updated successfully'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });

    } else {
      // Handle private challenge progress
      const { data: participation, error: participationError } = await supabase
        .from('private_challenge_participations')
        .select('*, private_challenges(*)')
        .eq('id', participation_id)
        .single();

      if (participationError) {
        throw new Error(`Failed to get private participation: ${participationError.message}`);
      }

      // Update daily completion
      const currentDailyCompletions = participation.daily_completions || {};
      currentDailyCompletions[today] = true;

      const challenge = participation.private_challenges;
      const startDate = new Date(challenge.start_date);
      const totalDays = challenge.duration_days;
      const completedDays = Object.keys(currentDailyCompletions).length;
      const completionPercentage = Math.min((completedDays / totalDays) * 100, 100);

      // Calculate streak
      let currentStreak = 0;
      let checkDate = new Date();
      while (checkDate >= startDate) {
        const dateKey = checkDate.toISOString().split('T')[0];
        if (currentDailyCompletions[dateKey]) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }

      // Update participation record
      const { error: updateError } = await supabase
        .from('private_challenge_participations')
        .update({
          daily_completions: currentDailyCompletions,
          progress_value: completedDays,
          completed_days: completedDays,
          completion_percentage: completionPercentage,
          streak_count: currentStreak,
          completed_at: completionPercentage >= 100 ? new Date().toISOString() : null,
          last_progress_update: new Date().toISOString()
        })
        .eq('id', participation_id);

      if (updateError) {
        throw updateError;
      }

      // If this is a team challenge, update team scores
      if (challenge.is_team_challenge && participation.team_id) {
        const { error: teamUpdateError } = await supabase
          .rpc('update_team_scores', { challenge_id_param: challenge.id });

        if (teamUpdateError) {
          console.error('Error updating team scores:', teamUpdateError);
        }
      }

      return new Response(JSON.stringify({
        success: true,
        current_progress: completedDays,
        completion_percentage: completionPercentage,
        streak_count: currentStreak,
        is_completed: completionPercentage >= 100,
        team_updated: challenge.is_team_challenge,
        message: 'Private challenge progress updated successfully'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

  } catch (error) {
    console.error('Error in progress tracker:', error);
    return new Response(JSON.stringify({
      error: error.message,
      success: false
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
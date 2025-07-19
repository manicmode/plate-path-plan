import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

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

    const { challenge_id, action } = await req.json();

    console.log('Auto-assigning teams for challenge:', challenge_id);

    if (action === 'auto_assign') {
      // Get challenge details
      const { data: challenge, error: challengeError } = await supabaseClient
        .from('private_challenges')
        .select('team_size, auto_team_enabled')
        .eq('id', challenge_id)
        .single();

      if (challengeError) {
        console.error('Error fetching challenge:', challengeError);
        throw challengeError;
      }

      if (!challenge.auto_team_enabled) {
        return new Response(
          JSON.stringify({ error: 'Auto-team not enabled for this challenge' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      // Call the auto_assign_teams function
      const { data: teamsCreated, error: assignError } = await supabaseClient
        .rpc('auto_assign_teams', {
          challenge_id_param: challenge_id,
          team_size_param: challenge.team_size || 3
        });

      if (assignError) {
        console.error('Error auto-assigning teams:', assignError);
        throw assignError;
      }

      console.log('Teams created:', teamsCreated);

      // Update team scores after assignment
      const { error: scoreError } = await supabaseClient
        .rpc('update_team_scores', {
          challenge_id_param: challenge_id
        });

      if (scoreError) {
        console.error('Error updating team scores:', scoreError);
        // Don't fail the entire request for score update errors
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          teams_created: teamsCreated,
          message: `Successfully created ${teamsCreated} teams`
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );

    } else if (action === 'update_scores') {
      // Update team scores
      const { error: scoreError } = await supabaseClient
        .rpc('update_team_scores', {
          challenge_id_param: challenge_id
        });

      if (scoreError) {
        console.error('Error updating team scores:', scoreError);
        throw scoreError;
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Team scores updated successfully'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );

    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid action. Use "auto_assign" or "update_scores"' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

  } catch (error) {
    console.error('Error in team-challenge-manager function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Failed to manage team challenge'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
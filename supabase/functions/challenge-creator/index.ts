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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { 
      title, 
      description, 
      category, 
      challenge_type = 'habit',
      duration_days, 
      target_value,
      target_metric,
      target_unit,
      difficulty_level = 'beginner',
      badge_icon = '🏆',
      is_team_challenge = false,
      team_size = 1,
      max_participants = 20,
      start_date,
      invited_user_ids = [],
      creator_id,
      is_public = false
    } = await req.json();

    console.log('Creating challenge:', { title, challenge_type, is_public, creator_id });

    // Validate required fields
    if (!title || !description || !category || !duration_days || !creator_id || !start_date) {
      throw new Error('Missing required fields');
    }

    if (is_public) {
      // Create public challenge
      const { data: publicChallenge, error: publicError } = await supabaseClient
        .from('public_challenges')
        .insert({
          title,
          description,
          goal_description: description,
          category,
          challenge_type,
          duration_days,
          target_value,
          target_metric,
          target_unit,
          difficulty_level,
          badge_icon,
          is_trending: false,
          is_new: true,
          is_active: true
        })
        .select()
        .single();

      if (publicError) {
        throw publicError;
      }

      // Creator automatically joins their own public challenge
      const { error: participationError } = await supabaseClient
        .from('user_challenge_participations')
        .insert({
          user_id: creator_id,
          challenge_id: publicChallenge.id,
          start_date: new Date(start_date).toISOString().split('T')[0],
          end_date: new Date(new Date(start_date).getTime() + duration_days * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          total_target: target_value || duration_days
        });

      if (participationError) {
        console.error('Error creating creator participation:', participationError);
      }

      return new Response(JSON.stringify({
        success: true,
        challenge_id: publicChallenge.id,
        challenge_type: 'public',
        message: 'Public challenge created successfully'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });

    } else {
      // Create private challenge
      const { data: privateChallenge, error: privateError } = await supabaseClient
        .from('private_challenges')
        .insert({
          creator_id,
          title,
          description,
          category,
          challenge_type,
          duration_days,
          target_value,
          target_metric,
          target_unit,
          badge_icon,
          is_team_challenge,
          team_size,
          max_participants,
          start_date: new Date(start_date).toISOString().split('T')[0],
          invited_user_ids,
          status: 'pending'
        })
        .select()
        .single();

      if (privateError) {
        throw privateError;
      }

      // Creator automatically participates in their own private challenge
      const { error: creatorParticipationError } = await supabaseClient
        .from('private_challenge_participations')
        .insert({
          private_challenge_id: privateChallenge.id,
          user_id: creator_id,
          is_creator: true
        });

      if (creatorParticipationError) {
        console.error('Error creating creator participation:', creatorParticipationError);
      }

      // Create invitations for invited users
      if (invited_user_ids && invited_user_ids.length > 0) {
        const invitations = invited_user_ids.map((invitee_id: string) => ({
          private_challenge_id: privateChallenge.id,
          inviter_id: creator_id,
          invitee_id,
          status: 'pending'
        }));

        const { error: invitationError } = await supabaseClient
          .from('challenge_invitations')
          .insert(invitations);

        if (invitationError) {
          console.error('Error creating invitations:', invitationError);
        }
      }

      // If team challenge, create initial team
      if (is_team_challenge) {
        const { error: teamError } = await supabaseClient
          .from('challenge_teams')
          .insert({
            challenge_id: privateChallenge.id,
            creator_id,
            name: `Team ${title.substring(0, 20)}`,
            member_ids: [creator_id]
          });

        if (teamError) {
          console.error('Error creating initial team:', teamError);
        }
      }

      return new Response(JSON.stringify({
        success: true,
        challenge_id: privateChallenge.id,
        challenge_type: 'private',
        invitations_sent: invited_user_ids.length,
        message: 'Private challenge created successfully'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

  } catch (error) {
    console.error('Error in challenge creator:', error);
    return new Response(JSON.stringify({
      error: error.message,
      success: false
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
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

    const { inviter_id, invitee_id, challenge_id, challenge_title, is_custom, custom_data } = await req.json();

    console.log('Sending challenge invite:', {
      inviter_id,
      invitee_id,
      challenge_id,
      challenge_title,
      is_custom
    });

    // Get inviter profile for name
    const { data: inviterProfile } = await supabaseClient
      .from('user_profiles')
      .select('first_name, last_name')
      .eq('user_id', inviter_id)
      .single();

    const inviterName = inviterProfile 
      ? `${inviterProfile.first_name || ''} ${inviterProfile.last_name || ''}`.trim() || 'Someone'
      : 'Someone';

    if (is_custom && custom_data) {
      // Create a private challenge for custom challenges
      const { data: privateChallenge, error: challengeError } = await supabaseClient
        .from('private_challenges')
        .insert({
          creator_id: inviter_id,
          title: custom_data.title,
          description: custom_data.description,
          duration_days: custom_data.duration_days,
          category: custom_data.category,
          challenge_type: 'habit',
          status: 'pending',
          start_date: new Date().toISOString().split('T')[0],
          invited_user_ids: [invitee_id],
          max_participants: 2
        })
        .select()
        .single();

      if (challengeError) {
        console.error('Error creating private challenge:', challengeError);
        throw challengeError;
      }

      // Create challenge invitation
      const { error: inviteError } = await supabaseClient
        .from('challenge_invitations')
        .insert({
          private_challenge_id: privateChallenge.id,
          inviter_id: inviter_id,
          invitee_id: invitee_id,
          status: 'pending'
        });

      if (inviteError) {
        console.error('Error creating challenge invitation:', inviteError);
        throw inviteError;
      }

      console.log('Created custom challenge invitation:', privateChallenge.id);
    }

    // Record the challenge invite in social_boosts for tracking
    const { error: boostError } = await supabaseClient
      .from('social_boosts')
      .insert({
        user_id: invitee_id,
        friend_id: inviter_id,
        type: 'challenge_invite',
        friend_name: inviterName,
        challenge_id: challenge_id,
        challenge_name: challenge_title,
        shown: false
      });

    if (boostError) {
      console.error('Error recording social boost:', boostError);
    }

    // Send push notification to invitee
    try {
      await supabaseClient.functions.invoke('send-push-notification', {
        body: {
          user_id: invitee_id,
          title: 'Challenge Invitation! 🎯',
          body: `${inviterName} invited you to "${challenge_title}"`,
          data: {
            type: 'challenge_invite',
            inviter_id: inviter_id,
            inviter_name: inviterName,
            challenge_id: challenge_id,
            challenge_title: challenge_title,
            is_custom: is_custom
          }
        }
      });
    } catch (pushError) {
      console.error('Error sending push notification:', pushError);
      // Don't fail the entire request if push notification fails
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Challenge invite sent successfully',
        challenge_id: is_custom ? challenge_id : challenge_id
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in send-challenge-invite function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Failed to send challenge invite'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
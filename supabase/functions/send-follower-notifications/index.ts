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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Processing follower notifications...')

    // Get unsent notifications
    const { data: notifications, error: notificationsError } = await supabaseClient
      .from('follower_notifications_queue')
      .select(`
        id,
        follower_id,
        challenge_id,
        notification_type,
        influencers!influencer_id (
          name
        ),
        private_challenges!challenge_id (
          title
        )
      `)
      .eq('sent', false)
      .limit(100);

    if (notificationsError) {
      console.error('Error fetching notifications:', notificationsError)
      throw notificationsError
    }

    console.log(`Found ${notifications?.length || 0} notifications to send`)

    // Process each notification
    for (const notification of notifications || []) {
      try {
        // Get user's push subscription (if we had push notification setup)
        // For now, we'll just create in-app notifications
        
        const influencerName = notification.influencers?.name || 'Your coach'
        const challengeTitle = notification.private_challenges?.title || 'New Challenge'

        // Create in-app notification
        const { error: notificationError } = await supabaseClient
          .from('user_notifications')
          .insert({
            user_id: notification.follower_id,
            type: 'new_challenge',
            title: `🚨 New Challenge from ${influencerName}!`,
            message: `Join the "${challengeTitle}" and transform with ${influencerName}!`,
            data: {
              challenge_id: notification.challenge_id,
              influencer_name: influencerName,
              challenge_title: challengeTitle
            }
          })

        if (notificationError) {
          console.error('Error creating notification:', notificationError)
          continue
        }

        // Mark notification as sent
        await supabaseClient
          .from('follower_notifications_queue')
          .update({ sent: true })
          .eq('id', notification.id)

        console.log(`Notification sent for challenge ${notification.challenge_id} to user ${notification.follower_id}`)

      } catch (error) {
        console.error('Error processing notification:', error)
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: notifications?.length || 0 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { userId, triggerType } = await req.json()

    console.log(`Processing sleep nudge for user: ${userId}, trigger: ${triggerType}`)

    // Check if user has sleep nudges enabled
    if (userId) {
      const { data: preferences } = await supabaseClient
        .from('sleep_nudge_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()

      // If user has disabled nudges, skip
      if (preferences && !preferences.nudges_enabled) {
        console.log('Sleep nudges disabled for user:', userId)
        return new Response(
          JSON.stringify({ success: true, message: 'Nudges disabled' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // For smart nudges, check if they're enabled
      if (triggerType !== 'daily_reminder' && preferences && !preferences.smart_nudges_enabled) {
        console.log('Smart sleep nudges disabled for user:', userId)
        return new Response(
          JSON.stringify({ success: true, message: 'Smart nudges disabled' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Check recent nudges to avoid spam (no more than 1 nudge per day)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    if (userId) {
      const { data: recentNudges } = await supabaseClient
        .from('sleep_nudges')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', today.toISOString())

      if (recentNudges && recentNudges.length > 0) {
        console.log('Sleep nudge already sent today for user:', userId)
        return new Response(
          JSON.stringify({ success: true, message: 'Nudge already sent today' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    let nudgeMessage = ''
    let nudgeReason = ''
    let nudgeType = 'daily_reminder'

    // Generate nudge message based on trigger type
    switch (triggerType) {
      case 'daily_reminder':
        nudgeMessage = 'Time to wind down for the night. A good sleep routine helps restore your body and mind. 🌙'
        nudgeReason = 'Daily sleep preparation reminder'
        nudgeType = 'daily_reminder'
        break
      
      case 'mood_submission':
        nudgeMessage = 'After tracking your mood, some relaxing sleep preparation might help you unwind. Sweet dreams await! 😴'
        nudgeReason = 'Mood-based sleep suggestion'
        nudgeType = 'smart_nudge'
        break
      
      case 'exercise_submission':
        nudgeMessage = 'Great workout! Now let\'s help your body recover with some peaceful sleep preparation. 🛌'
        nudgeReason = 'Post-exercise recovery suggestion'
        nudgeType = 'smart_nudge'
        break
      
      default:
        nudgeMessage = 'Take a moment to prepare for restful sleep. Your body will thank you tomorrow! 🌟'
        nudgeReason = 'General sleep wellness nudge'
        nudgeType = 'ai_coach'
    }

    // Handle daily reminder for all users or specific user nudge
    if (triggerType === 'daily_reminder' && !userId) {
      // Get all users with sleep nudges enabled
      const { data: usersWithNudges } = await supabaseClient
        .from('sleep_nudge_preferences')
        .select('user_id')
        .eq('nudges_enabled', true)

      if (usersWithNudges) {
        console.log(`Sending daily sleep nudges to ${usersWithNudges.length} users`)
        
        for (const userPref of usersWithNudges) {
          // Check if nudge already sent today for this user
          const { data: todayNudges } = await supabaseClient
            .from('sleep_nudges')
            .select('id')
            .eq('user_id', userPref.user_id)
            .gte('created_at', today.toISOString())

          if (!todayNudges || todayNudges.length === 0) {
            await supabaseClient.from('sleep_nudges').insert({
              user_id: userPref.user_id,
              nudge_type: nudgeType,
              nudge_reason: nudgeReason,
              nudge_message: nudgeMessage,
              user_action: 'pending'
            })
          }
        }
      }
    } else if (userId) {
      // Send nudge to specific user
      const { error: insertError } = await supabaseClient
        .from('sleep_nudges')
        .insert({
          user_id: userId,
          nudge_type: nudgeType,
          nudge_reason: nudgeReason,
          nudge_message: nudgeMessage,
          user_action: 'pending'
        })

      if (insertError) {
        console.error('Error inserting sleep nudge:', insertError)
        throw insertError
      }

      console.log('Sleep nudge sent successfully to user:', userId)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Sleep nudge processed successfully',
        nudgeType: nudgeType,
        trigger: triggerType
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in trigger-sleep-nudge:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
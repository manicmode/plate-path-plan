import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface User {
  id: string
}

interface MoodLog {
  user_id: string
  mood: number
  created_at: string
}

interface ExerciseLog {
  user_id: string
  intensity: string
  created_at: string
}

interface RecoveryLog {
  user_id: string
  recovery_type: string
  completed_at: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Starting meditation nudge analysis for all users')

    // Get all users from auth.users (admin function)
    const { data: users, error: usersError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (usersError) {
      console.error('Error fetching users:', usersError)
      throw usersError
    }

    if (!users?.users || users.users.length === 0) {
      console.log('No users found')
      return new Response(
        JSON.stringify({ message: 'No users found', nudges_created: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Processing ${users.users.length} users`)

    const results = []
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()

    for (const user of users.users) {
      try {
        console.log(`Analyzing user: ${user.id}`)
        
        let shouldNudge = false
        let nudgeReason = ''

        // Check for low mood in last 3 days
        const { data: moodLogs, error: moodError } = await supabaseAdmin
          .from('mood_logs')
          .select('mood, created_at')
          .eq('user_id', user.id)
          .gte('created_at', threeDaysAgo)
          .lte('mood', 3)

        if (moodError) {
          console.error(`Error fetching mood logs for user ${user.id}:`, moodError)
        } else if (moodLogs && moodLogs.length > 0) {
          shouldNudge = true
          nudgeReason = 'low_mood'
          console.log(`User ${user.id} has low mood in past 3 days`)
        }

        // Check for intense exercise in last 3 days
        if (!shouldNudge) {
          const { data: exerciseLogs, error: exerciseError } = await supabaseAdmin
            .from('exercise_logs')
            .select('intensity, created_at')
            .eq('user_id', user.id)
            .eq('intensity', 'high')
            .gte('created_at', threeDaysAgo)

          if (exerciseError) {
            console.error(`Error fetching exercise logs for user ${user.id}:`, exerciseError)
          } else if (exerciseLogs && exerciseLogs.length > 0) {
            shouldNudge = true
            nudgeReason = 'intense_exercise'
            console.log(`User ${user.id} has intense exercise in past 3 days`)
          }
        }

        // Check for missed meditation in last 2 days
        if (!shouldNudge) {
          const { data: recoveryLogs, error: recoveryError } = await supabaseAdmin
            .from('recovery_logs')
            .select('completed_at')
            .eq('user_id', user.id)
            .eq('recovery_type', 'meditation')
            .gte('completed_at', twoDaysAgo)

          if (recoveryError) {
            console.error(`Error fetching recovery logs for user ${user.id}:`, recoveryError)
          } else if (!recoveryLogs || recoveryLogs.length === 0) {
            shouldNudge = true
            nudgeReason = 'missed_meditation'
            console.log(`User ${user.id} missed meditation in past 2 days`)
          }
        }

        // Insert nudge if conditions are met
        if (shouldNudge) {
          const { error: insertError } = await supabaseAdmin
            .from('ai_nudges')
            .insert({
              user_id: user.id,
              nudge_type: 'meditation',
              message: 'Need a breather? 🧘 Your mind and body could use a meditation break!',
              created_at: new Date().toISOString()
            })

          if (insertError) {
            console.error(`Error inserting nudge for user ${user.id}:`, insertError)
            results.push({
              user_id: user.id,
              success: false,
              reason: nudgeReason,
              error: insertError.message
            })
          } else {
            console.log(`Successfully created meditation nudge for user ${user.id} (reason: ${nudgeReason})`)
            results.push({
              user_id: user.id,
              success: true,
              reason: nudgeReason
            })
          }
        } else {
          console.log(`No nudge needed for user ${user.id}`)
          results.push({
            user_id: user.id,
            success: false,
            reason: 'no_conditions_met'
          })
        }

      } catch (userError) {
        console.error(`Error processing user ${user.id}:`, userError)
        results.push({
          user_id: user.id,
          success: false,
          error: userError.message
        })
      }
    }

    const successfulNudges = results.filter(r => r.success).length
    console.log(`Created ${successfulNudges} meditation nudges out of ${users.users.length} users`)

    return new Response(
      JSON.stringify({
        message: 'Meditation nudge analysis completed',
        total_users: users.users.length,
        nudges_created: successfulNudges,
        results: results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in triggerMeditationNudge function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
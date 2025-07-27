import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NudgeContext {
  userId: string
  lastMeditationDate?: string
  recentMoodLogs: any[]
  recentExerciseLogs: any[]
  meditationStreak: number
  preferences: any
}

interface NudgeDecision {
  shouldNudge: boolean
  nudgeType: 'smart_nudge' | 'ai_coach' | 'daily_reminder'
  nudgeReason: string
  nudgeMessage: string
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

    const { userId, triggerType = 'cron' } = await req.json()
    
    console.log(`Starting meditation nudge analysis for user: ${userId}, trigger: ${triggerType}`)

    // If no userId provided and it's a cron job, process all active users
    if (!userId && triggerType === 'cron') {
      return await processCronJob(supabaseClient)
    }

    if (!userId) {
      throw new Error('User ID is required for non-cron triggers')
    }

    const nudgeDecision = await analyzeUserForNudge(supabaseClient, userId)
    
    if (nudgeDecision.shouldNudge) {
      await logNudgeAttempt(supabaseClient, userId, nudgeDecision)
      await sendNudgeToClient(supabaseClient, userId, nudgeDecision)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        nudgeDecision,
        message: nudgeDecision.shouldNudge ? 'Nudge sent' : 'No nudge needed'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in trigger-meditation-nudge:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

async function processCronJob(supabaseClient: any): Promise<Response> {
  console.log('Processing daily meditation nudge cron job')
  
  // Get all users with nudge preferences enabled
  const { data: users, error } = await supabaseClient
    .from('meditation_nudge_preferences')
    .select('user_id')
    .eq('nudges_enabled', true)

  if (error) {
    console.error('Error fetching users for cron job:', error)
    throw error
  }

  const results = []
  
  for (const user of users || []) {
    try {
      const nudgeDecision = await analyzeUserForNudge(supabaseClient, user.user_id)
      
      if (nudgeDecision.shouldNudge) {
        await logNudgeAttempt(supabaseClient, user.user_id, nudgeDecision)
        await sendNudgeToClient(supabaseClient, user.user_id, nudgeDecision)
        results.push({ userId: user.user_id, action: 'nudge_sent', reason: nudgeDecision.nudgeReason })
      } else {
        results.push({ userId: user.user_id, action: 'no_nudge', reason: 'conditions_not_met' })
      }
    } catch (userError) {
      console.error(`Error processing user ${user.user_id}:`, userError)
      results.push({ userId: user.user_id, action: 'error', error: userError.message })
    }
  }

  return new Response(
    JSON.stringify({ 
      success: true, 
      processedUsers: users?.length || 0,
      results 
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function analyzeUserForNudge(supabaseClient: any, userId: string): Promise<NudgeDecision> {
  const context = await gatherUserContext(supabaseClient, userId)
  
  // Check if nudges are disabled
  if (!context.preferences?.nudges_enabled) {
    return {
      shouldNudge: false,
      nudgeType: 'smart_nudge',
      nudgeReason: 'nudges_disabled',
      nudgeMessage: ''
    }
  }

  // If smart nudges are disabled, only check for scheduled reminders
  if (!context.preferences?.smart_nudges_enabled) {
    return checkScheduledReminder(context)
  }

  // Smart nudge analysis
  return analyzeSmartNudgeConditions(context)
}

async function gatherUserContext(supabaseClient: any, userId: string): Promise<NudgeContext> {
  // Get user preferences
  const { data: preferences } = await supabaseClient
    .from('meditation_nudge_preferences')
    .select('*')
    .eq('user_id', userId)
    .single()

  // Get meditation streak data
  const { data: meditationStreak } = await supabaseClient
    .from('meditation_streaks')
    .select('*')
    .eq('user_id', userId)
    .single()

  // Get recent mood logs (last 3 days)
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const { data: moodLogs } = await supabaseClient
    .from('mood_logs')
    .select('*')
    .eq('user_id', userId)
    .gte('date', threeDaysAgo)
    .order('date', { ascending: false })

  // Get recent exercise logs (we'll check if there's an exercise table)
  // For now, we'll use a placeholder - this would need to be adapted based on your exercise logging system
  const recentExerciseLogs: any[] = []

  return {
    userId,
    lastMeditationDate: meditationStreak?.last_completed_date,
    recentMoodLogs: moodLogs || [],
    recentExerciseLogs,
    meditationStreak: meditationStreak?.current_streak || 0,
    preferences: preferences || { nudges_enabled: true, smart_nudges_enabled: true }
  }
}

function checkScheduledReminder(context: NudgeContext): NudgeDecision {
  // For scheduled reminders, we'd typically check if it's the right time of day
  // This is a simplified version - you'd want to integrate with the meditation_reminders table
  const now = new Date()
  const currentHour = now.getHours()
  
  // Default reminder time (could be fetched from meditation_reminders table)
  const reminderHour = 9 // 9 AM
  
  if (currentHour === reminderHour) {
    return {
      shouldNudge: true,
      nudgeType: 'daily_reminder',
      nudgeReason: 'scheduled_reminder',
      nudgeMessage: "🧘 Time for your daily meditation practice. Let's find some peace together."
    }
  }

  return {
    shouldNudge: false,
    nudgeType: 'daily_reminder',
    nudgeReason: 'not_scheduled_time',
    nudgeMessage: ''
  }
}

function analyzeSmartNudgeConditions(context: NudgeContext): NudgeDecision {
  const now = new Date()
  const daysSinceLastMeditation = context.lastMeditationDate 
    ? Math.floor((now.getTime() - new Date(context.lastMeditationDate).getTime()) / (1000 * 60 * 60 * 24))
    : 999

  // Check for no meditation in last 48 hours
  if (daysSinceLastMeditation >= 2) {
    return {
      shouldNudge: true,
      nudgeType: 'smart_nudge',
      nudgeReason: 'skipped_meditation',
      nudgeMessage: `It's been ${daysSinceLastMeditation} days since your last meditation. Your mind deserves a moment of peace. Ready for a quick session?`
    }
  }

  // Check for recent low mood (mood < 3 in last 2 days)
  const recentLowMood = context.recentMoodLogs.some(log => 
    log.mood && log.mood < 3 && 
    new Date(log.date).getTime() > now.getTime() - (2 * 24 * 60 * 60 * 1000)
  )

  if (recentLowMood) {
    return {
      shouldNudge: true,
      nudgeType: 'ai_coach',
      nudgeReason: 'low_mood',
      nudgeMessage: "I noticed your mood has been low recently. Meditation can help bring some calm and clarity. Want to try a gentle session?"
    }
  }

  // Check for broken meditation streak (had streak >= 3, but now it's 0)
  if (context.meditationStreak === 0) {
    // We'd need additional data to know if they had a previous streak
    // This is a simplified check
    return {
      shouldNudge: true,
      nudgeType: 'ai_coach',
      nudgeReason: 'broken_streak',
      nudgeMessage: "Every meditation journey has ups and downs. Ready to restart your practice with a fresh perspective?"
    }
  }

  // Check for intense workout (placeholder - would need exercise intensity data)
  const hasIntenseWorkout = context.recentExerciseLogs.some(log => 
    log.intensity === 'high' && 
    new Date(log.date).getTime() > now.getTime() - (24 * 60 * 60 * 1000)
  )

  if (hasIntenseWorkout) {
    return {
      shouldNudge: true,
      nudgeType: 'smart_nudge',
      nudgeReason: 'intense_exercise',
      nudgeMessage: "Great workout! Your body did the hard work, now let's give your mind some recovery time with meditation."
    }
  }

  return {
    shouldNudge: false,
    nudgeType: 'smart_nudge',
    nudgeReason: 'no_triggers_met',
    nudgeMessage: ''
  }
}

async function logNudgeAttempt(supabaseClient: any, userId: string, decision: NudgeDecision) {
  const { error } = await supabaseClient
    .from('meditation_nudge_history')
    .insert({
      user_id: userId,
      nudge_type: decision.nudgeType,
      nudge_reason: decision.nudgeReason,
      nudge_message: decision.nudgeMessage,
      delivered_at: new Date().toISOString(),
      user_action: 'pending'
    })

  if (error) {
    console.error('Error logging nudge attempt:', error)
    throw error
  }

  console.log(`Nudge logged for user ${userId}: ${decision.nudgeReason}`)
}

async function sendNudgeToClient(supabaseClient: any, userId: string, decision: NudgeDecision) {
  // Placeholder function for sending nudge to client
  // This could be implemented as:
  // 1. Push notification
  // 2. In-app notification
  // 3. Email notification
  // 4. Real-time update to user's session
  
  console.log(`[PLACEHOLDER] Sending nudge to user ${userId}:`)
  console.log(`Type: ${decision.nudgeType}`)
  console.log(`Reason: ${decision.nudgeReason}`)
  console.log(`Message: ${decision.nudgeMessage}`)

  // For now, we could create a user notification
  const { error } = await supabaseClient
    .from('user_notifications')
    .insert({
      user_id: userId,
      type: 'meditation_nudge',
      title: decision.nudgeType === 'ai_coach' ? 'AI Coach Suggestion' : 'Meditation Reminder',
      message: decision.nudgeMessage,
      data: {
        nudge_type: decision.nudgeType,
        nudge_reason: decision.nudgeReason
      }
    })

  if (error) {
    console.error('Error creating user notification:', error)
    // Don't throw here as the main nudge logic succeeded
  }
}
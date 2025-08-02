import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NudgeContext {
  userId: string
  lastBreathingDate?: string
  recentMoodLogs: any[]
  recentExerciseLogs: any[]
  breathingStreak: number
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
    
    console.log(`Starting breathing nudge analysis for user: ${userId}, trigger: ${triggerType}`)

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
        message: nudgeDecision.shouldNudge ? 'Breathing nudge sent' : 'No breathing nudge needed'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in trigger-breathing-nudge:', error)
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
  console.log('Processing daily breathing nudge cron job')
  
  // Get all users with nudge preferences enabled
  const { data: users, error } = await supabaseClient
    .from('breathing_nudge_preferences')
    .select('user_id')
    .eq('nudges_enabled', true)

  if (error) {
    console.error('Error fetching users for breathing cron job:', error)
    throw error
  }

  const results = []
  
  for (const user of users || []) {
    try {
      const nudgeDecision = await analyzeUserForNudge(supabaseClient, user.user_id)
      
      if (nudgeDecision.shouldNudge) {
        await logNudgeAttempt(supabaseClient, user.user_id, nudgeDecision)
        await sendNudgeToClient(supabaseClient, user.user_id, nudgeDecision)
        results.push({ userId: user.user_id, action: 'breathing_nudge_sent', reason: nudgeDecision.nudgeReason })
      } else {
        results.push({ userId: user.user_id, action: 'no_breathing_nudge', reason: 'conditions_not_met' })
      }
    } catch (userError) {
      console.error(`Error processing breathing nudge for user ${user.user_id}:`, userError)
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

  // Smart nudge analysis for breathing
  return analyzeSmartBreathingNudgeConditions(context)
}

async function gatherUserContext(supabaseClient: any, userId: string): Promise<NudgeContext> {
  // Get user breathing nudge preferences
  const { data: preferences } = await supabaseClient
    .from('breathing_nudge_preferences')
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

  // Get recent recovery session logs (breathing sessions) to check last session
  const { data: breathingSessions } = await supabaseClient
    .from('recovery_session_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('category', 'breathing')
    .order('completed_at', { ascending: false })
    .limit(1)

  // Get recent exercise logs (placeholder for now)
  const recentExerciseLogs: any[] = []

  return {
    userId,
    lastBreathingDate: breathingSessions?.[0]?.completed_at,
    recentMoodLogs: moodLogs || [],
    recentExerciseLogs,
    breathingStreak: 0, // Could calculate based on session frequency
    preferences: preferences || { nudges_enabled: true, push_notifications_enabled: true }
  }
}

function analyzeSmartBreathingNudgeConditions(context: NudgeContext): NudgeDecision {
  const now = new Date()
  const daysSinceLastBreathing = context.lastBreathingDate 
    ? Math.floor((now.getTime() - new Date(context.lastBreathingDate).getTime()) / (1000 * 60 * 60 * 24))
    : 7 // Default to 7 days instead of 999 to avoid confusing display

  // Check for no breathing session in last 24 hours (changed from 48 hours)
  if (daysSinceLastBreathing >= 1) {
    return {
      shouldNudge: true,
      nudgeType: 'smart_nudge',
      nudgeReason: 'skipped_breathing',
      nudgeMessage: `It's been ${daysSinceLastBreathing === 7 ? 'a while' : `${daysSinceLastBreathing} days`} since your last breathing practice. Take a moment to breathe and center yourself.`
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
      nudgeMessage: "I noticed your mood has been low recently. A few minutes of mindful breathing can help restore balance and calm. Ready to try?"
    }
  }

  // Check for intense workout (placeholder for now)
  const hasIntenseWorkout = context.recentExerciseLogs.some(log => 
    log.intensity === 'high' && 
    new Date(log.date).getTime() > now.getTime() - (24 * 60 * 60 * 1000)
  )

  if (hasIntenseWorkout) {
    return {
      shouldNudge: true,
      nudgeType: 'smart_nudge',
      nudgeReason: 'intense_exercise',
      nudgeMessage: "Great workout! Now let's help your body recover with some deep breathing exercises."
    }
  }

  // Daily reminder check (9 AM)
  const currentHour = now.getHours()
  if (currentHour === 9) {
    return {
      shouldNudge: true,
      nudgeType: 'daily_reminder',
      nudgeReason: 'scheduled_reminder',
      nudgeMessage: "🌅 Good morning! Start your day with intention. A few mindful breaths can set a positive tone for everything ahead."
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
    .from('breathing_nudges')
    .insert({
      user_id: userId,
      nudge_type: decision.nudgeType,
      nudge_reason: decision.nudgeReason,
      nudge_message: decision.nudgeMessage,
      delivered_at: new Date().toISOString(),
      user_action: 'pending'
    })

  if (error) {
    console.error('Error logging breathing nudge attempt:', error)
    throw error
  }

  console.log(`Breathing nudge logged for user ${userId}: ${decision.nudgeReason}`)
}

async function sendNudgeToClient(supabaseClient: any, userId: string, decision: NudgeDecision) {
  console.log(`[PLACEHOLDER] Sending breathing nudge to user ${userId}:`)
  console.log(`Type: ${decision.nudgeType}`)
  console.log(`Reason: ${decision.nudgeReason}`)
  console.log(`Message: ${decision.nudgeMessage}`)

  // Create a user notification
  const { error } = await supabaseClient
    .from('user_notifications')
    .insert({
      user_id: userId,
      type: 'breathing_nudge',
      title: decision.nudgeType === 'ai_coach' ? 'AI Coach Suggestion' : 'Breathing Reminder',
      message: decision.nudgeMessage,
      data: {
        nudge_type: decision.nudgeType,
        nudge_reason: decision.nudgeReason
      }
    })

  if (error) {
    console.error('Error creating breathing nudge notification:', error)
  }
}
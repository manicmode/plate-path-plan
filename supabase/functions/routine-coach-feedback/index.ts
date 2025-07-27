import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { routineName, duration, categories, completedSteps, skippedSteps } = await req.json()
    
    console.log('Generating AI coach feedback for:', {
      routineName,
      duration,
      categories,
      completedSteps: completedSteps?.length,
      skippedSteps: skippedSteps?.length
    })

    // Generate contextual feedback based on workout
    const feedback = generateCoachFeedback({
      routineName,
      duration,
      categories,
      completedSteps,
      skippedSteps
    })

    return new Response(
      JSON.stringify({ feedback }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Error generating coach feedback:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})

function generateCoachFeedback({ routineName, duration, categories, completedSteps, skippedSteps }) {
  const totalSteps = (completedSteps?.length || 0) + (skippedSteps?.length || 0)
  const completionRate = totalSteps > 0 ? (completedSteps?.length || 0) / totalSteps : 1
  
  // Base messages
  const baseMessages = [
    "Amazing job finishing today's {routine}! Your consistency is paying off 💪",
    "Fantastic work on completing {routine}! You're building incredible momentum 🔥",
    "Outstanding effort on today's {routine}! Every rep counts toward your goals 🚀",
    "Incredible dedication finishing {routine}! You're stronger than yesterday 💯",
    "Phenomenal work on {routine}! Your commitment is truly inspiring ⭐"
  ]

  // Duration-based additions
  let durationFeedback = ""
  if (duration >= 45) {
    durationFeedback = " That {duration}-minute session shows serious dedication!"
  } else if (duration >= 20) {
    durationFeedback = " {duration} minutes of focused training - perfect!"
  }

  // Category-specific additions
  let categoryFeedback = ""
  if (categories?.includes('HIIT')) {
    categoryFeedback = " HIIT workouts like this are amazing for building both strength and endurance."
  } else if (categories?.includes('strength')) {
    categoryFeedback = " Strength training is the foundation of all fitness - keep building that power!"
  } else if (categories?.includes('cardio')) {
    categoryFeedback = " Cardio sessions like this are fantastic for your heart and overall health."
  } else if (categories?.includes('yoga')) {
    categoryFeedback = " Yoga combines strength, flexibility, and mindfulness beautifully."
  }

  // Completion-based feedback
  let completionFeedback = ""
  if (completionRate === 1) {
    completionFeedback = " Completing every single step shows your incredible determination!"
  } else if (completionRate >= 0.8) {
    completionFeedback = " You powered through almost everything - that's what champions do!"
  } else if (skippedSteps?.length > 0) {
    completionFeedback = " Even with some modifications, you showed up and did the work - that's what matters most!"
  }

  // Pick random base message and combine
  const baseMessage = baseMessages[Math.floor(Math.random() * baseMessages.length)]
  const routineDisplay = routineName?.toLowerCase() || "workout"
  
  let finalMessage = baseMessage.replace('{routine}', routineDisplay)
  
  if (durationFeedback) {
    finalMessage += durationFeedback.replace('{duration}', duration?.toString() || '')
  }
  
  finalMessage += categoryFeedback + completionFeedback

  return finalMessage
}
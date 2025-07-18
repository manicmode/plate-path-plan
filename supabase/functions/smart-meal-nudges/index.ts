import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface MealScore {
  id: string
  score: number
  created_at: string
  meal_id: string | null
}

interface NudgeResponse {
  type: 'warning' | 'praise' | 'weekly_report'
  message: string
  average_score?: number
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      console.error('Authentication error:', userError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Processing smart meal nudges for user:', user.id)

    // Calculate date 7 days ago
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const sevenDaysAgoISO = sevenDaysAgo.toISOString()

    // Fetch user's meal scores from the past 7 days
    const { data: mealScores, error: scoresError } = await supabaseClient
      .from('meal_scores')
      .select('id, score, created_at, meal_id')
      .eq('user_id', user.id)
      .gte('created_at', sevenDaysAgoISO)
      .order('created_at', { ascending: true })

    if (scoresError) {
      console.error('Error fetching meal scores:', scoresError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch meal scores' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`Found ${mealScores?.length || 0} meal scores in the past 7 days`)

    if (!mealScores || mealScores.length === 0) {
      return new Response(
        JSON.stringify({ 
          type: 'info', 
          message: 'Start logging meals to see your progress insights!' 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check if today is Sunday for weekly report
    const today = new Date()
    const isSunday = today.getDay() === 0

    if (isSunday && mealScores.length >= 3) {
      // Calculate weekly average
      const totalScore = mealScores.reduce((sum, meal) => sum + meal.score, 0)
      const averageScore = Math.round(totalScore / mealScores.length)
      
      let weeklyMessage = `Weekly average: ${averageScore}`
      if (averageScore >= 85) {
        weeklyMessage += ' – Amazing work! 🌟'
      } else if (averageScore >= 70) {
        weeklyMessage += ' – Good progress this week! 👍'
      } else {
        weeklyMessage += ' – Let\'s improve together next week! 💪'
      }

      const response: NudgeResponse = {
        type: 'weekly_report',
        message: weeklyMessage,
        average_score: averageScore
      }

      return new Response(
        JSON.stringify(response),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Analyze consecutive patterns (need at least 3 recent meals)
    if (mealScores.length >= 3) {
      // Get the last 3 meals to check for consecutive patterns
      const recentMeals = mealScores.slice(-3)
      
      // Check for 3 consecutive red meals (score < 70)
      const allRed = recentMeals.every(meal => meal.score < 70)
      if (allRed) {
        const response: NudgeResponse = {
          type: 'warning',
          message: 'You\'ve had a few rough meals lately – time to bounce back! 💪'
        }

        return new Response(
          JSON.stringify(response),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Check for 3 consecutive green meals (score >= 85)
      const allGreen = recentMeals.every(meal => meal.score >= 85)
      if (allGreen) {
        const response: NudgeResponse = {
          type: 'praise',
          message: 'You\'re on fire this week! Keep it up 🔥🔥🔥'
        }

        return new Response(
          JSON.stringify(response),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
    }

    // If no specific patterns detected, return a general encouragement
    const totalScore = mealScores.reduce((sum, meal) => sum + meal.score, 0)
    const averageScore = Math.round(totalScore / mealScores.length)
    
    let generalMessage = 'Keep tracking your meals for better insights! 📊'
    if (averageScore >= 80) {
      generalMessage = 'You\'re doing great with your nutrition! 🌟'
    } else if (averageScore >= 65) {
      generalMessage = 'Making steady progress with your meals! 👍'
    }

    return new Response(
      JSON.stringify({ 
        type: 'info', 
        message: generalMessage,
        average_score: averageScore
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in smart-meal-nudges function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
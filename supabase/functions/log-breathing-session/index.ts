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

    const { userId } = await req.json()
    
    if (!userId) {
      throw new Error('User ID is required')
    }

    console.log(`Logging breathing session for user: ${userId}`)

    // Get or create breathing streak record
    const { data: existingStreak, error: fetchError } = await supabaseClient
      .from('breathing_streaks')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (fetchError) {
      console.error('Error fetching breathing streak:', fetchError)
      throw fetchError
    }

    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD format
    console.log(`Processing breathing session for date: ${today}`)

    let updatedStreak

    if (!existingStreak) {
      // Create new streak record
      console.log('Creating new breathing streak record')
      const { data, error } = await supabaseClient
        .from('breathing_streaks')
        .insert({
          user_id: userId,
          total_sessions: 1,
          current_streak: 1,
          longest_streak: 1,
          last_completed_date: today
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating breathing streak:', error)
        throw error
      }

      updatedStreak = data
      console.log('Created new breathing streak:', updatedStreak)
    } else {
      // Update existing streak record
      console.log('Updating existing breathing streak:', existingStreak)
      
      const lastCompletedDate = existingStreak.last_completed_date
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().split('T')[0]

      let newCurrentStreak = existingStreak.current_streak
      let shouldUpdateToday = true

      // Check if already completed today
      if (lastCompletedDate === today) {
        console.log('Session already completed today, no update needed')
        shouldUpdateToday = false
      } else if (lastCompletedDate === yesterdayStr) {
        // Continue streak (yesterday was last completion)
        newCurrentStreak = existingStreak.current_streak + 1
        console.log(`Continuing streak: ${existingStreak.current_streak} -> ${newCurrentStreak}`)
      } else {
        // Reset streak (gap detected)
        newCurrentStreak = 1
        console.log(`Resetting streak due to gap. Last: ${lastCompletedDate}, Today: ${today}`)
      }

      if (shouldUpdateToday) {
        const newLongestStreak = Math.max(existingStreak.longest_streak, newCurrentStreak)
        
        const { data, error } = await supabaseClient
          .from('breathing_streaks')
          .update({
            total_sessions: existingStreak.total_sessions + 1,
            current_streak: newCurrentStreak,
            longest_streak: newLongestStreak,
            last_completed_date: today,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)
          .select()
          .single()

        if (error) {
          console.error('Error updating breathing streak:', error)
          throw error
        }

        updatedStreak = data
        console.log('Updated breathing streak:', updatedStreak)
      } else {
        updatedStreak = existingStreak
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        streak: updatedStreak,
        message: existingStreak?.last_completed_date === today 
          ? 'Session already completed today' 
          : 'Breathing session logged successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in log-breathing-session:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
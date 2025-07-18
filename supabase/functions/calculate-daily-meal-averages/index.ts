import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DailyMealAverage {
  date: string
  average_score: number
}

export default async function handler(req: Request) {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Create Supabase client
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
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()

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

    console.log('Calculating daily meal averages for user:', user.id)

    // Query meal scores and calculate daily averages
    const { data: mealScores, error: queryError } = await supabaseClient
      .from('meal_scores')
      .select('score, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (queryError) {
      console.error('Database query error:', queryError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch meal scores' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Group scores by date and calculate averages
    const dailyAverages = new Map<string, { total: number; count: number }>()

    mealScores?.forEach(score => {
      const date = new Date(score.created_at).toISOString().split('T')[0] // Get YYYY-MM-DD format
      
      if (!dailyAverages.has(date)) {
        dailyAverages.set(date, { total: 0, count: 0 })
      }
      
      const dayData = dailyAverages.get(date)!
      dayData.total += Number(score.score)
      dayData.count += 1
    })

    // Convert to the desired format and calculate averages
    const results: DailyMealAverage[] = Array.from(dailyAverages.entries())
      .map(([date, data]) => ({
        date,
        average_score: Math.round(data.total / data.count)
      }))
      .sort((a, b) => b.date.localeCompare(a.date)) // Sort by date descending (most recent first)

    console.log(`Calculated averages for ${results.length} days`)

    return new Response(
      JSON.stringify({
        success: true,
        data: results,
        total_days: results.length
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}
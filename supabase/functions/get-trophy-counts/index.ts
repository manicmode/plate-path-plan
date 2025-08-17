import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Database {
  public: {
    Tables: {
      arena_monthly_winners: {
        Row: {
          id: number
          season_month: string
          user_id: string
          rank: number
          score: number
          trophy_level: 'gold' | 'silver' | 'bronze'
          created_at: string
        }
      }
    }
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient<Database>(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const url = new URL(req.url)
    const userId = url.searchParams.get('user_id')

    if (req.method === 'GET') {
      if (userId) {
        // Get trophy counts for a specific user
        const { data: trophies, error } = await supabaseClient
          .from('arena_monthly_winners')
          .select('trophy_level, season_month')
          .eq('user_id', userId)
          .order('season_month', { ascending: false })

        if (error) {
          console.error('Error fetching user trophies:', error)
          return new Response(
            JSON.stringify({ error: 'Failed to fetch user trophies' }),
            { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }

        // Count trophies by type
        const trophyCounts = {
          gold: trophies?.filter(t => t.trophy_level === 'gold').length || 0,
          silver: trophies?.filter(t => t.trophy_level === 'silver').length || 0,
          bronze: trophies?.filter(t => t.trophy_level === 'bronze').length || 0,
          total: trophies?.length || 0,
          recent: trophies?.slice(0, 5) || [] // Last 5 trophies
        }

        console.log(`User ${userId} trophy counts:`, trophyCounts)

        return new Response(
          JSON.stringify({ success: true, trophies: trophyCounts }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      } else {
        // Get overall trophy statistics
        const { data: allTrophies, error } = await supabaseClient
          .from('arena_monthly_winners')
          .select('trophy_level, season_month, user_id')
          .order('season_month', { ascending: false })

        if (error) {
          console.error('Error fetching all trophies:', error)
          return new Response(
            JSON.stringify({ error: 'Failed to fetch trophy statistics' }),
            { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }

        // Calculate overall statistics
        const stats = {
          totalTrophies: allTrophies?.length || 0,
          goldCount: allTrophies?.filter(t => t.trophy_level === 'gold').length || 0,
          silverCount: allTrophies?.filter(t => t.trophy_level === 'silver').length || 0,
          bronzeCount: allTrophies?.filter(t => t.trophy_level === 'bronze').length || 0,
          uniqueWinners: new Set(allTrophies?.map(t => t.user_id)).size,
          monthsWithTrophies: new Set(allTrophies?.map(t => t.season_month)).size,
          recentMonths: [...new Set(allTrophies?.map(t => t.season_month))].slice(0, 6)
        }

        console.log('Arena trophy statistics:', stats)

        return new Response(
          JSON.stringify({ success: true, stats }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
    }

    // Handle manual trophy closure (for testing/admin)
    if (req.method === 'POST') {
      const { action } = await req.json()
      
      if (action === 'close_previous_month') {
        console.log('Manually triggering arena_close_previous_month()')
        
        const { error } = await supabaseClient.rpc('arena_close_previous_month')
        
        if (error) {
          console.error('Error closing previous month:', error)
          return new Response(
            JSON.stringify({ error: 'Failed to close previous month' }),
            { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }

        console.log('Successfully closed previous month and awarded trophies')

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Previous month closed and trophies awarded' 
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
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
})
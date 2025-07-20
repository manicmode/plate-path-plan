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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const currentYear = new Date().getFullYear()
    console.log(`Processing Hall of Fame for year: ${currentYear}`)

    // Call the database function to process yearly hall of fame
    const { data, error } = await supabase.rpc('process_yearly_hall_of_fame', {
      target_year: currentYear
    })

    if (error) {
      console.error('Error processing hall of fame:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to process hall of fame', details: error }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Hall of Fame processing completed:', data)

    return new Response(
      JSON.stringify({ 
        success: true, 
        year: currentYear,
        results: data,
        message: `Processed ${data.groups_processed} groups and crowned ${data.winners.length} champions`
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
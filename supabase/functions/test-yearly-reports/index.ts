import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2'

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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { year = new Date().getFullYear() } = await req.json().catch(() => ({}));

    console.log(`Testing yearly exercise report generation for year: ${year}`);

    // Call the generate-yearly-exercise-reports function
    const { data, error } = await supabaseClient.functions.invoke('generate-yearly-exercise-reports', {
      body: { manual_trigger: true, target_year: year }
    });

    if (error) {
      console.error('Error calling generate function:', error);
      throw error;
    }

    console.log('Function response:', data);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Test completed for year ${year}`,
        function_response: data
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in test-yearly-reports function:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        success: false
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
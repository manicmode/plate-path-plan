import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting habit seeding process...');

    // Read the habit library JSON file
    const habitLibraryPath = './supabase/seed/habit_library.json';
    let habitLibraryData;
    
    try {
      const habitLibraryText = await Deno.readTextFile(habitLibraryPath);
      habitLibraryData = JSON.parse(habitLibraryText);
    } catch (error) {
      console.error('Failed to read habit library file:', error);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to read habit library file', 
          details: error.message 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate array structure
    if (!Array.isArray(habitLibraryData)) {
      return new Response(
        JSON.stringify({ error: 'Habit library data must be an array' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate required fields for each habit
    const requiredFields = ['slug', 'name', 'domain', 'goal_type'];
    for (let i = 0; i < habitLibraryData.length; i++) {
      const habit = habitLibraryData[i];
      for (const field of requiredFields) {
        if (!habit[field]) {
          return new Response(
            JSON.stringify({ 
              error: `Missing required field '${field}' in habit at index ${i}`,
              slug: habit.slug || 'unknown'
            }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
      }
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`Upserting ${habitLibraryData.length} habits...`);

    // Call the upsert function
    const { data, error } = await supabase.rpc('habit_template_upsert_many', {
      payloads: habitLibraryData
    });

    if (error) {
      console.error('Upsert failed:', error);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to upsert habits', 
          details: error.message 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Successfully upserted ${data} habits`);

    return new Response(
      JSON.stringify({ 
        success: true,
        inserted: data,
        message: `Successfully upserted ${data} habit templates`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
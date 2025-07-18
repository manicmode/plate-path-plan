import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface YearlyScoreData {
  user_id: string;
  username: string;
  display_name: string;
  yearly_score: number;
  monthly_trophies: number;
  avg_nutrition_streak: number;
  avg_hydration_streak: number;
  avg_supplement_streak: number;
  total_active_days: number;
  total_messages: number;
  rank_position: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log('🚀 Starting yearly scores preview update...');

    const currentYear = new Date().getFullYear();
    const yearsToUpdate = [currentYear, currentYear - 1]; // Current and previous year
    
    let totalUpdated = 0;
    let errors: string[] = [];

    for (const year of yearsToUpdate) {
      console.log(`📊 Processing year: ${year}`);
      
      try {
        // Get current yearly scores using the function
        const { data: yearlyData, error: functionError } = await supabase
          .rpc('get_top_100_yearly_users', { target_year: year });

        if (functionError) {
          console.error(`❌ Error calling function for year ${year}:`, functionError);
          errors.push(`Year ${year}: ${functionError.message}`);
          continue;
        }

        if (!yearlyData || yearlyData.length === 0) {
          console.log(`ℹ️ No data found for year ${year}`);
          continue;
        }

        console.log(`📈 Found ${yearlyData.length} users for year ${year}`);

        // Transform data to include year and timestamp
        const previewData = yearlyData.map((user: YearlyScoreData) => ({
          user_id: user.user_id,
          username: user.username,
          display_name: user.display_name,
          year: year,
          yearly_score: user.yearly_score,
          monthly_trophies: user.monthly_trophies,
          avg_nutrition_streak: user.avg_nutrition_streak,
          avg_hydration_streak: user.avg_hydration_streak,
          avg_supplement_streak: user.avg_supplement_streak,
          total_active_days: user.total_active_days,
          total_messages: user.total_messages,
          rank_position: user.rank_position,
          last_updated: new Date().toISOString(),
        }));

        // Delete existing preview data for this year
        const { error: deleteError } = await supabase
          .from('yearly_score_preview')
          .delete()
          .eq('year', year);

        if (deleteError) {
          console.error(`❌ Error deleting existing data for year ${year}:`, deleteError);
          errors.push(`Delete error for year ${year}: ${deleteError.message}`);
          continue;
        }

        // Insert new preview data in batches to avoid size limits
        const batchSize = 50;
        let batchUpdated = 0;
        
        for (let i = 0; i < previewData.length; i += batchSize) {
          const batch = previewData.slice(i, i + batchSize);
          
          const { error: insertError } = await supabase
            .from('yearly_score_preview')
            .insert(batch);

          if (insertError) {
            console.error(`❌ Error inserting batch for year ${year}:`, insertError);
            errors.push(`Insert error for year ${year}, batch ${Math.floor(i/batchSize) + 1}: ${insertError.message}`);
            continue;
          }

          batchUpdated += batch.length;
          console.log(`✅ Inserted batch ${Math.floor(i/batchSize) + 1} for year ${year}: ${batch.length} records`);
        }

        totalUpdated += batchUpdated;
        console.log(`🎉 Successfully updated ${batchUpdated} records for year ${year}`);

      } catch (error) {
        console.error(`💥 Unexpected error processing year ${year}:`, error);
        errors.push(`Unexpected error for year ${year}: ${error.message}`);
      }
    }

    // Log summary
    console.log(`📋 Update Summary:`);
    console.log(`  - Total records updated: ${totalUpdated}`);
    console.log(`  - Years processed: ${yearsToUpdate.join(', ')}`);
    console.log(`  - Errors: ${errors.length}`);
    
    if (errors.length > 0) {
      console.error('❌ Errors encountered:', errors);
    }

    // Prepare response
    const response = {
      success: true,
      message: `Updated ${totalUpdated} yearly score preview records`,
      details: {
        totalUpdated,
        yearsProcessed: yearsToUpdate,
        errors: errors.length > 0 ? errors : undefined,
        timestamp: new Date().toISOString()
      }
    };

    console.log('🏁 Yearly scores preview update completed');

    return new Response(
      JSON.stringify(response),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
        status: errors.length > 0 ? 206 : 200 // 206 Partial Content if errors
      }
    );

  } catch (error) {
    console.error('💥 Fatal error in yearly scores update:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
        status: 500
      }
    );
  }
});
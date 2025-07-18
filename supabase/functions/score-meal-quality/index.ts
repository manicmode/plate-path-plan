import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScoreMealRequest {
  meal_id: string;
}

Deno.serve(async (req) => {
  console.log('Score meal quality function called');

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user from auth header
    const authHeader = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader);
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User authenticated:', user.id);

    // Parse request body
    const { meal_id }: ScoreMealRequest = await req.json();
    if (!meal_id) {
      return new Response(
        JSON.stringify({ error: 'meal_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Scoring meal:', meal_id);

    // Fetch meal log from nutrition_logs
    const { data: mealData, error: mealError } = await supabase
      .from('nutrition_logs')
      .select('*')
      .eq('id', meal_id)
      .eq('user_id', user.id)
      .single();

    if (mealError || !mealData) {
      console.error('Error fetching meal:', mealError);
      return new Response(
        JSON.stringify({ error: 'Meal not found or access denied' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Meal data found:', mealData.food_name);

    // Check if score already exists
    const { data: existingScore } = await supabase
      .from('meal_scores')
      .select('*')
      .eq('meal_id', meal_id)
      .eq('user_id', user.id)
      .single();

    if (existingScore) {
      console.log('Score already exists, returning existing score');
      return new Response(
        JSON.stringify({
          score: existingScore.score,
          rating_text: existingScore.rating_text,
          meal_id: meal_id,
          already_existed: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Analyze meal quality and calculate score
    let score = 100; // Start with perfect score
    const penalties: string[] = [];

    // Check existing quality_score if available
    if (mealData.quality_score !== null && mealData.quality_score !== undefined) {
      score = Math.max(0, Math.min(100, mealData.quality_score));
      console.log('Using existing quality_score:', score);
    } else {
      // Calculate score based on available data
      console.log('Calculating score from meal analysis');

      // Processing level penalties
      if (mealData.processing_level) {
        switch (mealData.processing_level.toLowerCase()) {
          case 'ultra-processed':
            score -= 40;
            penalties.push('Ultra-processed food');
            break;
          case 'highly processed':
            score -= 30;
            penalties.push('Highly processed food');
            break;
          case 'processed':
            score -= 15;
            penalties.push('Processed food');
            break;
        }
      }

      // Analyze ingredient_analysis for flags
      if (mealData.ingredient_analysis) {
        const analysis = typeof mealData.ingredient_analysis === 'string' 
          ? JSON.parse(mealData.ingredient_analysis) 
          : mealData.ingredient_analysis;

        // Check for various health flags
        if (analysis.artificial_sweeteners || analysis.contains_artificial_sweeteners) {
          score -= 15;
          penalties.push('Contains artificial sweeteners');
        }

        if (analysis.high_sugar || analysis.excessive_sugar) {
          score -= 20;
          penalties.push('High sugar content');
        }

        if (analysis.high_sodium || analysis.excessive_sodium) {
          score -= 15;
          penalties.push('High sodium content');
        }

        if (analysis.trans_fats || analysis.contains_trans_fats) {
          score -= 25;
          penalties.push('Contains trans fats');
        }

        if (analysis.artificial_colors || analysis.contains_artificial_colors) {
          score -= 10;
          penalties.push('Contains artificial colors');
        }

        if (analysis.preservatives || analysis.contains_preservatives) {
          score -= 10;
          penalties.push('Contains preservatives');
        }

        if (analysis.gmo || analysis.contains_gmo) {
          score -= 10;
          penalties.push('Contains GMO ingredients');
        }

        // Check flagged ingredients array
        if (analysis.flagged_ingredients && Array.isArray(analysis.flagged_ingredients)) {
          score -= analysis.flagged_ingredients.length * 5;
          penalties.push(`${analysis.flagged_ingredients.length} flagged ingredients`);
        }
      }

      // Check quality_reasons for additional penalties
      if (mealData.quality_reasons && Array.isArray(mealData.quality_reasons)) {
        score -= mealData.quality_reasons.length * 8;
        penalties.push(...mealData.quality_reasons);
      }

      // Ensure score stays within bounds
      score = Math.max(0, Math.min(100, score));
    }

    // Determine rating text based on score
    let rating_text: string;
    if (score >= 80) {
      rating_text = 'Excellent';
    } else if (score >= 50) {
      rating_text = 'Average';
    } else {
      rating_text = 'Poor';
    }

    console.log('Calculated score:', score, 'Rating:', rating_text);
    console.log('Penalties applied:', penalties);

    // Insert score into meal_scores table
    const { data: scoreData, error: scoreError } = await supabase
      .from('meal_scores')
      .insert({
        user_id: user.id,
        meal_id: meal_id,
        score: score,
        rating_text: rating_text
      })
      .select()
      .single();

    if (scoreError) {
      console.error('Error inserting meal score:', scoreError);
      return new Response(
        JSON.stringify({ error: 'Failed to save meal score' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Meal score saved successfully');

    return new Response(
      JSON.stringify({
        score: score,
        rating_text: rating_text,
        meal_id: meal_id,
        penalties: penalties,
        created_at: scoreData.created_at
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
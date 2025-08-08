import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('🔍 gpt-nutrition-estimator function started at:', new Date().toISOString());
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      console.error('🚨 No authorization header');
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.error('🚨 Authentication failed:', userError);
      return new Response(JSON.stringify({ error: 'Authentication failed' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('🔍 Authenticated user:', user.id);

    const { foodName, amountPercentage = 100, mealType } = await req.json();
    console.log('🔍 Request params:', { foodName, amountPercentage, mealType });

    if (!foodName || typeof foodName !== 'string') {
      console.error('🚨 Invalid or missing foodName');
      return new Response(JSON.stringify({ error: 'Food name is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Call OpenAI to estimate nutrition
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      console.error('🚨 OpenAI API key not configured');
      return new Response(JSON.stringify({ error: 'OpenAI API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const prompt = `Estimate the nutritional information for "${foodName}" at ${amountPercentage}% of a standard serving size.
    
Return ONLY a valid JSON object with this exact structure (no markdown, no explanation):
{
  "calories": number,
  "protein": number (grams),
  "carbs": number (grams),
  "fat": number (grams),
  "fiber": number (grams),
  "sugar": number (grams),
  "sodium": number (milligrams),
  "saturated_fat": number (grams),
  "confidence": number (1-100, where 100 is most confident)
}

Base the estimate on a typical serving size, then adjust by the ${amountPercentage}% factor. Be conservative with estimates if unsure.`;

    console.log('🔍 Making OpenAI API call...');
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a nutrition expert. Provide accurate nutritional estimates based on standard food databases like USDA. Return only valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 300,
        temperature: 0.1,
      }),
    });

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error('🚨 OpenAI API error:', openAIResponse.status, errorText);
      throw new Error(`OpenAI API error: ${openAIResponse.status}`);
    }

    const openAIData = await openAIResponse.json();
    console.log('🔍 OpenAI response received');

    if (!openAIData.choices || !openAIData.choices[0] || !openAIData.choices[0].message) {
      throw new Error('Invalid OpenAI response structure');
    }

    const nutritionText = openAIData.choices[0].message.content.trim();
    console.log('🔍 Raw nutrition text:', nutritionText);

    // Parse the JSON response
    let nutrition;
    try {
      // Remove any markdown formatting if present
      const cleanJson = nutritionText.replace(/```json\n?|\n?```/g, '').trim();
      nutrition = JSON.parse(cleanJson);
    } catch (parseError) {
      console.error('🚨 Failed to parse nutrition JSON:', parseError, nutritionText);
      throw new Error('Failed to parse nutrition data from AI response');
    }

    // Validate required fields
    const requiredFields = ['calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'sodium', 'saturated_fat', 'confidence'];
    for (const field of requiredFields) {
      if (typeof nutrition[field] !== 'number') {
        console.error(`🚨 Missing or invalid field: ${field}`, nutrition);
        throw new Error(`Invalid nutrition data: missing ${field}`);
      }
    }

    // Ensure values are reasonable
    if (nutrition.calories < 0 || nutrition.calories > 5000) {
      throw new Error(`Unreasonable calorie estimate: ${nutrition.calories}`);
    }

    console.log('✅ Successfully estimated nutrition:', {
      foodName,
      amountPercentage,
      calories: nutrition.calories,
      confidence: nutrition.confidence
    });

    return new Response(JSON.stringify({
      nutrition,
      foodName,
      amountPercentage,
      mealType
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('🚨 Critical error in gpt-nutrition-estimator:', error);
    return new Response(JSON.stringify({
      error: 'Nutrition estimation failed',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
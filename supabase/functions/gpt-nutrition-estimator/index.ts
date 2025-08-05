import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { foodName, amountPercentage = 100, mealType } = await req.json();

    if (!foodName?.trim()) {
      return new Response(
        JSON.stringify({ error: 'Food name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🧠 [GPT Nutrition] Estimating nutrition for: "${foodName}" at ${amountPercentage}%`);

    const systemPrompt = `You are a nutrition expert. Estimate nutrition facts for food items with high accuracy.

RULES:
- Return ONLY valid JSON, no explanations
- All values must be numbers (integers or decimals)
- Base estimates on a standard serving size, then adjust for the percentage
- Confidence should be 70-95 (higher for common foods, lower for complex dishes)
- If food name is vague, make reasonable assumptions

Required JSON format:
{
  "calories": <number>,
  "protein": <number>,
  "carbs": <number>, 
  "fat": <number>,
  "fiber": <number>,
  "sugar": <number>,
  "sodium": <number>,
  "saturated_fat": <number>,
  "confidence": <number 70-95>
}`;

    const userPrompt = `Food: "${foodName}"
Amount: ${amountPercentage}% of typical serving
${mealType ? `Meal type: ${mealType}` : ''}

Estimate nutrition facts and return JSON only.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o', // Use GPT-4 for nutrition estimation as requested
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const nutritionData = data.choices[0].message.content;

    console.log(`✅ [GPT Nutrition] Raw response: ${nutritionData}`);

    // Parse and validate JSON
    let parsedNutrition;
    try {
      parsedNutrition = JSON.parse(nutritionData);
    } catch (parseError) {
      console.error('❌ [GPT Nutrition] Failed to parse JSON:', parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid nutrition data format' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Ensure all required fields are present and valid
    const requiredFields = ['calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'sodium', 'saturated_fat', 'confidence'];
    for (const field of requiredFields) {
      if (typeof parsedNutrition[field] !== 'number') {
        parsedNutrition[field] = 0;
      }
    }

    // Round nutrition values for database compatibility
    const sanitizedNutrition = {
      calories: Math.round(parsedNutrition.calories),
      protein: Math.round(parsedNutrition.protein * 10) / 10, // 1 decimal place
      carbs: Math.round(parsedNutrition.carbs * 10) / 10,
      fat: Math.round(parsedNutrition.fat * 10) / 10,
      fiber: Math.round(parsedNutrition.fiber * 10) / 10,
      sugar: Math.round(parsedNutrition.sugar * 10) / 10,
      sodium: Math.round(parsedNutrition.sodium),
      saturated_fat: Math.round(parsedNutrition.saturated_fat * 10) / 10,
      confidence: Math.round(parsedNutrition.confidence)
    };

    console.log(`✅ [GPT Nutrition] Estimation complete:`, sanitizedNutrition);

    return new Response(
      JSON.stringify({
        nutrition: sanitizedNutrition,
        foodName: foodName.trim(),
        amountPercentage,
        mealType: mealType || null
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ [GPT Nutrition] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to estimate nutrition' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
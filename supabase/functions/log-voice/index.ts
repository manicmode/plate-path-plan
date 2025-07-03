
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text } = await req.json();
    
    if (!text) {
      throw new Error('No text provided');
    }

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    // Process the voice input with OpenAI to extract nutritional information
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a nutrition expert. When a user describes food they ate, extract and estimate the nutritional information. 

IMPORTANT: Respond with valid JSON in this exact format:
{
  "foodItems": [
    {
      "name": "food name",
      "calories": number,
      "protein": number,
      "carbs": number,
      "fat": number,
      "fiber": number,
      "sugar": number,
      "sodium": number,
      "confidence": number (0-100),
      "serving": "serving description"
    }
  ],
  "analysis": "brief analysis text"
}

Be specific with numbers and provide realistic estimates. If multiple foods are mentioned, include them as separate items in the foodItems array.`
          },
          {
            role: 'user',
            content: `The user said: "${text}". Please analyze this food input and provide nutritional estimates in the required JSON format.`
          }
        ],
        max_tokens: 600,
        temperature: 0.3
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content || '';

    // Try to parse the JSON response
    let structuredData;
    try {
      structuredData = JSON.parse(aiResponse);
    } catch (parseError) {
      // Fallback if AI doesn't return valid JSON
      console.error('Failed to parse AI response as JSON:', parseError);
      structuredData = {
        foodItems: [{
          name: text.split(' ').slice(0, 3).join(' ') || 'Food Item',
          calories: 150,
          protein: 5,
          carbs: 20,
          fat: 3,
          fiber: 2,
          sugar: 8,
          sodium: 100,
          confidence: 70,
          serving: 'Estimated portion'
        }],
        analysis: 'Could not parse detailed nutrition information, using estimated values.'
      };
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        data: structuredData,
        originalText: text
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Error in log-voice function:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});

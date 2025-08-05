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
    const { imageBase64, prompt } = await req.json();
    
    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: 'Missing imageBase64 parameter' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    
    if (!openAIApiKey) {
      console.log('OpenAI API key not configured - skipping GPT-4 Vision detection');
      return new Response(
        JSON.stringify({ foodItems: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Calling GPT-4 Vision API...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt || 'You are a food recognition assistant. Look at this image and return only a list of food items that are clearly visible in the photo. Respond only with the food names as a plain JSON array.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`
                }
              }
            ]
          }
        ],
        max_tokens: 300,
        temperature: 0.1
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'OpenAI API request failed', details: errorText }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: response.status }
      );
    }

    const data = await response.json();
    console.log('OpenAI API response:', data);

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('Invalid OpenAI response structure');
      return new Response(
        JSON.stringify({ foodItems: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const content = data.choices[0].message.content;
    console.log('GPT-4 Vision raw response:', content);

    // Parse the JSON array from the response
    let foodItems: string[] = [];
    try {
      // Try to extract JSON array from the response
      const jsonMatch = content.match(/\[.*\]/s);
      if (jsonMatch) {
        foodItems = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback: split by commas and clean up
        foodItems = content
          .split(/[,\n]/)
          .map((item: string) => item.trim().replace(/["\[\]]/g, ''))
          .filter((item: string) => item.length > 0 && !item.match(/^(and|or|the|a|an)$/i));
      }
    } catch (parseError) {
      console.error('Failed to parse GPT-4 Vision response as JSON:', parseError);
      // Fallback parsing
      foodItems = content
        .split(/[,\n]/)
        .map((item: string) => item.trim().replace(/["\[\]]/g, ''))
        .filter((item: string) => item.length > 0 && !item.match(/^(and|or|the|a|an)$/i));
    }

    console.log('Parsed food items:', foodItems);

    return new Response(
      JSON.stringify({ foodItems }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in GPT-4 Vision food detector:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
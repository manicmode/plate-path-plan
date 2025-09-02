import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { image_base64 } = await req.json();
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    
    if (!openAIApiKey) {
      throw new Error('Missing OPENAI_API_KEY');
    }

    // Sanitize base64 input
    const content = (image_base64 || "").split(",").pop();
    if (!content) {
      throw new Error('Invalid image data');
    }

    console.info('[GPT-FALLBACK] Starting food detection...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
            content: 'You are a food identification assistant. Analyze the image and return ONLY the names of food items you can clearly identify. Return as a JSON array of strings. Do not include plates, utensils, or non-food items. Be specific (e.g., "grilled salmon" not just "fish").'
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'What food items can you identify in this image? Return only a JSON array of food names.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${content}`,
                  detail: 'low'
                }
              }
            ]
          }
        ],
        max_tokens: 200,
        temperature: 0.1
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('[GPT-FALLBACK] OpenAI API error:', data);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    let foodNames: string[] = [];
    
    try {
      const content = data.choices[0].message.content.trim();
      // Try to parse as JSON array
      foodNames = JSON.parse(content);
      
      if (!Array.isArray(foodNames)) {
        throw new Error('Response is not an array');
      }
      
      // Filter and clean the names
      foodNames = foodNames
        .filter(name => typeof name === 'string' && name.trim().length > 0)
        .map(name => name.trim().toLowerCase())
        .slice(0, 8); // Limit to 8 items max
        
    } catch (parseError) {
      console.warn('[GPT-FALLBACK] Failed to parse JSON, attempting text extraction');
      
      // Fallback: extract food-like words from plain text response
      const content = data.choices[0].message.content.toLowerCase();
      const foodKeywords = [
        'salmon', 'chicken', 'beef', 'pork', 'fish', 'shrimp', 'tuna',
        'rice', 'pasta', 'noodles', 'bread', 'potato', 'quinoa',
        'broccoli', 'asparagus', 'carrot', 'tomato', 'lettuce', 'spinach',
        'apple', 'banana', 'orange', 'lemon', 'avocado', 'egg'
      ];
      
      foodNames = foodKeywords.filter(keyword => content.includes(keyword));
    }

    console.info('[GPT-FALLBACK] Detected foods:', foodNames);

    return new Response(JSON.stringify({
      names: foodNames,
      model: 'gpt-4o-mini'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[GPT-FALLBACK] Error:', error);
    return new Response(JSON.stringify({ 
      error: String(error),
      names: []
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
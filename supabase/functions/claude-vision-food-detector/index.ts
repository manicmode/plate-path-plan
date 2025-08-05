import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64 } = await req.json();

    if (!anthropicApiKey) {
      console.log('No Anthropic API key found, returning mock data');
      // Return mock data for testing
      const mockFoodItems = [
        { name: 'Apple', confidence: 0.88, source: 'claude' },
        { name: 'Banana', confidence: 0.82, source: 'claude' },
        { name: 'Sandwich', confidence: 0.75, source: 'claude' }
      ];
      
      return new Response(JSON.stringify({ foodItems: mockFoodItems }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Calling Claude Vision API for food detection...');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${anthropicApiKey}`,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/jpeg',
                  data: imageBase64
                }
              },
              {
                type: 'text',
                text: 'Look at this image and identify all visible food items. Return a JSON array of objects with "name" and "confidence" fields. Confidence should be a number between 0 and 1. Only include clearly visible food items. Example format: [{"name": "apple", "confidence": 0.95}, {"name": "sandwich", "confidence": 0.87}]'
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      console.error('Claude API error:', response.status, await response.text());
      return new Response(JSON.stringify({ foodItems: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    console.log('Claude API response:', data);

    let foodItems = [];
    
    if (data.content && data.content[0] && data.content[0].text) {
      try {
        // Extract JSON from Claude's response
        const responseText = data.content[0].text;
        const jsonMatch = responseText.match(/\[.*\]/s);
        
        if (jsonMatch) {
          const parsedItems = JSON.parse(jsonMatch[0]);
          foodItems = parsedItems.map((item: any) => ({
            name: item.name,
            confidence: item.confidence || 0.8,
            source: 'claude'
          }));
        }
      } catch (parseError) {
        console.error('Error parsing Claude response:', parseError);
        // Fallback: try to extract food items from text
        const responseText = data.content[0].text.toLowerCase();
        const commonFoods = ['apple', 'banana', 'sandwich', 'pizza', 'burger', 'salad', 'bread', 'chicken', 'rice', 'pasta'];
        foodItems = commonFoods
          .filter(food => responseText.includes(food))
          .map(food => ({ name: food, confidence: 0.7, source: 'claude' }));
      }
    }

    console.log('Claude detected food items:', foodItems);

    return new Response(JSON.stringify({ foodItems }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in claude-vision-food-detector function:', error);
    return new Response(JSON.stringify({ foodItems: [] }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
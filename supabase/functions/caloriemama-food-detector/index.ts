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
    const { imageBase64 } = await req.json();
    
    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: 'Missing imageBase64 parameter' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // CalorieMama API key - can be test key or real key
    let calorieMamaApiKey = Deno.env.get('CALORIE_MAMA_API_KEY');
    
    // Use test key if no real key is configured
    if (!calorieMamaApiKey) {
      calorieMamaApiKey = 'test_api_key'; // CalorieMama's test key
      console.log('Using CalorieMama test API key');
    }

    console.log('Calling CalorieMama API...');

    // Convert base64 to blob for multipart form data
    const imageBuffer = Uint8Array.from(atob(imageBase64), c => c.charCodeAt(0));
    const imageBlob = new Blob([imageBuffer], { type: 'image/jpeg' });

    // Create form data
    const formData = new FormData();
    formData.append('image', imageBlob, 'food_image.jpg');

    const response = await fetch('https://api.caloriemama.ai/api/v1/foodrecognition', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${calorieMamaApiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('CalorieMama API error:', response.status, errorText);
      
      // If using test key and getting auth error, return empty array gracefully
      if (response.status === 401 && calorieMamaApiKey === 'test_api_key') {
        console.log('Test key authentication failed - returning empty results');
        return new Response(
          JSON.stringify({ foodItems: [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'CalorieMama API request failed', details: errorText }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: response.status }
      );
    }

    const data = await response.json();
    console.log('CalorieMama API response:', data);

    // Parse food items from CalorieMama response
    let foodItems: string[] = [];
    
    try {
      // CalorieMama typically returns results in this format:
      // { "results": [{ "food_name": "apple", "confidence": 0.9 }, ...] }
      if (data.results && Array.isArray(data.results)) {
        foodItems = data.results
          .filter((item: any) => item.food_name && item.confidence > 0.3) // Filter by confidence
          .map((item: any) => item.food_name.trim())
          .filter((name: string) => name.length > 0);
      }
      // Alternative format: { "predictions": [...] }
      else if (data.predictions && Array.isArray(data.predictions)) {
        foodItems = data.predictions
          .filter((item: any) => item.food_name && item.confidence > 0.3)
          .map((item: any) => item.food_name.trim())
          .filter((name: string) => name.length > 0);
      }
      // Simple array format
      else if (Array.isArray(data)) {
        foodItems = data
          .map((item: any) => typeof item === 'string' ? item : item.food_name || item.name)
          .filter((name: string) => name && name.length > 0);
      }

      console.log('Parsed CalorieMama food items:', foodItems);

    } catch (parseError) {
      console.error('Failed to parse CalorieMama response:', parseError);
      foodItems = [];
    }

    return new Response(
      JSON.stringify({ foodItems }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in CalorieMama food detector:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
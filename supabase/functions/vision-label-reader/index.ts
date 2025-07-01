/*
TEST PAYLOAD EXAMPLE:
You can test this function with the following JSON payload:

{
  "imageBase64": "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
}

To test with authorization header:
Authorization: Bearer <your-jwt-token>

Expected response format:
{
  "labels": [
    {
      "description": "Food",
      "score": 0.95
    }
  ],
  "foodLabels": [
    {
      "description": "Apple",
      "score": 0.89
    }
  ],
  "nutritionData": {
    "calories": 95,
    "protein": 0.5,
    "carbs": 25
  },
  "textDetected": "Nutrition Facts\nCalories 95\nProtein 0.5g",
  "objects": [
    {
      "name": "Fruit",
      "score": 0.92
    }
  ]
}

User ID for testing: 84ecf6a4-6f75-4c4c-be78-0451c517e7b8
*/

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const googleVisionApiKey = Deno.env.get('GOOGLE_VISION_API_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      throw new Error('Image data is required');
    }

    if (!googleVisionApiKey) {
      throw new Error('Google Vision API key not configured');
    }

    console.log('Processing image with Google Vision API...');

    // Call Google Vision API
    const visionResponse = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${googleVisionApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              image: {
                content: imageBase64,
              },
              features: [
                {
                  type: 'LABEL_DETECTION',
                  maxResults: 10,
                },
                {
                  type: 'TEXT_DETECTION',
                  maxResults: 10,
                },
                {
                  type: 'OBJECT_LOCALIZATION',
                  maxResults: 10,
                },
              ],
            },
          ],
        }),
      }
    );

    if (!visionResponse.ok) {
      const errorText = await visionResponse.text();
      console.error('Google Vision API Error:', errorText);
      throw new Error(`Google Vision API error: ${visionResponse.status}`);
    }

    const visionData = await visionResponse.json();
    console.log('Vision API response:', JSON.stringify(visionData, null, 2));

    const annotations = visionData.responses[0];
    const labels = annotations.labelAnnotations || [];
    const textAnnotations = annotations.textAnnotations || [];
    const objects = annotations.localizedObjectAnnotations || [];

    // Extract food-related labels and nutrition information
    const foodLabels = labels.filter((label: any) => 
      label.description.toLowerCase().includes('food') ||
      label.description.toLowerCase().includes('fruit') ||
      label.description.toLowerCase().includes('vegetable') ||
      label.description.toLowerCase().includes('meat') ||
      label.description.toLowerCase().includes('drink') ||
      label.description.toLowerCase().includes('bread') ||
      label.description.toLowerCase().includes('cheese') ||
      label.description.toLowerCase().includes('snack') ||
      label.score > 0.7
    );

    // Extract nutrition facts from text if available
    const nutritionText = textAnnotations.length > 0 ? textAnnotations[0].description : '';
    const nutritionData = extractNutritionFromText(nutritionText);

    // Create a supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user ID from the authorization header
    const authHeader = req.headers.get('authorization');
    let userId = null;
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id;
    }

    // Store the recognition result
    const { error: dbError } = await supabase
      .from('food_recognitions')
      .insert({
        user_id: userId,
        detected_labels: labels.map((l: any) => l.description),
        confidence_scores: labels.map((l: any) => l.score),
        raw_response: visionData,
      });

    if (dbError) {
      console.error('Database error:', dbError);
    }

    // Return the processed results
    return new Response(
      JSON.stringify({
        labels: labels.map((label: any) => ({
          description: label.description,
          score: label.score,
        })),
        foodLabels: foodLabels.map((label: any) => ({
          description: label.description,
          score: label.score,
        })),
        nutritionData,
        textDetected: nutritionText,
        objects: objects.map((obj: any) => ({
          name: obj.name,
          score: obj.score,
        })),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in vision-label-reader function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Check function logs for more information'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function extractNutritionFromText(text: string) {
  const nutritionData: any = {};
  
  // Common nutrition label patterns
  const patterns = {
    calories: /calories?\s*:?\s*(\d+)/i,
    protein: /protein\s*:?\s*(\d+(?:\.\d+)?)\s*g/i,
    carbs: /carbohydrate|carbs?\s*:?\s*(\d+(?:\.\d+)?)\s*g/i,
    fat: /fat\s*:?\s*(\d+(?:\.\d+)?)\s*g/i,
    fiber: /fiber\s*:?\s*(\d+(?:\.\d+)?)\s*g/i,
    sugar: /sugar\s*:?\s*(\d+(?:\.\d+)?)\s*g/i,
    sodium: /sodium\s*:?\s*(\d+(?:\.\d+)?)\s*mg/i,
  };

  for (const [key, pattern] of Object.entries(patterns)) {
    const match = text.match(pattern);
    if (match) {
      nutritionData[key] = parseFloat(match[1]);
    }
  }

  return nutritionData;
}

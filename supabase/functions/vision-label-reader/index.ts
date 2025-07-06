
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

// Enhanced timeout wrapper with AbortController
const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  const controller = new AbortController();
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      controller.abort();
      reject(new Error(`Operation timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });
  
  return Promise.race([promise, timeoutPromise]);
};

serve(async (req) => {
  const startTime = Date.now();
  console.log('=== VISION FUNCTION START ===', {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url
  });
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate API key immediately
    if (!googleVisionApiKey) {
      console.error('CRITICAL: Google Vision API key not configured');
      return new Response(
        JSON.stringify({
          error: 'Google Vision API key not configured',
          details: 'Please add GOOGLE_VISION_API_KEY to Supabase Edge Function secrets',
          timestamp: new Date().toISOString()
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('API key validation: OK');
    
    // Parse request body with timeout
    let imageBase64;
    try {
      const body = await withTimeout(req.json(), 5000);
      imageBase64 = body.imageBase64;
      console.log('Request body parsed:', {
        hasImageData: !!imageBase64,
        imageDataLength: imageBase64?.length || 0
      });
    } catch (error) {
      console.error('Failed to parse request body:', error);
      return new Response(
        JSON.stringify({
          error: 'Invalid request body',
          details: error.message,
          timestamp: new Date().toISOString()
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!imageBase64) {
      console.error('No image data provided in request');
      return new Response(
        JSON.stringify({
          error: 'Image data is required',
          details: 'Please provide imageBase64 in request body',
          timestamp: new Date().toISOString()
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Starting Google Vision API call...');

    // Call Google Vision API with enhanced timeout and error handling
    let visionResponse;
    try {
      visionResponse = await withTimeout(
        fetch(
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
        ),
        20000 // 20 second timeout for Google Vision API
      );

      console.log('Google Vision API response received:', {
        status: visionResponse.status,
        statusText: visionResponse.statusText,
        headers: Object.fromEntries(visionResponse.headers.entries())
      });

    } catch (error) {
      console.error('Google Vision API call failed:', error);
      return new Response(
        JSON.stringify({
          error: 'Google Vision API call failed',
          details: error.message,
          timestamp: new Date().toISOString(),
          duration: Date.now() - startTime
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!visionResponse.ok) {
      const errorText = await visionResponse.text();
      console.error('Google Vision API Error Response:', {
        status: visionResponse.status,
        statusText: visionResponse.statusText,
        errorText
      });
      
      return new Response(
        JSON.stringify({
          error: `Google Vision API error: ${visionResponse.status}`,
          details: errorText,
          timestamp: new Date().toISOString(),
          duration: Date.now() - startTime
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    let visionData;
    try {
      visionData = await visionResponse.json();
      console.log('Vision API JSON parsed successfully:', {
        hasResponses: !!visionData.responses,
        responsesLength: visionData.responses?.length || 0
      });
    } catch (error) {
      console.error('Failed to parse Vision API JSON response:', error);
      return new Response(
        JSON.stringify({
          error: 'Failed to parse Vision API response',
          details: error.message,
          timestamp: new Date().toISOString(),
          duration: Date.now() - startTime
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!visionData.responses || !visionData.responses[0]) {
      console.error('Invalid Vision API response structure:', visionData);
      return new Response(
        JSON.stringify({
          error: 'Invalid response from Vision API',
          details: 'No responses array in API response',
          timestamp: new Date().toISOString(),
          duration: Date.now() - startTime
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const annotations = visionData.responses[0];
    
    // Check for Vision API errors
    if (annotations.error) {
      console.error('Vision API returned error:', annotations.error);
      return new Response(
        JSON.stringify({
          error: `Vision API error: ${annotations.error.message}`,
          details: annotations.error,
          timestamp: new Date().toISOString(),
          duration: Date.now() - startTime
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const labels = annotations.labelAnnotations || [];
    const textAnnotations = annotations.textAnnotations || [];
    const objects = annotations.localizedObjectAnnotations || [];

    console.log('Vision API results processed:', {
      labelsCount: labels.length,
      textAnnotationsCount: textAnnotations.length,
      objectsCount: objects.length
    });

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

    console.log('Processing database operations...');

    // Create a supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user ID from the authorization header
    let userId = null;
    
    const authHeader = req.headers.get('authorization');
    if (authHeader) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabase.auth.getUser(token);
        userId = user?.id;
        console.log('User ID extracted:', userId);
      } catch (authError) {
        console.warn('Could not extract user ID:', authError);
      }
    }

    // Store the recognition result (non-blocking background task)
    setTimeout(async () => {
      try {
        const { error: dbError } = await supabase
          .from('food_recognitions')
          .insert({
            user_id: userId,
            detected_labels: labels.map((l: any) => l.description),
            confidence_scores: labels.map((l: any) => l.score),
            raw_response: visionData,
          });

        if (dbError) {
          console.error('Database error (non-critical):', dbError);
        } else {
          console.log('Recognition result stored in database');
        }
      } catch (dbError) {
        console.error('Database operation failed (non-critical):', dbError);
      }
    }, 0);

    // Prepare response
    const response = {
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
    };

    const duration = Date.now() - startTime;
    console.log('=== VISION FUNCTION SUCCESS ===', {
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    });
    
    // Return the processed results
    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('=== VISION FUNCTION ERROR ===', {
      error: error.message,
      stack: error.stack,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    });
    
    // Return a proper error response
    const errorResponse = {
      error: error.message || 'Unknown error occurred',
      details: 'Check function logs for more information',
      timestamp: new Date().toISOString(),
      duration
    };
    
    return new Response(
      JSON.stringify(errorResponse),
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

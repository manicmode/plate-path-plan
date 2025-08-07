// GPT-5 Vision Food Detector - Extended Timeout Support: 2025-01-08
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callOpenAI, getModelForFunction } from '../_shared/gpt5-utils.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, prompt } = await req.json();

    if (!imageBase64) {
      console.error('Missing imageBase64');
      return new Response(
        JSON.stringify({ error: 'imageBase64 is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log('Calling GPT-5 Vision API...');
    
    // Get the appropriate model for vision tasks
    const model = getModelForFunction('gpt5-vision-food-detector', 'gpt-5');

    let result;
    
    try {
      // Add timeout support for OpenAI calls
      const timeoutMs = Number(Deno.env.get('VISION_TIMEOUT_MS') || '45000');
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), timeoutMs);
      
      result = await callOpenAI('gpt5-vision-food-detector', {
        model,
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
      });
      
      clearTimeout(timeoutId);
    } catch (error) {
      console.error('[gpt5-vision fallback] Primary GPT-5 failed:', error?.message || error);
      
      // Fallback to GPT-4 vision function
      const fallbackUrl = `https://uzoiiijqtahohfafqirm.supabase.co/functions/v1/gpt4-vision-food-detector`;
      const fallbackResponse = await fetch(fallbackUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': req.headers.get('Authorization') || '',
        },
        body: JSON.stringify({ imageBase64, prompt }),
      });
      
      const fallbackData = await fallbackResponse.json();
      
      return new Response(JSON.stringify({
        ...fallbackData,
        model_used: 'gpt-4o (fallback)',
        fallback_used: true
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let foodItems: string[] = [];
    const content = result.data.raw_response || JSON.stringify(result.data);
    
    console.log('Content from GPT-5:', content);

    // Try to parse as JSON array first
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        foodItems = parsed;
      } else if (parsed.foods && Array.isArray(parsed.foods)) {
        foodItems = parsed.foods;
      } else if (parsed.items && Array.isArray(parsed.items)) {
        foodItems = parsed.items;
      }
    } catch (parseError) {
      console.log('Not JSON, extracting from text...');
      // Extract food items from text response
      const lines = content.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('I can see') && !trimmed.startsWith('The image')) {
          const cleaned = trimmed.replace(/^[-*•]\s*/, '').replace(/^\d+\.\s*/, '');
          if (cleaned.length > 0) {
            foodItems.push(cleaned);
          }
        }
      }
    }

    // Filter out common non-food responses
    foodItems = foodItems.filter(item => {
      const lower = item.toLowerCase();
      return !lower.includes('sorry') && 
             !lower.includes('cannot') && 
             !lower.includes('unable') &&
             !lower.includes('unclear') &&
             item.length > 0;
    });

    console.log('Detected food items:', foodItems);

    return new Response(JSON.stringify({
      foodItems,
      model_used: result.model_used,
      processing_stats: {
        latency_ms: result.latency_ms,
        tokens: result.tokens
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in gpt5-vision-food-detector:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to process image', details: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
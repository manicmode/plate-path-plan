// GPT-5 Voice Food Logger - Extended Timeout Support: 2025-01-08
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { callOpenAI, getModelForFunction } from '../_shared/gpt5-utils.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Food mapping dictionary for vague terms
const foodMappings: { [key: string]: string } = {
  "ball of rice": "0.5 cup white rice",
  "bowl of rice": "1 cup white rice",
  "handful of nuts": "1 oz mixed nuts",
  "slice of pizza": "1 slice pizza",
  "piece of pizza": "1 slice pizza",
  "glass of milk": "1 cup milk",
  "cup of coffee": "1 cup coffee",
  "can of soda": "12 oz soda",
  "small apple": "1 small apple",
  "medium apple": "1 medium apple",
  "large apple": "1 large apple",
  "piece of fruit": "1 medium fruit",
  "piece of bread": "1 slice bread",
  "slice of bread": "1 slice bread",
  "bowl of cereal": "1 cup cereal",
  "cup of yogurt": "1 cup yogurt",
  "spoon of peanut butter": "1 tablespoon peanut butter",
  "tablespoon of honey": "1 tablespoon honey",
  "teaspoon of sugar": "1 teaspoon sugar",
  "pinch of salt": "1/8 teaspoon salt",
  "dash of pepper": "1/8 teaspoon pepper"
};

function preprocessFoodText(text: string): string {
  let processedText = text.toLowerCase();
  
  for (const [vague, precise] of Object.entries(foodMappings)) {
    const regex = new RegExp(`\\b${vague.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    if (regex.test(processedText)) {
      processedText = processedText.replace(regex, precise);
      console.log(`🔄 Mapped "${vague}" → "${precise}"`);
    }
  }
  
  return processedText;
}

serve(async (req) => {
  console.log('🔍 log-voice-gpt5 function started at:', new Date().toISOString());
  
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

    const { text } = await req.json();
    console.log('🔍 Extracted text input:', text);

    if (!text || typeof text !== 'string') {
      console.error('🚨 Invalid or missing text input');
      return new Response(JSON.stringify({ error: 'Text input is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Preprocess the input text with food mapping
    const preprocessedText = preprocessFoodText(text);
    console.log('Original text:', text);
    console.log('Preprocessed text:', preprocessedText);

    // Get the appropriate model for this function
    const model = getModelForFunction('log-voice', 'gpt-5-mini');

    const result = await callOpenAI('log-voice-gpt5', {
      model,
      messages: [
        {
          role: 'system',
          content: `You are a nutrition assistant. Extract all food items mentioned in this message.

CRITICAL INSTRUCTIONS:
- Return ONLY a valid JSON object in this EXACT format
- DO NOT include any text before or after the JSON
- Each food item should have: name (string), quantity (string), preparation (string, can be empty)

Expected format:
{
  "items": [
    { "name": "apple", "quantity": "1", "preparation": "" },
    { "name": "chicken breast", "quantity": "6 oz", "preparation": "grilled" }
  ]
}

EXAMPLES:
"I had a burger and fries" → {"items": [{"name": "burger", "quantity": "1", "preparation": ""}, {"name": "fries", "quantity": "1 serving", "preparation": ""}]}
"2 slices of pizza" → {"items": [{"name": "pizza", "quantity": "2 slices", "preparation": ""}]}
"grilled salmon with rice" → {"items": [{"name": "salmon", "quantity": "1 serving", "preparation": "grilled"}, {"name": "rice", "quantity": "1 serving", "preparation": ""}]}

If no food is mentioned, return: {"items": []}
Remember: ONLY return the JSON object, nothing else.`
        },
        {
          role: 'user',
          content: preprocessedText
        }
      ],
      max_tokens: 800,
      temperature: 0.2,
    }, 'gpt-5');

    const parsedItems = result.data;

    if (!parsedItems || !parsedItems.items || !Array.isArray(parsedItems.items)) {
      console.error('🚨 Invalid response structure:', parsedItems);
      throw new Error('Invalid response structure from AI');
    }

    console.log('✅ Successfully processed food analysis:', {
      itemsCount: parsedItems.items.length,
      originalText: text,
      preprocessedText: preprocessedText,
      modelUsed: result.model_used,
      latency: result.latency_ms,
      tokens: result.tokens
    });

    return new Response(JSON.stringify({
      items: parsedItems.items,
      model_used: result.model_used,
      fallback_used: result.fallback_used || false,
      processing_stats: {
        latency_ms: result.latency_ms,
        tokens: result.tokens
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('🚨 Critical error in log-voice-gpt5:', error);
    return new Response(JSON.stringify({
      error: 'Processing failed',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
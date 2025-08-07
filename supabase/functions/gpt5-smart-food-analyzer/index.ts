// GPT-5 Optimized Smart Food Analyzer
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
    const { text, imageBase64, complexity, prompt } = await req.json();

    if (!text && !imageBase64) {
      throw new Error('Either text or imageBase64 must be provided');
    }

    console.log(`🧠 [GPT5 Smart Analyzer] Processing request - text: ${!!text}, image: ${!!imageBase64}, complexity: ${complexity}`);

    // Get the appropriate model for this function
    const baseModel = getModelForFunction('gpt5-smart-food-analyzer', 'gpt-5-mini');
    
    // Smart model selection based on complexity
    let selectedModel = baseModel;
    let maxTokens = 600;
    let temperature = 0.3;

    // Use more powerful model for complex scenarios
    if (complexity === 'complex' || (text && text.length > 100)) {
      selectedModel = getModelForFunction('gpt5-smart-food-analyzer', 'gpt-5');
      maxTokens = 1000;
      temperature = 0.4;
    } else if (imageBase64) {
      selectedModel = getModelForFunction('gpt5-smart-food-analyzer', 'gpt-5');
    }

    console.log(`🧠 [GPT5 Smart Analyzer] Selected model: ${selectedModel} (complexity: ${complexity || 'auto'})`);

    // Prepare system prompt for structured response
    const systemPrompt = `You are a nutrition analysis expert. Analyze the provided food information and return detailed nutrition data.

CRITICAL: Return ONLY valid JSON in this exact format:
{
  "foods": [
    {
      "name": "food_name",
      "quantity": "amount_with_unit",
      "calories": number,
      "protein": number,
      "carbs": number,
      "fat": number,
      "fiber": number,
      "sugar": number,
      "sodium": number,
      "confidence": number_between_0_and_1
    }
  ],
  "total_confidence": number_between_0_and_1,
  "processing_notes": "brief_explanation"
}

Guidelines:
- Use standard serving sizes when quantity is unclear
- Be conservative with nutrition estimates
- Set confidence based on how clear the food description is
- Include all identifiable foods, even if partially visible`;

    // Prepare messages based on input type
    let messages;
    if (imageBase64) {
      messages = [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt || 'Analyze this food image and provide detailed nutrition information.'
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`
              }
            }
          ]
        }
      ];
    } else {
      messages = [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Analyze this food description and provide detailed nutrition information: "${text}"`
        }
      ];
    }

    // Determine fallback model
    const fallbackModel = selectedModel.includes('mini') ? 'gpt-5' : undefined;

    // Make centralized OpenAI call
    const result = await callOpenAI('gpt5-smart-food-analyzer', {
      model: selectedModel,
      messages,
      max_tokens: maxTokens,
      temperature,
    }, fallbackModel);

    // Validate response structure
    const responseData = result.data;
    if (!responseData.foods || !Array.isArray(responseData.foods)) {
      throw new Error('Invalid response structure: missing foods array');
    }

    console.log(`✅ [GPT5 Smart Analyzer] Analysis complete - ${responseData.foods.length} foods identified`);

    return new Response(JSON.stringify({
      ...responseData,
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
    console.error('❌ [GPT5 Smart Analyzer] Error:', error);
    return new Response(JSON.stringify({
      error: 'Analysis failed',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
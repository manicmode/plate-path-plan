import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callOpenAI, getModelForFunction } from '../_shared/gpt5-utils.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/**
 * Robust JSON parser that handles code fences and malformed responses
 */
function parseAIResponse(aiResponse: string): any {
  let cleanedResponse = aiResponse.trim();
  
  // Strip code fences if present
  const codeBlockMatch = cleanedResponse.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
  if (codeBlockMatch) {
    cleanedResponse = codeBlockMatch[1].trim();
    console.log('🧠 [PARSE][RECOVERED] Extracted JSON from code fences');
  }
  
  // Try to parse the cleaned response
  const parsed = JSON.parse(cleanedResponse);
  
  // Validate the structure
  if (!parsed.foods || !Array.isArray(parsed.foods)) {
    throw new Error('Invalid response structure: missing foods array');
  }
  
  return parsed;
}

/**
 * 🧠 Smart GPT Food Analyzer with intelligent model routing
 */
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    const { text, imageBase64, taskType = 'full_report', complexity = 'auto' } = await req.json().catch(() => ({}));
    
    // Early validation
    if (!text && !imageBase64) {
      return new Response(JSON.stringify({ error: 'Either text or imageBase64 is required' }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Smart model selection based on complexity
    let selectedModel = 'gpt-4o-mini';
    let maxTokens = 300;
    let temperature = 0.3;
    
    if (complexity === 'auto' && text) {
      const wordCount = text.trim().split(/\s+/).length;
      const punctuationCount = (text.match(/[,;:.!?]/g) || []).length;
      const hasConjunctions = /\b(and|or|with|plus|including|contains)\b/i.test(text);
      
      if (wordCount > 8 || punctuationCount > 2 || hasConjunctions) {
        selectedModel = 'gpt-4o';
        maxTokens = 800;
        temperature = 0.4;
      }
    } else if (complexity === 'complex') {
      selectedModel = 'gpt-4o';
      maxTokens = 800;
      temperature = 0.4;
    }

    console.log(`🧠 [Smart Analyzer] Using ${selectedModel} for ${taskType}`);
    console.log(`🧠 [Smart Analyzer] Input complexity: ${complexity}`);

    // Prepare messages based on input type
    const messages: any[] = [
      {
        role: 'system',
        content: `You are a comprehensive food health analyzer. Based on the taskType, provide detailed analysis.

For taskType "full_report": Analyze ingredients, calculate health scores, and provide complete nutritional data.
For taskType "food_analysis": Basic nutrition extraction only.

Always respond with valid JSON in this format:
{
  "foods": [
    {
      "name": "food name",
      "confidence": 0.95,
      "calories": 150,
      "protein": 5.2,
      "carbs": 25.1,
      "fat": 2.8,
      "fiber": 3.0,
      "sugar": 8.5,
      "sodium": 120,
      "serving_size": "1 medium apple",
      "quality": {
        "score": 7.5
      },
      "ingredientsText": "apples, natural flavoring",
      "flags": [
        {
          "type": "good",
          "title": "Natural Ingredients",
          "description": "Contains mostly whole food ingredients"
        }
      ]
    }
  ],
  "total_confidence": 0.95,
  "processing_notes": "Brief analysis notes"
}`
      }
    ];

    // Handle image or text input
    if (imageBase64) {
      messages.push({
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Analyze this food image and provide detailed nutrition information for all visible items.'
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${imageBase64}`
            }
          }
        ]
      });
    } else if (text) {
      messages.push({
        role: 'user',
        content: `Analyze this food description and provide detailed nutrition information: "${text}"`
      });
    } else {
      throw new Error('Either text or imageBase64 must be provided');
    }

    console.log(`🧠 [ANALYZE][REQ] Making request to ${selectedModel}`);

    // Make OpenAI API call with forced JSON output
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: selectedModel,
        messages,
        max_tokens: maxTokens,
        temperature,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('🚨 [Smart Analyzer] OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${errorText}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content?.trim();

    if (!aiResponse) {
      throw new Error('No response from OpenAI');
    }

    console.log(`✅ [ANALYZE][RES] ${selectedModel} response received`);

    // Robust JSON parsing with code fence stripping
    let parsedResponse;
    try {
      parsedResponse = parseAIResponse(aiResponse);
    } catch (parseError) {
      console.error('🚨 [PARSE][FALLBACK_JSON] Using fallback JSON after parse failure:', aiResponse);
      // Return valid JSON structure with 200 status instead of 400 to prevent UI errors
      return new Response(JSON.stringify({ 
        foods: [],
        total_confidence: 0,
        processing_notes: 'AI returned unparseable response, please try again',
        model_used: selectedModel,
        fallback_used: false
      }), { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if we should fallback to a more powerful model
    const shouldFallback = selectedModel === 'gpt-4o-mini' && 
      (parsedResponse.total_confidence < 0.7 || 
       parsedResponse.foods.length === 0 ||
       parsedResponse.processing_notes?.toLowerCase().includes('unclear'));

    if (shouldFallback) {
      console.log('🔄 [Smart Analyzer] Low confidence detected, trying GPT-4o fallback...');
      
      const fallbackResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages,
          max_tokens: 800,
          temperature: 0.4,
          response_format: { type: 'json_object' },
        }),
      });

      if (fallbackResponse.ok) {
        const fallbackData = await fallbackResponse.json();
        const fallbackAI = fallbackData.choices[0]?.message?.content?.trim();
        
        try {
          const fallbackParsed = parseAIResponse(fallbackAI);
          console.log('✅ [Smart Analyzer] GPT-4o fallback successful');
          return new Response(JSON.stringify({
            ...fallbackParsed,
            model_used: 'gpt-4o',
            fallback_used: true
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } catch {
          console.log('🚨 [Smart Analyzer] Fallback also failed, using original response');
        }
      }
    }

    return new Response(JSON.stringify({
      ...parsedResponse,
      model_used: selectedModel,
      fallback_used: false
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('🚨 [Smart Analyzer] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        foods: [],
        total_confidence: 0,
        processing_notes: 'Analysis failed'
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
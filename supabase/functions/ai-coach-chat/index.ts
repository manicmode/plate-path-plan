
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Retry function with exponential backoff
async function retryWithBackoff(fn: () => Promise<Response>, maxRetries = 3): Promise<Response> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fn();
      if (response.ok || response.status !== 429) {
        return response;
      }
      
      // If rate limited, wait before retrying
      if (attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
        console.log(`Rate limited, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    } catch (error) {
      console.error(`Request attempt ${attempt + 1} failed:`, error);
      if (attempt === maxRetries - 1) throw error;
      
      const delay = Math.pow(2, attempt) * 1000;
      console.log(`Request failed, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error('Max retries exceeded');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('=== AI Coach Chat Function Started ===');
  console.log('Request method:', req.method);
  console.log('Request headers:', Object.fromEntries(req.headers.entries()));

  try {
    const requestBody = await req.json();
    console.log('Request body received:', JSON.stringify({
      messageLength: requestBody.message?.length,
      hasUserContext: !!requestBody.userContext,
      userContext: requestBody.userContext
    }));

    const { message, userContext, flaggedIngredients } = requestBody;
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

    // Enhanced API key validation
    if (!openAIApiKey) {
      console.error('CRITICAL: OpenAI API key not found in environment variables');
      console.log('Available env vars:', Object.keys(Deno.env.toObject()));
      return new Response(JSON.stringify({ 
        error: 'AI service configuration error. OpenAI API key is missing. Please contact support.' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (openAIApiKey.length < 20) {
      console.error('CRITICAL: OpenAI API key appears to be invalid (too short)');
      return new Response(JSON.stringify({ 
        error: 'AI service configuration error. OpenAI API key appears invalid. Please contact support.' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('OpenAI API key found, length:', openAIApiKey.length);
    console.log('API key starts with:', openAIApiKey.substring(0, 10) + '...');

    if (!message || message.trim().length === 0) {
      console.error('Invalid message received:', message);
      return new Response(JSON.stringify({ 
        error: 'Please provide a valid message to continue our conversation.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create system prompt with user context and flagged ingredients
    let flaggedIngredientsContext = '';
    if (flaggedIngredients && flaggedIngredients.length > 0) {
      flaggedIngredientsContext = `

FLAGGED INGREDIENTS DETECTED:
${flaggedIngredients.map(ing => `- ${ing.name} (${ing.category}, ${ing.severity} severity): ${ing.description}`).join('\n')}

IMPORTANT: The user just logged food with these concerning ingredients. Your response should:
1. Address the flagged ingredients specifically and personally
2. Explain why they're concerning in simple terms
3. Suggest healthier alternatives where possible
4. Be supportive and encouraging, not judgmental
5. Vary your tone based on severity:
   - High severity: Be firm but kind ("This one's worth avoiding if possible")
   - Moderate severity: Be informative and suggest alternatives
   - Low severity: Educate and raise awareness
6. Batch similar flags (e.g., "2 harmful additives and 1 allergen detected...")
7. Keep the message under 200 words but make it actionable

Example tone: "Hey! I noticed your meal contains *Aspartame* (a harmful additive). It's been linked to headaches and neurological effects. If possible, try alternatives like stevia or monk fruit! Great job staying aware — you're doing amazing."`;
    }

    const systemPrompt = `You are an expert AI nutrition and wellness coach. Your responses should be:
- Encouraging and motivational
- Evidence-based and practical
- Personalized to the user's data
- Formatted with emojis and clear sections when helpful
- Concise but comprehensive

User Context:
- Target Calories: ${userContext?.targetCalories || 'Not set'}
- Target Protein: ${userContext?.targetProtein || 'Not set'}g
- Today's Progress: ${userContext?.progress?.calories || 0} calories, ${userContext?.progress?.protein || 0}g protein
- Carbs: ${userContext?.progress?.carbs || 0}g, Fat: ${userContext?.progress?.fat || 0}g${flaggedIngredientsContext}

Always provide actionable advice and maintain a supportive, professional tone.`;

    console.log('System prompt created, length:', systemPrompt.length);
    console.log('User message length:', message.length);

    const requestPayload = {
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      max_tokens: 500,
      temperature: 0.7,
    };

    console.log('OpenAI request payload:', JSON.stringify({
      model: requestPayload.model,
      messagesCount: requestPayload.messages.length,
      maxTokens: requestPayload.max_tokens,
      temperature: requestPayload.temperature
    }));

    const makeOpenAIRequest = async () => {
      console.log('Making request to OpenAI API...');
      const startTime = Date.now();
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
      });

      const endTime = Date.now();
      console.log(`OpenAI API request completed in ${endTime - startTime}ms`);
      console.log('OpenAI response status:', response.status);
      console.log('OpenAI response headers:', Object.fromEntries(response.headers.entries()));

      return response;
    };

    const response = await retryWithBackoff(makeOpenAIRequest);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error details:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: errorText
      });
      
      // Parse error details if possible
      try {
        const errorJson = JSON.parse(errorText);
        console.error('Parsed OpenAI error:', errorJson);
        
        if (errorJson.error?.code === 'invalid_api_key') {
          return new Response(JSON.stringify({ 
            error: 'AI service authentication failed. Please verify your OpenAI API key is valid and has sufficient credits.' 
          }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        if (errorJson.error?.code === 'insufficient_quota') {
          return new Response(JSON.stringify({ 
            error: 'AI service quota exceeded. Please check your OpenAI account credits and billing.' 
          }), {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      } catch (parseError) {
        console.error('Could not parse OpenAI error response:', parseError);
      }
      
      // Provide specific error messages based on status code
      let errorMessage = 'AI service temporarily unavailable. Please try again.';
      
      if (response.status === 429) {
        errorMessage = 'AI service is busy right now. Please wait a moment and try again.';
      } else if (response.status === 401) {
        errorMessage = 'AI service authentication error. Please contact support to verify API key configuration.';
      } else if (response.status === 400) {
        errorMessage = 'Invalid request format. Please try rephrasing your message.';
      } else if (response.status === 500) {
        errorMessage = 'AI service is experiencing issues. Please try again shortly.';
      }
      
      return new Response(JSON.stringify({ error: errorMessage }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    console.log('OpenAI response structure:', {
      hasChoices: !!data.choices,
      choicesLength: data.choices?.length,
      hasFirstChoice: !!data.choices?.[0],
      hasMessage: !!data.choices?.[0]?.message,
      hasContent: !!data.choices?.[0]?.message?.content,
      usage: data.usage
    });
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('Unexpected OpenAI response format:', data);
      return new Response(JSON.stringify({ 
        error: 'Received unexpected response format from AI service. Please try again.' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiResponse = data.choices[0].message.content;
    console.log('AI response generated successfully, length:', aiResponse?.length);

    return new Response(JSON.stringify({ response: aiResponse }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('=== CRITICAL ERROR in ai-coach-chat function ===');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    // Return user-friendly error messages
    const errorMessage = error.message?.includes('AI service') 
      ? error.message 
      : "I'm having trouble connecting right now. Please try again in a moment! 🤖";
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});


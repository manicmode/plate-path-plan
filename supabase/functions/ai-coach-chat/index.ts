
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

  try {
    const { message, userContext } = await req.json();
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Create system prompt with user context
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
- Carbs: ${userContext?.progress?.carbs || 0}g, Fat: ${userContext?.progress?.fat || 0}g

Always provide actionable advice and maintain a supportive, professional tone.`;

    const makeOpenAIRequest = async () => {
      return await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4.1-2025-04-14',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message }
          ],
          max_tokens: 500,
          temperature: 0.7,
        }),
      });
    };

    const response = await retryWithBackoff(makeOpenAIRequest);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      
      // Provide specific error messages based on status code
      let errorMessage = 'AI service temporarily unavailable. Please try again.';
      
      if (response.status === 429) {
        errorMessage = 'AI service is busy right now. Please wait a moment and try again.';
      } else if (response.status === 401) {
        errorMessage = 'AI service configuration error. Please contact support.';
      } else if (response.status === 500) {
        errorMessage = 'AI service is experiencing issues. Please try again shortly.';
      }
      
      throw new Error(errorMessage);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    return new Response(JSON.stringify({ response: aiResponse }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in ai-coach-chat function:', error);
    
    // Return user-friendly error messages
    const errorMessage = error.message.includes('AI service') 
      ? error.message 
      : "I'm having trouble connecting right now. Please try again in a moment! 🤖";
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

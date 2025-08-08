
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

  // Create supabase client authorized as caller to get user id for rate limiting
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
  const supabase = SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: req.headers.get('Authorization') || '' } } })
    : null;

  // In-memory rate limit store per user (best-effort)
  const rateStore = (globalThis as any).__ai_rate__ || ((globalThis as any).__ai_rate__ = new Map<string, number[]>());

  try {
    const requestBody = await req.json();
    console.log('Request body received:', JSON.stringify({
      messageLength: requestBody.message?.length,
      hasUserContext: !!requestBody.userContext,
      coachType: requestBody.coachType || requestBody.userContext?.coachType,
    }));

    const { message, userContext, flaggedIngredients, coachType: coachTypeFromBody } = requestBody;
    const coachType = coachTypeFromBody || userContext?.coachType || 'nutrition';
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

    // Get user id for rate limit
    let userId: string | null = null;
    if (supabase) {
      try {
        const { data } = await supabase.auth.getUser();
        userId = data?.user?.id || null;
      } catch (_) {}
    }

    // Rate limit: 8/min per user
    if (userId) {
      const now = Date.now();
      const windowMs = 60 * 1000;
      const maxReq = 8;
      const arr = rateStore.get(userId) || [];
      const recent = arr.filter(ts => now - ts < windowMs);
      if (recent.length >= maxReq) {
        return new Response(JSON.stringify({ error: 'Rate limit: Please wait a moment before asking again.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      recent.push(now);
      rateStore.set(userId, recent);
    }

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

    if (!message || message.trim().length === 0) {
      return new Response(JSON.stringify({ 
        error: 'Please provide a valid message to continue our conversation.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build role-specific personality and context prompt
    const voiceProfile = userContext?.voiceProfile || (coachType === 'recovery' ? 'calm_serene' : coachType === 'exercise' ? 'gritty_hype' : 'confident_gentle');

    const roleIntro = {
      nutrition: 'You are the user\'s Nutrition Coach. Personalize guidance using their latest nutrition data.',
      exercise: 'You are the user\'s Exercise Coach. Personalize guidance using their latest training data.',
      recovery: 'You are the user\'s Recovery Coach. Personalize guidance using their latest recovery data.'
    }[coachType as 'nutrition'|'exercise'|'recovery'];

    const stylePrompt = {
      confident_gentle: 'Use gentle, evidence-based guidance with supportive tone (🌿✨).',
      gritty_hype: 'Be energetic, motivational, and direct (💪🔥).',
      calm_serene: 'Be soothing, compassionate, and restorative (🌙🧘).'
    }[voiceProfile as 'confident_gentle'|'gritty_hype'|'calm_serene'];

    const ctx = userContext?.context || userContext?.contextSnapshot || userContext; // accept various fields
    const numbersRule = 'Always reference 2–4 concrete numbers from context when relevant.';
    const closeRule = 'Close with a 1-sentence plan you\'ll track this week.';
    const safety = 'Stay strictly within your specialty; no medical diagnosis.';

    const recoveryFocus = coachType === 'recovery' ? '\nIf user asks a general question, answer briefly then translate it into a next step aligned with their goal and data.' : '';

    const systemPrompt = `${roleIntro}\n${stylePrompt}\n${numbersRule}\n${closeRule}\n${safety}${recoveryFocus}\n
CONTEXT (may be partial, omit if missing):\n${ctx ? JSON.stringify(ctx).slice(0, 4000) : 'No context provided'}\n`;

    const requestPayload = {
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      max_tokens: 500,
      temperature: 0.7,
    };

    const makeOpenAIRequest = async () => {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
      });
      return response;
    };

    const response = await retryWithBackoff(makeOpenAIRequest);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI error:', errorText);
      return new Response(JSON.stringify({ error: 'AI service temporarily unavailable. Please try again.' }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const aiResponse = data?.choices?.[0]?.message?.content || 'I\'m here to help.';

    return new Response(JSON.stringify({ response: aiResponse }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('=== CRITICAL ERROR in ai-coach-chat function ===', error);
    const errorMessage = error.message?.includes('AI service') 
      ? error.message 
      : "I'm having trouble connecting right now. Please try again in a moment! 🤖";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});


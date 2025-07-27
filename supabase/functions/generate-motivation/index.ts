import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

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
    const { currentStep, stepType, progress } = await req.json();

    // Generate contextual motivational messages based on workout progress
    const motivationPrompts = {
      warmup: "Generate a short, energetic motivational message for someone starting their workout warmup. Use emojis and keep it under 15 words.",
      exercise: "Generate a short, powerful motivational message for someone in the middle of an intense exercise. Use emojis and keep it under 15 words.",
      rest: "Generate a short, encouraging message for someone taking a rest between sets. Use emojis and keep it under 15 words.",
      cooldown: "Generate a short, proud message for someone finishing their workout cooldown. Use emojis and keep it under 15 words."
    };

    const prompt = motivationPrompts[stepType as keyof typeof motivationPrompts] || 
      "Generate a short, motivational fitness message. Use emojis and keep it under 15 words.";

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: 'You are an enthusiastic fitness coach providing quick motivational messages during workouts. Be energetic but concise.' 
          },
          { role: 'user', content: `${prompt} Current step: ${currentStep}. Progress: ${progress}%` }
        ],
        max_tokens: 50,
        temperature: 0.8,
      }),
    });

    const data = await response.json();
    const motivationMessage = data.choices[0].message.content;

    return new Response(JSON.stringify({ motivationMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-motivation function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
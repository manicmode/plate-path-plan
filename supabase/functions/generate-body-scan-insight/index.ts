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
    const { scanData } = await req.json();
    
    const prompt = `As a supportive fitness coach, provide a brief, encouraging insight (2-4 sentences) for someone who just completed a body scan. 

Scan details:
- Date: ${scanData.date}
- Weight: ${scanData.weight ? `${scanData.weight} lbs` : 'Not provided'}
- Scan type: Full body scan (front, side, back poses)

Focus on:
- Celebrating the commitment to track progress
- The importance of consistency in health journey
- Positive reinforcement for taking this step
- Brief tip about body scan tracking

Keep it warm, motivational, and personal. Avoid generic advice.`;

    if (!openAIApiKey) {
      return new Response(
        JSON.stringify({ 
          insight: "Great job completing your body scan! Tracking your progress is a powerful step toward your health goals. Consistency in monitoring helps you stay motivated and see real changes over time. Keep up the excellent work!" 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a supportive, encouraging fitness coach who provides brief, motivational insights.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 200,
        temperature: 0.7,
      }),
    });

    const data = await response.json();
    const insight = data.choices?.[0]?.message?.content || "Great job completing your body scan! This commitment to tracking your progress shows real dedication to your health journey.";

    return new Response(JSON.stringify({ insight }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error generating body scan insight:', error);
    
    // Fallback insight
    const fallbackInsight = "Congratulations on completing your body scan! Taking time to track your progress is a key step in your fitness journey. Regular monitoring helps you stay motivated and see the changes you're working toward. Keep up the great work!";
    
    return new Response(JSON.stringify({ insight: fallbackInsight }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
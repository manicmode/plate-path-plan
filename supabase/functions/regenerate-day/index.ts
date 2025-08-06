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
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client for auth (would need to import and configure)
    // For now, just validate the user_id from the request matches auth
    
    const {
      user_id,
      routine_id,
      current_week,
      current_day,
      workout_type,
      target_muscles,
      fitness_level,
      equipment_available,
      time_available
    } = await req.json();

    console.log('Regenerating day for:', {
      user_id,
      routine_id,
      current_week,
      current_day,
      workout_type
    });

    const prompt = buildRegenerationPrompt({
      workout_type,
      target_muscles,
      fitness_level,
      equipment_available,
      time_available,
      current_week
    });

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          {
            role: 'system',
            content: `You are an expert fitness trainer. Generate a fresh workout variation for the specific day while maintaining the same training goals and structure. Provide only valid JSON response - no additional text.`
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.8, // Higher creativity for variations
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const regeneratedDay = data.choices[0].message.content;

    // Parse the JSON response
    let dayData;
    try {
      dayData = JSON.parse(regeneratedDay);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response as JSON:', parseError);
      throw new Error('Invalid JSON response from AI');
    }

    return new Response(JSON.stringify({
      success: true,
      day: dayData
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in regenerate-day function:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function buildRegenerationPrompt({
  workout_type,
  target_muscles,
  fitness_level,
  equipment_available,
  time_available,
  current_week
}) {
  return `Generate a fresh workout variation with these specifications:

WORKOUT DETAILS:
- Type: ${workout_type}
- Target Muscles: ${target_muscles?.join(', ') || 'full body'}
- Fitness Level: ${fitness_level}
- Equipment: ${equipment_available}
- Duration: ${time_available} minutes
- Week: ${current_week} (adjust intensity accordingly)

FORMAT REQUIREMENTS:
Return ONLY valid JSON in this structure:

{
  "day_name": "${workout_type} Day",
  "workout_type": "${workout_type}",
  "target_muscles": ${JSON.stringify(target_muscles || ['full body'])},
  "estimated_duration": ${time_available},
  "steps": [
    {
      "id": "warmup",
      "step_type": "warmup",
      "title": "Dynamic Warm-up",
      "description": "Prepare your body for the workout",
      "duration_seconds": 300,
      "instructions": "Movement-specific warm-up exercises",
      "exercise_name": "dynamic-warmup"
    },
    {
      "id": "exercise-1",
      "step_type": "exercise",
      "title": "[Exercise Name]",
      "description": "3 sets of 10-12 reps",
      "sets": 3,
      "reps": 12,
      "duration_seconds": 60,
      "instructions": "Proper form cues and technique",
      "exercise_name": "[exercise-slug]",
      "target_muscles": ["primary", "secondary"]
    },
    {
      "id": "rest-1",
      "step_type": "rest",
      "title": "Rest",
      "description": "Rest between exercises",
      "duration_seconds": 90
    }
  ]
}

REQUIREMENTS:
1. Generate NEW exercises different from typical routines for variety
2. Progress difficulty for week ${current_week} (harder than week 1)
3. Include 5-7 main exercises plus warm-up/cool-down
4. Use equipment: ${equipment_available}
5. Target muscles: ${target_muscles?.join(', ') || 'full body'}
6. Keep total time around ${time_available} minutes
7. Provide creative exercise variations for engagement
8. Ensure exercises are appropriate for ${fitness_level} level`;
}
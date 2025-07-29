import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to create timeout promise
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
    ),
  ]);
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check for API key first
    if (!openAIApiKey || openAIApiKey.trim() === '') {
      console.error('Missing OpenAI API key');
      return new Response(JSON.stringify({
        success: false,
        message: 'Missing OpenAI API key. Please configure OPENAI_API_KEY in Supabase Edge Function secrets.'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const {
      user_id,
      routine_goal,
      split_type,
      days_per_week,
      available_time_per_day,
      fitness_level,
      equipment_available,
      preferred_routine_name
    } = await req.json();

    console.log('✅ Starting routine generation for user:', user_id);
    console.log('📋 Preferences:', {
      routine_goal,
      split_type,
      days_per_week,
      available_time_per_day,
      fitness_level,
      equipment_available
    });

    const prompt = buildRoutinePrompt({
      routine_goal,
      split_type,
      days_per_week,
      available_time_per_day,
      fitness_level,
      equipment_available,
      preferred_routine_name
    });

    console.log('🚀 Sending request to OpenAI API...');

    const response = await withTimeout(
      fetch('https://api.openai.com/v1/chat/completions', {
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
              content: `You are an expert fitness trainer and routine designer. Create comprehensive, progressive workout routines that are safe, effective, and tailored to the user's specific needs. Always provide proper progression, rest periods, and exercise variations. Format your response as valid JSON only - no additional text.`
            },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
        }),
      }),
      25000 // 25 second timeout
    );

    if (!response.ok) {
      console.error('❌ OpenAI API error:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Response body:', errorText);
      return new Response(JSON.stringify({
        success: false,
        message: `OpenAI API error: ${response.status} ${response.statusText}`
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    console.log('✅ OpenAI API response received, parsing...');
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
      console.error('❌ Invalid OpenAI response structure:', data);
      return new Response(JSON.stringify({
        success: false,
        message: 'Invalid response structure from OpenAI API'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const generatedPlan = data.choices[0].message.content;
    console.log('📝 Raw response length:', generatedPlan?.length || 0);

    // Parse the JSON response
    let routinePlan;
    try {
      if (!generatedPlan || generatedPlan.trim() === '') {
        console.error('❌ Empty response from OpenAI');
        return new Response(JSON.stringify({
          success: false,
          message: 'Empty response from OpenAI API'
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      routinePlan = JSON.parse(generatedPlan);
      console.log('✅ Successfully parsed routine plan:', routinePlan.routine_name);
      
      // Validate that the plan has required structure
      if (!routinePlan.routine_name || !routinePlan.weeks) {
        console.error('❌ Invalid routine plan structure:', { 
          hasName: !!routinePlan.routine_name,
          hasWeeks: !!routinePlan.weeks
        });
        return new Response(JSON.stringify({
          success: false,
          message: 'Generated routine has invalid structure'
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
    } catch (parseError) {
      console.error('❌ Failed to parse OpenAI response as JSON:', parseError);
      console.error('Raw response snippet:', generatedPlan?.substring(0, 200));
      return new Response(JSON.stringify({
        success: false,
        message: 'Invalid JSON response from AI'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('🎉 Routine generation completed successfully');
    return new Response(JSON.stringify({
      success: true,
      routine: routinePlan
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error in generate-routine-plan function:', error);
    
    let errorMessage = 'Failed to generate routine';
    if (error instanceof Error) {
      if (error.message === 'Request timeout') {
        errorMessage = 'OpenAI timeout - please try again';
      } else if (error.message.includes('fetch')) {
        errorMessage = 'Network error - please check your connection';
      } else {
        errorMessage = error.message;
      }
    }
    
    return new Response(JSON.stringify({
      success: false,
      message: errorMessage
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function buildRoutinePrompt({
  routine_goal,
  split_type,
  days_per_week,
  available_time_per_day,
  fitness_level,
  equipment_available,
  preferred_routine_name
}) {
  return `Create a comprehensive 8-week fitness routine with the following specifications:

REQUIREMENTS:
- Goal: ${routine_goal}
- Split Type: ${split_type}
- Days per week: ${days_per_week}
- Time per session: ${available_time_per_day} minutes
- Fitness Level: ${fitness_level}
- Equipment: ${equipment_available}
- Routine Name: ${preferred_routine_name || 'Generated Routine'}

FORMAT REQUIREMENTS:
Return ONLY valid JSON in this exact structure:

{
  "routine_name": "${preferred_routine_name || 'Generated Routine'}",
  "routine_goal": "${routine_goal}",
  "split_type": "${split_type}",
  "total_weeks": 8,
  "days_per_week": ${days_per_week},
  "estimated_duration_minutes": ${available_time_per_day},
  "fitness_level": "${fitness_level}",
  "equipment_needed": ["${equipment_available}"],
  "weeks": [
    {
      "week_number": 1,
      "focus": "Foundation Building",
      "days": {
        "monday": {
          "day_name": "Monday",
          "workout_type": "Push",
          "target_muscles": ["chest", "shoulders", "triceps"],
          "estimated_duration": ${available_time_per_day},
          "steps": [
            {
              "id": "warmup",
              "step_type": "warmup",
              "title": "5-Minute Dynamic Warm-up",
              "description": "Prepare your body for the workout",
              "duration_seconds": 300,
              "instructions": "Arm circles, leg swings, light cardio",
              "exercise_name": "dynamic-warmup"
            },
            {
              "id": "exercise-1-1",
              "step_type": "exercise",
              "title": "Push-ups",
              "description": "3 sets of 8-12 reps",
              "sets": 3,
              "reps": 10,
              "duration_seconds": 60,
              "instructions": "Keep core tight, full range of motion",
              "exercise_name": "push-ups",
              "target_muscles": ["chest", "triceps", "shoulders"]
            },
            {
              "id": "rest-1",
              "step_type": "rest",
              "title": "Rest",
              "description": "Rest between exercises",
              "duration_seconds": 90
            }
          ]
        },
        "tuesday": {
          "day_name": "Tuesday",
          "workout_type": "Rest",
          "steps": [
            {
              "id": "rest-day",
              "step_type": "rest",
              "title": "Active Recovery",
              "description": "Light walking or stretching",
              "duration_seconds": 0
            }
          ]
        }
      }
    }
  ]
}

IMPORTANT GUIDELINES:
1. Create progressive overload across 8 weeks (increase intensity, reps, or sets)
2. Include proper warm-up (5 minutes) and cool-down (5 minutes) for each workout day
3. Add 60-90 second rest periods between exercises
4. Choose exercises appropriate for ${fitness_level} level and ${equipment_available}
5. For ${split_type} split, organize muscle groups accordingly
6. Ensure total workout time stays around ${available_time_per_day} minutes
7. Include rest days based on ${days_per_week} schedule
8. Use exercise names that match common fitness terminology (push-ups, squats, etc.)
9. Progress difficulty each week while maintaining proper form focus
10. Include variety to prevent boredom while maintaining consistency

Create the full 8-week plan with all days populated according to the ${days_per_week} days per week schedule.`;
}
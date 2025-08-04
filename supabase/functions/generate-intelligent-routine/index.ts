import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl!, supabaseKey!);
    const {
      user_id,
      regenerate_type,
      target_day,
      locked_days = [],
      current_routine_data = null,
      body_scan_results = null,
      weak_muscle_groups = null
    } = await req.json();

    console.log('Generating routine for user:', user_id, 'type:', regenerate_type);

    // Get user preferences and profile data
    const { data: preferences } = await supabase
      .from('user_fitness_preferences')
      .select('*')
      .eq('user_id', user_id)
      .single();

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user_id)
      .single();

    // Get recent exercise history for intelligent adaptation
    const { data: recentLogs } = await supabase
      .from('exercise_logs')
      .select('*')
      .eq('user_id', user_id)
      .gte('created_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(20);

    // Build AI prompt based on regeneration type
    const prompt = buildIntelligentPrompt({
      preferences,
      profile,
      recentLogs,
      regenerate_type,
      target_day,
      locked_days,
      current_routine_data,
      body_scan_results,
      weak_muscle_groups
    });

    console.log('Sending prompt to OpenAI...');
    
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
            content: `You are an elite fitness coach AI that creates personalized, intelligent workout routines. You understand muscle group rotation, progressive overload, and individual adaptation. Always respond with valid JSON only.`
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const generatedContent = data.choices[0].message.content;

    let routineData;
    try {
      routineData = JSON.parse(generatedContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      throw new Error('Invalid AI response format');
    }

    // Save to database
    const { data: savedRoutine, error: saveError } = await supabase
      .from('ai_generated_routines')
      .insert({
        user_id,
        routine_name: routineData.routine_name,
        days_per_week: routineData.days_per_week,
        weekly_routine_data: routineData.weekly_schedule,
        muscle_group_schedule: routineData.muscle_group_tracking,
        locked_days,
        generation_metadata: {
          regenerate_type,
          target_day,
          ai_reasoning: routineData.ai_reasoning,
          generated_at: new Date().toISOString()
        },
        primary_goals: routineData.primary_goals,
        fitness_level: preferences?.fitness_level || 'intermediate',
        split_type: preferences?.preferred_split || 'push_pull_legs',
        equipment_available: preferences?.available_equipment || ['bodyweight']
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving routine:', saveError);
      throw new Error('Failed to save routine');
    }

    // Save generation history
    await supabase
      .from('routine_generation_history')
      .insert({
        user_id,
        routine_id: savedRoutine.id,
        generation_type: regenerate_type,
        target_day,
        locked_days_snapshot: locked_days,
        ai_response_metadata: {
          model: 'gpt-4.1-2025-04-14',
          reasoning: routineData.ai_reasoning
        }
      });

    console.log('Routine generated successfully');

    return new Response(JSON.stringify({
      success: true,
      routine: savedRoutine,
      ai_reasoning: routineData.ai_reasoning
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-intelligent-routine:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function buildIntelligentPrompt({
  preferences,
  profile,
  recentLogs,
  regenerate_type,
  target_day,
  locked_days,
  current_routine_data,
  body_scan_results,
  weak_muscle_groups
}) {
  const baseInfo = `
USER PROFILE:
- Fitness Level: ${preferences?.fitness_level || 'intermediate'}
- Goals: ${preferences?.primary_goals?.join(', ') || 'general fitness'}
- Available Equipment: ${preferences?.available_equipment?.join(', ') || 'bodyweight'}
- Preferred Split: ${preferences?.preferred_split || 'push_pull_legs'}
- Days per week: ${preferences?.days_per_week || 4}
- Session duration: ${preferences?.session_duration_minutes || 45} minutes

RECENT ACTIVITY:
${recentLogs?.slice(0, 5).map(log => 
  `- ${log.exercise_type} (${log.duration_minutes}min, ${log.intensity})`
).join('\n') || 'No recent activity'}

BODY SCAN ANALYSIS:
${body_scan_results && weak_muscle_groups ? `
- Body Scan Available: YES
- Weak Muscle Groups Identified: ${weak_muscle_groups.groups.join(', ')}
- Scores: ${Object.entries(weak_muscle_groups.scores).map(([group, score]) => `${group}: ${score}`).join(', ')}
- PRIORITY: Focus on strengthening these muscle groups with 15-20% more exercises/volume
` : '- Body Scan Available: NO - Use standard routine generation'}
`;

  if (regenerate_type === 'full_week') {
    return `${baseInfo}

TASK: Generate a complete intelligent 7-day workout routine.

REQUIREMENTS:
- Respect locked days: ${locked_days.length ? locked_days.join(', ') : 'none'}
- Ensure proper muscle group rotation and recovery
- Progressive difficulty throughout the week
- Include warm-up, main work, cool-down for each day
- Avoid overtraining any muscle group
${weak_muscle_groups ? `
- BODY SCAN FOCUS: Increase emphasis on weak muscle groups (${weak_muscle_groups.groups.join(', ')})
- Add 1-2 extra exercises targeting these groups per relevant workout day
- Ensure weekly balance while addressing weaknesses
` : ''}

${current_routine_data ? `CURRENT ROUTINE (for reference): ${JSON.stringify(current_routine_data)}` : ''}

Return JSON format:
{
  "routine_name": "string",
  "days_per_week": number,
  "primary_goals": ["goal1", "goal2"],
  "weekly_schedule": {
    "monday": { "day_name": "Monday", "focus": "string", "exercises": [...], "estimated_duration": number },
    "tuesday": { "day_name": "Tuesday", "focus": "Rest" },
    // ... all 7 days
  },
  "muscle_group_tracking": {
    "monday": ["chest", "triceps"],
    "tuesday": [],
    // ... tracking which groups trained each day
  },
  "ai_reasoning": "Brief explanation of the routine design choices and body scan focus areas",
  "body_scan_emphasis": ${weak_muscle_groups ? `["${weak_muscle_groups.groups.join('", "')}"]` : 'null'}
}`;
  }

  if (regenerate_type === 'single_day') {
    return `${baseInfo}

TASK: Regenerate ONLY ${target_day} with intelligent variation.

CURRENT WEEK CONTEXT:
${current_routine_data ? JSON.stringify(current_routine_data.weekly_schedule) : 'No current routine'}

MUSCLE GROUP TRACKING:
${current_routine_data ? JSON.stringify(current_routine_data.muscle_group_tracking) : 'No tracking data'}

REQUIREMENTS:
- Only regenerate ${target_day}
- Consider what muscle groups were trained yesterday and tomorrow
- Ensure variety from previous ${target_day} routine
- Maintain overall weekly balance
- Same duration target as before
${weak_muscle_groups ? `
- BODY SCAN FOCUS: If this day targets weak muscle groups (${weak_muscle_groups.groups.join(', ')}), add extra emphasis
` : ''}

Return JSON with the same format but only update the specified day.`;
  }

  return baseInfo + '\nGenerate a balanced weekly routine.';
}
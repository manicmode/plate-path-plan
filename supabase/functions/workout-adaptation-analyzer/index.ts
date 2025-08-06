import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Helper function to get authenticated user
async function getUser(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return { user: null, error: 'Missing authorization header' };
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    {
      global: {
        headers: { Authorization: authHeader },
      },
    }
  );

  const { data: { user }, error } = await supabaseClient.auth.getUser();
  if (error || !user) {
    return { user: null, error: 'Unauthorized' };
  }
  
  return { user, error: null };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const { user } = await getUser(req);
    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    console.log('🔹 Workout adaptation analyzer called');
    const { 
      performanceData, 
      routineId, 
      weekNumber, 
      dayNumber,
      nextWorkoutData 
    } = await req.json();

    console.log('📊 Performance data:', performanceData);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user's recent performance history for better adaptation
    const { data: recentPerformance } = await supabase
      .from('workout_performance_logs')
      .select('*')
      .eq('user_id', performanceData.user_id)
      .eq('routine_id', routineId)
      .order('created_at', { ascending: false })
      .limit(5);

    console.log('📈 Recent performance:', recentPerformance?.length || 0, 'records');

    // Analyze performance and determine adaptation strategy
    const adaptationAnalysis = await analyzePerformanceWithAI(
      performanceData,
      recentPerformance || [],
      nextWorkoutData
    );

    console.log('🧠 AI Analysis:', adaptationAnalysis);

    // Store the adaptation in the database
    const { data: adaptation, error: adaptationError } = await supabase
      .from('workout_adaptations')
      .insert({
        user_id: performanceData.user_id,
        routine_id: routineId,
        week_number: weekNumber,
        day_number: dayNumber + 1, // Next day
        original_workout_data: nextWorkoutData,
        adapted_workout_data: adaptationAnalysis.adaptedWorkout,
        performance_metrics: {
          performance_score: performanceData.performance_score,
          completion_rate: performanceData.completed_sets_count / performanceData.total_sets_count,
          difficulty_rating: performanceData.difficulty_rating
        },
        adaptation_reasons: adaptationAnalysis.reasons,
        ai_coach_feedback: adaptationAnalysis.coachFeedback,
        adaptation_type: adaptationAnalysis.adaptationType
      })
      .select()
      .single();

    if (adaptationError) {
      console.error('❌ Error storing adaptation:', adaptationError);
      throw adaptationError;
    }

    console.log('✅ Adaptation stored successfully');

    return new Response(JSON.stringify({
      success: true,
      adaptation: adaptation,
      adaptationType: adaptationAnalysis.adaptationType,
      coachFeedback: adaptationAnalysis.coachFeedback,
      adaptationBadge: adaptationAnalysis.badge
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error in workout adaptation analyzer:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function analyzePerformanceWithAI(
  currentPerformance: any,
  recentHistory: any[],
  nextWorkoutData: any
) {
  if (!openAIApiKey) {
    // Fallback analysis without AI
    return fallbackAdaptationAnalysis(currentPerformance, nextWorkoutData);
  }

  const prompt = `As an AI fitness coach, analyze this workout performance data and provide adaptive recommendations for the next workout.

CURRENT PERFORMANCE:
- Performance Score: ${currentPerformance.performance_score}/100
- Completion Rate: ${(currentPerformance.completed_sets_count / currentPerformance.total_sets_count * 100).toFixed(1)}%
- Difficulty Rating: ${currentPerformance.difficulty_rating}
- Total Duration: ${currentPerformance.total_duration_minutes} minutes
- Skipped Steps: ${currentPerformance.skipped_steps_count}
- Energy Level: ${currentPerformance.energy_level || 'Not provided'}/5

RECENT PERFORMANCE TREND:
${recentHistory.map(p => `Score: ${p.performance_score}, Difficulty: ${p.difficulty_rating}, Date: ${p.created_at}`).join('\n')}

NEXT WORKOUT PLAN:
${JSON.stringify(nextWorkoutData, null, 2)}

Based on this data, provide:
1. Adaptation strategy (increase_intensity, decrease_difficulty, adjust_rest, maintain_current)
2. Specific modifications to the next workout
3. Motivational coach feedback (2-3 sentences)
4. Reasons for the adaptation

Respond in JSON format:
{
  "adaptationType": "string",
  "adaptedWorkout": { modified workout data },
  "coachFeedback": "string",
  "reasons": ["reason1", "reason2"],
  "badge": { "text": "💡 Adjusted for performance", "type": "adaptation" }
}`;

  try {
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
            content: 'You are an expert AI fitness coach that analyzes workout performance and provides intelligent adaptations. Always respond in valid JSON format.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      }),
    });

    const data = await response.json();
    const aiResponse = JSON.parse(data.choices[0].message.content);
    
    return aiResponse;
  } catch (error) {
    console.error('AI analysis failed, using fallback:', error);
    return fallbackAdaptationAnalysis(currentPerformance, nextWorkoutData);
  }
}

function fallbackAdaptationAnalysis(performance: any, nextWorkout: any) {
  const score = performance.performance_score;
  const completionRate = performance.completed_sets_count / performance.total_sets_count;
  const difficulty = performance.difficulty_rating;

  let adaptationType = 'maintain_current';
  let adaptedWorkout = { ...nextWorkout };
  let coachFeedback = 'Keep up the great work! Your performance is consistent.';
  let reasons = ['Maintaining current intensity based on solid performance'];
  let badge = { text: '✅ Stay the Course', type: 'maintain' };

  // Determine adaptation based on performance metrics
  if (score >= 85 && difficulty === 'too_easy') {
    adaptationType = 'increase_intensity';
    // Increase reps by 10-20%
    if (adaptedWorkout.exercises) {
      adaptedWorkout.exercises = adaptedWorkout.exercises.map((ex: any) => ({
        ...ex,
        sets: Math.min(ex.sets + 1, 5),
        reps: ex.reps.includes('-') 
          ? ex.reps.split('-').map((r: string) => Math.ceil(parseInt(r) * 1.15)).join('-')
          : `${Math.ceil(parseInt(ex.reps) * 1.15)}`
      }));
    }
    coachFeedback = '🔥 Time to level up! Your performance shows you\'re ready for a bigger challenge.';
    reasons = ['High performance score', 'User rated workout as too easy'];
    badge = { text: '🔥 Boosted Intensity', type: 'increase' };
  } else if (score < 60 || difficulty === 'too_hard') {
    adaptationType = 'decrease_difficulty';
    // Decrease reps by 10-15%
    if (adaptedWorkout.exercises) {
      adaptedWorkout.exercises = adaptedWorkout.exercises.map((ex: any) => ({
        ...ex,
        sets: Math.max(ex.sets - 1, 2),
        reps: ex.reps.includes('-')
          ? ex.reps.split('-').map((r: string) => Math.floor(parseInt(r) * 0.85)).join('-')
          : `${Math.floor(parseInt(ex.reps) * 0.85)}`
      }));
    }
    coachFeedback = '💙 Taking it down a notch to help you build strength progressively. Consistency beats intensity!';
    reasons = ['Lower performance score', 'Workout difficulty too high'];
    badge = { text: '💡 Adjusted for Performance', type: 'decrease' };
  } else if (performance.skipped_steps_count > 2) {
    adaptationType = 'adjust_rest';
    // Add more rest time
    if (adaptedWorkout.exercises) {
      adaptedWorkout.exercises = adaptedWorkout.exercises.map((ex: any) => ({
        ...ex,
        rest: ex.rest.includes('seconds') 
          ? `${parseInt(ex.rest) + 30} seconds`
          : `${parseInt(ex.rest) + 0.5} minutes`
      }));
    }
    coachFeedback = '⏱️ Added extra recovery time to help you maintain form and complete all exercises effectively.';
    reasons = ['Multiple skipped steps detected'];
    badge = { text: '⏱️ Extra Recovery Time', type: 'rest' };
  }

  return {
    adaptationType,
    adaptedWorkout,
    coachFeedback,
    reasons,
    badge
  };
}
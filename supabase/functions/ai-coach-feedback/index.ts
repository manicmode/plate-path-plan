import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WorkoutFeedbackRequest {
  sets_completed: number;
  sets_skipped: number;
  total_sets: number;
  workout_duration_minutes: number;
  workout_title: string;
  routine_id: string;
  skipped_sets_by_exercise?: { [key: string]: number };
  intensity_level?: string;
  performance_score?: number;
}

interface AIFeedbackResponse {
  mood_label: string;
  emoji: string;
  coach_comment: string;
  adaptation_suggestions: {
    adjust_difficulty?: boolean;
    reduce_volume?: boolean;
    increase_rest?: boolean;
    focus_areas?: string[];
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: corsHeaders }
      );
    }

    // Get user from JWT token
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: corsHeaders }
      );
    }

    const workoutData: WorkoutFeedbackRequest = await req.json();

    console.log(`Generating AI coach feedback for user ${user.id}, workout: ${workoutData.workout_title}`);

    // Generate AI feedback based on workout performance
    const feedback = generateCoachFeedback(workoutData);

    // Store feedback in database
    const { data: feedbackRecord, error: insertError } = await supabaseClient
      .from('workout_feedback')
      .insert({
        user_id: user.id,
        routine_id: workoutData.routine_id,
        workout_title: workoutData.workout_title,
        sets_completed: workoutData.sets_completed,
        sets_skipped: workoutData.sets_skipped,
        total_sets: workoutData.total_sets,
        workout_duration_minutes: workoutData.workout_duration_minutes,
        intensity_level: workoutData.intensity_level || 'moderate',
        mood_label: feedback.mood_label,
        emoji: feedback.emoji,
        coach_comment: feedback.coach_comment,
        performance_score: workoutData.performance_score,
        adaptation_suggestions: feedback.adaptation_suggestions
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error storing feedback:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to store feedback' }),
        { status: 500, headers: corsHeaders }
      );
    }

    console.log(`AI coach feedback generated and stored successfully`);

    return new Response(
      JSON.stringify({
        success: true,
        feedback: {
          id: feedbackRecord.id,
          mood_label: feedback.mood_label,
          emoji: feedback.emoji,
          coach_comment: feedback.coach_comment,
          adaptation_suggestions: feedback.adaptation_suggestions
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Unexpected error in ai-coach-feedback:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: corsHeaders }
    );
  }
});

function generateCoachFeedback(workoutData: WorkoutFeedbackRequest): AIFeedbackResponse {
  const {
    sets_completed,
    sets_skipped,
    total_sets,
    workout_duration_minutes,
    skipped_sets_by_exercise = {},
    performance_score = 0
  } = workoutData;

  const completion_rate = sets_completed / total_sets;
  const skip_rate = sets_skipped / total_sets;
  const skipped_exercises = Object.keys(skipped_sets_by_exercise).filter(
    exercise => skipped_sets_by_exercise[exercise] > 0
  );

  let mood_label: string;
  let emoji: string;
  let coach_comment: string;
  const adaptation_suggestions: any = {};

  // Determine mood and emoji based on performance
  if (completion_rate >= 0.9 && sets_skipped === 0) {
    mood_label = "Beast Mode Activated";
    emoji = "💪";
    coach_comment = generateExcellentFeedback(workout_duration_minutes, performance_score);
  } else if (completion_rate >= 0.7 && skip_rate <= 0.2) {
    mood_label = "Pushed Through";
    emoji = "😤";
    coach_comment = generateGoodFeedback(sets_skipped, skipped_exercises);
  } else if (completion_rate >= 0.5) {
    mood_label = "Keep Fighting";
    emoji = "😓";
    coach_comment = generateEncouragingFeedback(sets_skipped, skipped_exercises);
    adaptation_suggestions.adjust_difficulty = true;
    adaptation_suggestions.reduce_volume = skip_rate > 0.3;
  } else {
    mood_label = "Let's Ramp It Up Next Time";
    emoji = "😴";
    coach_comment = generateMotivationalFeedback(completion_rate, total_sets);
    adaptation_suggestions.adjust_difficulty = true;
    adaptation_suggestions.reduce_volume = true;
    adaptation_suggestions.increase_rest = true;
  }

  // Add specific focus areas based on skipped exercises
  if (skipped_exercises.length > 0) {
    adaptation_suggestions.focus_areas = skipped_exercises.map(exercise => {
      if (exercise.toLowerCase().includes('leg') || exercise.toLowerCase().includes('squat')) {
        return 'legs';
      } else if (exercise.toLowerCase().includes('chest') || exercise.toLowerCase().includes('bench')) {
        return 'chest';
      } else if (exercise.toLowerCase().includes('back') || exercise.toLowerCase().includes('pull')) {
        return 'back';
      } else if (exercise.toLowerCase().includes('shoulder')) {
        return 'shoulders';
      }
      return 'general';
    });
  }

  return {
    mood_label,
    emoji,
    coach_comment,
    adaptation_suggestions
  };
}

function generateExcellentFeedback(duration: number, score: number): string {
  const phrases = [
    "Outstanding work! You crushed every single set! 🔥",
    "Absolutely phenomenal session! You're on fire! ⭐",
    "Beast mode activated! Every set completed to perfection! 🏆",
    "Incredible dedication! You didn't skip a single challenge! 💯"
  ];
  
  const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];
  
  if (duration < 30) {
    return `${randomPhrase} And you did it efficiently too - great time management!`;
  } else if (score > 90) {
    return `${randomPhrase} Your performance score shows real commitment!`;
  }
  
  return randomPhrase;
}

function generateGoodFeedback(skipped: number, skippedExercises: string[]): string {
  if (skipped === 1) {
    return "Solid effort! Just one skip but you powered through the rest. That's the spirit! 💪";
  } else if (skipped <= 3) {
    const exerciseText = skippedExercises.length > 0 
      ? ` I noticed a few skips on ${skippedExercises[0]}` 
      : '';
    return `Good session overall!${exerciseText} - but you finished strong! 👊`;
  }
  
  return "Nice job pushing through! A few skips happen - what matters is you completed the workout! 🎯";
}

function generateEncouragingFeedback(skipped: number, skippedExercises: string[]): string {
  if (skippedExercises.length > 0) {
    const mainSkipped = skippedExercises[0];
    if (mainSkipped.toLowerCase().includes('leg')) {
      return "I noticed you skipped some leg sets. Want me to reduce leg volume next time? Those can be tough! 🦵";
    } else if (mainSkipped.toLowerCase().includes('chest')) {
      return "Skipped a few chest sets? No worries! Should I ease up on chest exercises for your next session? 💪";
    } else {
      return `Saw some skips on ${mainSkipped}. That exercise giving you trouble? I can adjust it for next time! 🤔`;
    }
  }
  
  return "Hey, you stuck with it! Some days are harder than others. Want me to dial back the intensity a bit? 🤝";
}

function generateMotivationalFeedback(completionRate: number, totalSets: number): string {
  const completedSets = Math.floor(completionRate * totalSets);
  
  return `You completed ${completedSets} sets - that's still progress! 📈 Let's find a better pace for you next time. Small steps lead to big gains! 🌟`;
}
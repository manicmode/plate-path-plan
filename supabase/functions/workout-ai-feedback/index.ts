import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId, userId } = await req.json();
    
    if (!sessionId || !userId) {
      throw new Error('Session ID and User ID are required');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get current session data
    const { data: session, error: sessionError } = await supabase
      .from('workout_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessionError) throw sessionError;

    // Get workout logs for this session
    const { data: workoutLogs, error: logsError } = await supabase
      .from('workout_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('routine_id', session.routine_id)
      .eq('day_name', session.day_name)
      .order('created_at', { ascending: false });

    if (logsError) throw logsError;

    // Get previous sessions for comparison
    const { data: previousSessions, error: prevError } = await supabase
      .from('workout_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('routine_id', session.routine_id)
      .eq('day_name', session.day_name)
      .neq('id', sessionId)
      .eq('is_completed', true)
      .order('completed_at', { ascending: false })
      .limit(3);

    if (prevError) throw prevError;

    // Get user profile for personalization
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('first_name, communication_style')
      .eq('user_id', userId)
      .single();

    if (profileError) console.warn('Could not fetch user profile:', profileError);

    // Calculate performance metrics
    const currentLogs = workoutLogs?.filter(log => 
      new Date(log.created_at).toDateString() === new Date().toDateString()
    ) || [];

    const totalSets = currentLogs.reduce((sum, log) => sum + (log.target_sets || 0), 0);
    const completedSets = currentLogs.reduce((sum, log) => sum + (log.sets_completed || 0), 0);
    const completionRate = totalSets > 0 ? (completedSets / totalSets) * 100 : 0;
    
    const avgWeight = currentLogs.reduce((sum, log) => sum + (log.weight_used || 0), 0) / Math.max(currentLogs.length, 1);
    const skippedSets = totalSets - completedSets;

    // Compare with previous performance
    let performanceComparison = '';
    if (previousSessions && previousSessions.length > 0) {
      const lastSession = previousSessions[0];
      const timeDifference = session.total_duration_minutes - (lastSession.total_duration_minutes || 0);
      const exerciseDifference = session.completed_exercises - (lastSession.completed_exercises || 0);
      
      if (timeDifference > 5) {
        performanceComparison += `You took ${timeDifference} minutes longer than last time. `;
      } else if (timeDifference < -5) {
        performanceComparison += `You were ${Math.abs(timeDifference)} minutes faster than last time! `;
      }
      
      if (exerciseDifference > 0) {
        performanceComparison += `You completed ${exerciseDifference} more exercises than last session. `;
      }
    }

    // Build context for AI
    const workoutContext = {
      userName: userProfile?.first_name || 'there',
      dayName: session.day_name,
      totalExercises: session.total_exercises,
      completedExercises: session.completed_exercises,
      totalDuration: session.total_duration_minutes,
      completionRate: Math.round(completionRate),
      totalSets,
      completedSets,
      skippedSets,
      avgWeight: Math.round(avgWeight * 10) / 10,
      performanceComparison,
      communicationStyle: userProfile?.communication_style || 'supportive',
      isFirstWorkout: !previousSessions || previousSessions.length === 0
    };

    // Generate AI feedback
    const prompt = `You are an encouraging fitness coach providing post-workout feedback. Keep responses concise and motivational.

Workout Summary:
- User: ${workoutContext.userName}
- Day: ${workoutContext.dayName} workout
- Completed: ${workoutContext.completedExercises}/${workoutContext.totalExercises} exercises
- Duration: ${workoutContext.totalDuration} minutes
- Sets: ${workoutContext.completedSets}/${workoutContext.totalSets} completed (${workoutContext.completionRate}%)
- Average weight: ${workoutContext.avgWeight}kg
- Communication style: ${workoutContext.communicationStyle}
${workoutContext.performanceComparison ? `- Comparison: ${workoutContext.performanceComparison}` : ''}
${workoutContext.isFirstWorkout ? '- This is their first workout with this routine!' : ''}

Provide 2-3 encouraging bullet points about their performance. Focus on:
1. A motivational opening acknowledging their effort
2. Something specific about their performance (completion rate, consistency, improvement)
3. A forward-looking tip or encouragement

${workoutContext.skippedSets > 0 ? `Note: They skipped ${workoutContext.skippedSets} sets - gently encourage without being negative.` : ''}
${workoutContext.totalDuration > 60 ? 'Note: Long workout - suggest recovery tips.' : ''}
${workoutContext.completionRate < 70 ? 'Note: Lower completion rate - provide gentle motivation.' : ''}

Keep each point under 15 words. Be ${workoutContext.communicationStyle} and personalized.`;

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
            content: 'You are an encouraging fitness coach. Provide brief, motivational bullet points about workout performance. Keep responses concise and positive.'
          },
          { role: 'user', content: prompt }
        ],
        max_tokens: 200,
        temperature: 0.7
      }),
    });

    const aiData = await response.json();
    const aiFeedback = aiData.choices?.[0]?.message?.content || "Great work completing your workout today! Keep up the consistency.";

    // Generate smart recommendations
    const recommendations = [];
    
    if (workoutContext.totalDuration > 60) {
      recommendations.push("Consider some post-workout stretching or hydration");
    }
    
    if (workoutContext.completionRate >= 90) {
      recommendations.push("Your consistency is excellent - maybe increase weights next time");
    } else if (workoutContext.completionRate < 70) {
      recommendations.push("Try reducing rest times or weights to complete more sets");
    }
    
    if (workoutContext.avgWeight > 0 && !workoutContext.isFirstWorkout) {
      recommendations.push("Track your progress - consider gradual weight increases");
    }

    return new Response(JSON.stringify({
      aiFeedback,
      recommendations,
      metrics: {
        completionRate: Math.round(completionRate),
        totalSets,
        completedSets,
        duration: session.total_duration_minutes,
        exercisesCompleted: session.completed_exercises,
        totalExercises: session.total_exercises,
        avgWeight: Math.round(avgWeight * 10) / 10,
        performanceComparison
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error generating workout feedback:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      aiFeedback: "Great work completing your workout! Keep pushing forward.",
      recommendations: ["Stay hydrated and get good rest for recovery"],
      metrics: {}
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
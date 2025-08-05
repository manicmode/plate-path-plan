import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { user_id, manual_trigger = false } = await req.json();
    console.log('Analyzing weekly exercise progress for user:', user_id);

    // Calculate week boundaries (Monday to Sunday)
    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const daysToSubtract = currentDay === 0 ? 6 : currentDay - 1; // Get to Monday
    
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - daysToSubtract - 7); // Previous week
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    console.log('Analyzing week:', weekStart.toISOString(), 'to', weekEnd.toISOString());

    // Check if analysis already exists for this week
    const { data: existingInsight } = await supabaseClient
      .from('weekly_exercise_insights')
      .select('*')
      .eq('user_id', user_id)
      .eq('week_start_date', weekStart.toISOString().split('T')[0])
      .single();

    if (existingInsight && !manual_trigger) {
      console.log('Weekly insight already exists for this week');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Weekly insight already exists',
        insight: existingInsight
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch exercise logs for the past week
    const { data: exerciseLogs, error: exerciseError } = await supabaseClient
      .from('exercise_logs')
      .select('*')
      .eq('user_id', user_id)
      .gte('created_at', weekStart.toISOString())
      .lte('created_at', weekEnd.toISOString())
      .order('created_at', { ascending: true });

    if (exerciseError) {
      console.error('Error fetching exercise logs:', exerciseError);
      throw exerciseError;
    }

    console.log('Found', exerciseLogs?.length || 0, 'exercise logs for the week');

    // Fetch user profile for personalization
    const { data: userProfile } = await supabaseClient
      .from('user_profiles')
      .select('first_name, main_health_goal, exercise_frequency, exercise_types')
      .eq('user_id', user_id)
      .single();

    // Analyze the data
    const analysis = analyzeWeeklyData(exerciseLogs || [], weekStart, weekEnd);
    
    // Fetch previous week's data for trend comparison
    const prevWeekStart = new Date(weekStart);
    prevWeekStart.setDate(weekStart.getDate() - 7);
    const prevWeekEnd = new Date(weekEnd);
    prevWeekEnd.setDate(weekEnd.getDate() - 7);

    const { data: prevWeekLogs } = await supabaseClient
      .from('exercise_logs')
      .select('*')
      .eq('user_id', user_id)
      .gte('created_at', prevWeekStart.toISOString())
      .lte('created_at', prevWeekEnd.toISOString());

    const prevAnalysis = analyzeWeeklyData(prevWeekLogs || [], prevWeekStart, prevWeekEnd);

    // Determine volume trend
    const volumeTrend = determineVolumeTrend(analysis, prevAnalysis);

    // Generate AI insights
    const aiInsights = await generateAIInsights(
      analysis, 
      prevAnalysis, 
      volumeTrend, 
      userProfile,
      openAIApiKey
    );

    // Save insights to database
    const insightData = {
      user_id,
      week_start_date: weekStart.toISOString().split('T')[0],
      week_end_date: weekEnd.toISOString().split('T')[0],
      workouts_completed: analysis.workoutsCompleted,
      days_skipped: analysis.daysSkipped,
      total_duration_minutes: analysis.totalDuration,
      total_calories_burned: analysis.totalCalories,
      most_frequent_muscle_groups: analysis.muscleGroups,
      missed_target_areas: analysis.missedAreas,
      volume_trend: volumeTrend,
      motivational_headline: aiInsights.headline,
      progress_message: aiInsights.progressMessage,
      suggestion_tip: aiInsights.suggestionTip
    };

    let savedInsight;
    if (existingInsight) {
      // Update existing insight
      const { data, error } = await supabaseClient
        .from('weekly_exercise_insights')
        .update(insightData)
        .eq('id', existingInsight.id)
        .select()
        .single();
      
      if (error) throw error;
      savedInsight = data;
    } else {
      // Create new insight
      const { data, error } = await supabaseClient
        .from('weekly_exercise_insights')
        .insert([insightData])
        .select()
        .single();
      
      if (error) throw error;
      savedInsight = data;
    }

    console.log('Successfully saved weekly exercise insight');

    return new Response(JSON.stringify({
      success: true,
      message: 'Weekly exercise analysis completed',
      insight: savedInsight,
      analysis
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-weekly-exercise-progress:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function analyzeWeeklyData(logs: any[], weekStart: Date, weekEnd: Date) {
  const workoutDates = new Set();
  let totalDuration = 0;
  let totalCalories = 0;
  const activityTypes: Record<string, number> = {};
  
  logs.forEach(log => {
    const logDate = new Date(log.created_at).toDateString();
    workoutDates.add(logDate);
    
    totalDuration += log.duration_minutes || 0;
    totalCalories += log.calories_burned || 0;
    
    const activity = log.activity_type || 'general';
    activityTypes[activity] = (activityTypes[activity] || 0) + 1;
  });

  // Map activity types to muscle groups (simplified)
  const muscleGroupMapping: Record<string, string[]> = {
    'strength': ['chest', 'back', 'legs', 'arms'],
    'cardio': ['cardio'],
    'yoga': ['flexibility', 'core'],
    'running': ['cardio', 'legs'],
    'cycling': ['cardio', 'legs'],
    'swimming': ['cardio', 'full-body'],
    'general': ['full-body']
  };

  const muscleGroups: string[] = [];
  Object.keys(activityTypes).forEach(activity => {
    const groups = muscleGroupMapping[activity] || ['general'];
    muscleGroups.push(...groups);
  });

  // Get unique muscle groups
  const uniqueMuscleGroups = [...new Set(muscleGroups)];
  
  // Determine missed target areas
  const allTargetAreas = ['chest', 'back', 'legs', 'arms', 'cardio', 'core'];
  const missedAreas = allTargetAreas.filter(area => !uniqueMuscleGroups.includes(area));

  return {
    workoutsCompleted: workoutDates.size,
    daysSkipped: 7 - workoutDates.size,
    totalDuration,
    totalCalories,
    muscleGroups: uniqueMuscleGroups,
    missedAreas,
    activityTypes
  };
}

function determineVolumeTrend(current: any, previous: any): string {
  const currentVolume = current.totalDuration + (current.totalCalories / 10);
  const previousVolume = previous.totalDuration + (previous.totalCalories / 10);
  
  if (currentVolume > previousVolume * 1.1) return 'increasing';
  if (currentVolume < previousVolume * 0.9) return 'decreasing';
  return 'stable';
}

async function generateAIInsights(
  analysis: any, 
  prevAnalysis: any, 
  volumeTrend: string, 
  userProfile: any,
  apiKey: string | undefined
): Promise<{ headline: string; progressMessage: string; suggestionTip: string }> {
  
  if (!apiKey) {
    // Fallback insights if no OpenAI key
    return generateFallbackInsights(analysis, volumeTrend);
  }

  const userName = userProfile?.first_name || 'Champion';
  const healthGoal = userProfile?.main_health_goal || 'general fitness';
  
  const prompt = `You are an expert AI fitness coach analyzing a user's weekly workout performance. Generate uplifting, personalized insights.

User Context:
- Name: ${userName}
- Health Goal: ${healthGoal}
- Target Exercise Frequency: ${userProfile?.exercise_frequency || 'regular'}

This Week's Analysis:
- Workouts Completed: ${analysis.workoutsCompleted}/7 days
- Days Skipped: ${analysis.daysSkipped}
- Total Duration: ${analysis.totalDuration} minutes
- Total Calories: ${analysis.totalCalories}
- Muscle Groups Trained: ${analysis.muscleGroups.join(', ')}
- Missed Areas: ${analysis.missedAreas.join(', ')}
- Volume Trend: ${volumeTrend} compared to last week

Previous Week Comparison:
- Previous Workouts: ${prevAnalysis.workoutsCompleted}
- Previous Duration: ${prevAnalysis.totalDuration} minutes

Generate exactly 3 components (keep each under 150 characters):

1. MOTIVATIONAL_HEADLINE: An energetic, personalized headline that captures their week's performance
2. PROGRESS_MESSAGE: A specific message about their achievements and progress patterns
3. SUGGESTION_TIP: One actionable, encouraging tip for next week

Format your response as JSON:
{
  "headline": "...",
  "progressMessage": "...",
  "suggestionTip": "..."
}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14', // Report analysis requires advanced reasoning
        messages: [
          { role: 'system', content: 'You are an enthusiastic AI fitness coach who provides motivational, personalized feedback.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 300,
        temperature: 0.8
      }),
    });

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;
    
    try {
      return JSON.parse(aiResponse);
    } catch {
      // Fallback to parsing if JSON is malformed
      return generateFallbackInsights(analysis, volumeTrend);
    }
  } catch (error) {
    console.error('Error generating AI insights:', error);
    return generateFallbackInsights(analysis, volumeTrend);
  }
}

function generateFallbackInsights(analysis: any, volumeTrend: string) {
  const headlines = [
    analysis.workoutsCompleted >= 5 ? "You're absolutely crushing it! 🔥" : 
    analysis.workoutsCompleted >= 3 ? "Solid effort this week! 💪" : "Every start counts - let's build momentum! 🌟",
  ];

  const progressMessages = [
    `Hit ${analysis.workoutsCompleted}/7 days with ${analysis.totalDuration} total minutes. Volume is ${volumeTrend}! 📈`,
  ];

  const suggestions = [
    analysis.missedAreas.length > 0 ? `Try adding ${analysis.missedAreas[0]} work next week!` :
    analysis.workoutsCompleted < 4 ? "Aim for one more workout day next week!" :
    "Keep this amazing consistency going! 🚀"
  ];

  return {
    headline: headlines[0],
    progressMessage: progressMessages[0],
    suggestionTip: suggestions[0]
  };
}
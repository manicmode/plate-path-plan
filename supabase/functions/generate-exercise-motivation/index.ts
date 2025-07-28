import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

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
    const { user_id } = await req.json();

    if (!user_id) {
      return new Response(JSON.stringify({ error: 'user_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate current week range (Sunday to Saturday)
    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - currentDay);
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    console.log('Week range:', { startOfWeek, endOfWeek, user_id });

    // Fetch user's exercise goals
    const { data: exerciseGoal, error: goalError } = await supabase
      .from('exercise_goals')
      .select('*')
      .eq('user_id', user_id)
      .maybeSingle();

    if (goalError) {
      console.error('Error fetching exercise goals:', goalError);
    }

    // Use default goals if none found
    const goalMinutes = exerciseGoal?.weekly_target_minutes || 120;
    const goalSessions = exerciseGoal?.sessions_per_week_target || 3;

    // Fetch workout completions for current week
    const { data: workouts, error: workoutError } = await supabase
      .from('workout_completions')
      .select('duration_minutes, completed_at')
      .eq('user_id', user_id)
      .gte('completed_at', startOfWeek.toISOString())
      .lte('completed_at', endOfWeek.toISOString());

    if (workoutError) {
      console.error('Error fetching workouts:', workoutError);
      return new Response(JSON.stringify({ error: 'Failed to fetch workout data' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Calculate weekly stats
    const totalMinutesThisWeek = workouts?.reduce((sum, workout) => sum + (workout.duration_minutes || 0), 0) || 0;
    const sessionsThisWeek = workouts?.length || 0;

    // Calculate completion percentages
    const minutesCompletion = (totalMinutesThisWeek / goalMinutes) * 100;
    const sessionsCompletion = (sessionsThisWeek / goalSessions) * 100;
    const overallCompletion = Math.min(minutesCompletion, sessionsCompletion);

    console.log('Performance:', { 
      totalMinutesThisWeek, 
      sessionsThisWeek, 
      goalMinutes, 
      goalSessions, 
      overallCompletion 
    });

    // Message pools based on performance
    const messagePool = {
      onTrack: [
        "You're crushing it! Only legends keep this pace! 🔥",
        "You already hit your weekly target. Now you're building bonus strength! 💪",
        "Absolutely stellar performance this week! You're setting the bar high! ⭐",
        "Your dedication is paying off big time! Keep this momentum going! 🚀",
        "Champions are made of this kind of consistency! Outstanding work! 🏆"
      ],
      almostThere: [
        "One more session and you've hit your target — LET'S FINISH STRONG! 💥",
        "You're right on the edge of a win. Don't let it slip. Just one more push!",
        "So close to victory! Your next workout seals the deal! 🎯",
        "The finish line is right there! Push through and claim your victory! 🏁",
        "You've come this far — now make it count with one final session! 💪"
      ],
      behind: [
        "Hey, we all fall behind sometimes. Let's turn this around — today is the day. 🚀",
        "Discipline beats motivation. Let's log a short session and get the momentum back. 🧠💪",
        "Every champion faces setbacks. What matters is how you bounce back! 💪",
        "Progress isn't perfect, but persistence wins. Let's restart strong! 🔥",
        "Small steps forward beat standing still. Ready for a quick session? ⚡"
      ]
    };

    // Select appropriate message category and random message
    let selectedMessage: string;
    let category: string;

    if (overallCompletion >= 100) {
      category = 'onTrack';
      selectedMessage = messagePool.onTrack[Math.floor(Math.random() * messagePool.onTrack.length)];
    } else if (overallCompletion >= 75) {
      category = 'almostThere';
      selectedMessage = messagePool.almostThere[Math.floor(Math.random() * messagePool.almostThere.length)];
    } else {
      category = 'behind';
      selectedMessage = messagePool.behind[Math.floor(Math.random() * messagePool.behind.length)];
    }

    const response = {
      status: "success",
      message: selectedMessage,
      category,
      completion: {
        totalMinutesThisWeek,
        sessionsThisWeek,
        goalMinutes,
        goalSessions,
        completionPercentage: Math.round(overallCompletion)
      }
    };

    console.log('Generated motivation:', response);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-exercise-motivation function:', error);
    return new Response(JSON.stringify({ 
      status: "error",
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
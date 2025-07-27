import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    const { user_id, duration_minutes = 15, session_type = 'contrast_therapy' } = await req.json();

    if (!user_id) {
      throw new Error('User ID is required');
    }

    const today = new Date().toISOString().split('T')[0];

    // First, get or create the user's thermotherapy streak record
    let { data: existingStreak, error: streakError } = await supabase
      .from('thermotherapy_streaks')
      .select('*')
      .eq('user_id', user_id)
      .maybeSingle();

    if (streakError) {
      console.error('Error fetching thermotherapy streak:', streakError);
      throw streakError;
    }

    // Calculate streak values
    let newCurrentStreak = 1;
    let newLongestStreak = 1;
    let totalSessions = 1;

    if (existingStreak) {
      totalSessions = existingStreak.total_sessions + 1;
      
      // Check if last completed was yesterday (streak continues) or today (already completed today)
      const lastCompleted = existingStreak.last_completed_date;
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayString = yesterday.toISOString().split('T')[0];

      if (lastCompleted === today) {
        // Already completed today, don't increment streak
        newCurrentStreak = existingStreak.current_streak;
      } else if (lastCompleted === yesterdayString) {
        // Completed yesterday, continue streak
        newCurrentStreak = existingStreak.current_streak + 1;
      } else {
        // Gap in streak, restart at 1
        newCurrentStreak = 1;
      }

      newLongestStreak = Math.max(existingStreak.longest_streak, newCurrentStreak);
    }

    // Update or create thermotherapy streak
    const { error: upsertError } = await supabase
      .from('thermotherapy_streaks')
      .upsert({
        user_id,
        total_sessions: totalSessions,
        current_streak: newCurrentStreak,
        longest_streak: newLongestStreak,
        last_completed_date: today,
        updated_at: new Date().toISOString(),
      });

    if (upsertError) {
      console.error('Error updating thermotherapy streak:', upsertError);
      throw upsertError;
    }

    console.log(`Thermotherapy session logged for user ${user_id}:`, {
      duration_minutes,
      session_type,
      new_streak: newCurrentStreak,
      total_sessions: totalSessions
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Thermotherapy session logged successfully',
        streak: {
          current_streak: newCurrentStreak,
          longest_streak: newLongestStreak,
          total_sessions: totalSessions
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in log-thermotherapy-session function:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        success: false
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
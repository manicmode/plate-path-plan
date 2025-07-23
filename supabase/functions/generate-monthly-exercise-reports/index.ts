import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2'
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface UserData {
  user_id: string;
  first_name?: string;
  last_name?: string;
}

interface ExerciseData {
  user_id: string;
  activity_type: string;
  duration_minutes: number;
  calories_burned: number;
  created_at: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Starting monthly exercise report generation...');

    // Calculate month bounds for the previous month
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const monthStart = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
    const monthEnd = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0);

    console.log(`Generating reports for: ${monthStart.toISOString().split('T')[0]} to ${monthEnd.toISOString().split('T')[0]}`);

    // Get all users who have exercise logs in the past month
    const { data: usersWithExercise, error: usersError } = await supabaseClient
      .from('exercise_logs')
      .select(`
        user_id,
        user_profiles!inner(first_name, last_name)
      `)
      .gte('created_at', monthStart.toISOString())
      .lte('created_at', monthEnd.toISOString());

    if (usersError) {
      console.error('Error fetching users with exercise:', usersError);
      throw usersError;
    }

    if (!usersWithExercise || usersWithExercise.length === 0) {
      console.log('No users with exercise data found for the month');
      return new Response(
        JSON.stringify({ message: 'No users with exercise data found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get unique users
    const uniqueUsers = Array.from(
      new Map(usersWithExercise.map(item => [
        item.user_id, 
        {
          user_id: item.user_id,
          first_name: item.user_profiles?.first_name,
          last_name: item.user_profiles?.last_name
        }
      ])).values()
    ) as UserData[];

    console.log(`Found ${uniqueUsers.length} users with exercise data`);

    const reports = [];

    for (const user of uniqueUsers) {
      try {
        // Check if report already exists for this user and month
        const { data: existingReport } = await supabaseClient
          .from('monthly_exercise_reports')
          .select('id')
          .eq('user_id', user.user_id)
          .eq('month_start', monthStart.toISOString().split('T')[0])
          .single();

        if (existingReport) {
          console.log(`Report already exists for user ${user.user_id}`);
          continue;
        }

        // Get user's exercise data for the month
        const { data: exerciseData, error: exerciseError } = await supabaseClient
          .from('exercise_logs')
          .select('*')
          .eq('user_id', user.user_id)
          .gte('created_at', monthStart.toISOString())
          .lte('created_at', monthEnd.toISOString());

        if (exerciseError) {
          console.error(`Error fetching exercise data for user ${user.user_id}:`, exerciseError);
          continue;
        }

        if (!exerciseData || exerciseData.length === 0) {
          console.log(`No exercise data found for user ${user.user_id}`);
          continue;
        }

        // Calculate metrics
        const totalWorkouts = exerciseData.length;
        const daysInMonth = monthEnd.getDate();
        const uniqueWorkoutDays = new Set(
          exerciseData.map(log => new Date(log.created_at).toDateString())
        ).size;
        const daysSkipped = daysInMonth - uniqueWorkoutDays;
        
        const totalDurationMinutes = exerciseData.reduce(
          (sum: number, log: ExerciseData) => sum + (log.duration_minutes || 0), 0
        );
        
        const totalCaloriesBurned = exerciseData.reduce(
          (sum: number, log: ExerciseData) => sum + (log.calories_burned || 0), 0
        );

        // Count activity types to find most frequent
        const activityCounts: Record<string, number> = {};
        exerciseData.forEach((log: ExerciseData) => {
          const activity = log.activity_type || 'general';
          activityCounts[activity] = (activityCounts[activity] || 0) + 1;
        });

        const mostFrequentActivities = Object.entries(activityCounts)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 3)
          .map(([activity]) => activity);

        // Define target areas and identify missed ones
        const allTargetAreas = ['cardio', 'strength', 'flexibility', 'balance', 'endurance'];
        const userActivities = Object.keys(activityCounts);
        const missedAreas = allTargetAreas.filter(area => 
          !userActivities.some(activity => 
            activity.toLowerCase().includes(area) || 
            (area === 'cardio' && ['running', 'cycling', 'swimming'].includes(activity)) ||
            (area === 'strength' && ['weightlifting', 'bodyweight'].includes(activity))
          )
        );

        // Generate AI content
        const userName = user.first_name || 'there';
        const workoutFrequency = totalWorkouts / (daysInMonth / 7); // workouts per week
        
        let motivationalTitle: string;
        let personalizedMessage: string;
        let smartSuggestions: string;

        if (totalWorkouts >= 20) {
          motivationalTitle = `🔥 ${userName}, You're a Fitness Warrior!`;
          personalizedMessage = `Amazing dedication! You completed ${totalWorkouts} workouts this month, burning ${Math.round(totalCaloriesBurned)} calories in ${Math.round(totalDurationMinutes)} minutes. You're crushing your fitness goals!`;
          smartSuggestions = "Consider adding more recovery days and varying your routine to prevent overtraining. You're doing fantastic!";
        } else if (totalWorkouts >= 12) {
          motivationalTitle = `💪 Great Progress, ${userName}!`;
          personalizedMessage = `Solid month! ${totalWorkouts} workouts show real commitment. You've burned ${Math.round(totalCaloriesBurned)} calories and stayed active for ${Math.round(totalDurationMinutes)} minutes total.`;
          smartSuggestions = `Try to increase frequency slightly - aim for ${Math.ceil(workoutFrequency + 1)} workouts per week. ${missedAreas.length > 0 ? `Consider adding ${missedAreas.slice(0, 2).join(' and ')} to your routine.` : ''}`;
        } else if (totalWorkouts >= 6) {
          motivationalTitle = `🌟 Building Momentum, ${userName}!`;
          personalizedMessage = `Good start with ${totalWorkouts} workouts! Every session counts, and you've already burned ${Math.round(totalCaloriesBurned)} calories this month.`;
          smartSuggestions = `Let's aim for consistency - try to workout 3-4 times per week. ${missedAreas.length > 0 ? `Adding ${missedAreas[0]} could give you great variety!` : 'Keep up the great work!'}`;
        } else {
          motivationalTitle = `🚀 Ready to Restart, ${userName}?`;
          personalizedMessage = `${totalWorkouts > 0 ? `You got started with ${totalWorkouts} workouts - that's the hardest part!` : 'Every fitness journey starts with a single step.'} Let's build on this foundation.`;
          smartSuggestions = "Start small - aim for 10-15 minute sessions, 3 times per week. Focus on activities you enjoy to build the habit first.";
        }

        // Create detailed report data
        const reportData = {
          daily_breakdown: exerciseData.reduce((acc: Record<string, any>, log: ExerciseData) => {
            const date = new Date(log.created_at).toISOString().split('T')[0];
            if (!acc[date]) {
              acc[date] = { workouts: 0, total_duration: 0, total_calories: 0, activities: [] };
            }
            acc[date].workouts += 1;
            acc[date].total_duration += log.duration_minutes || 0;
            acc[date].total_calories += log.calories_burned || 0;
            acc[date].activities.push(log.activity_type);
            return acc;
          }, {}),
          activity_breakdown: activityCounts,
          weekly_averages: {
            workouts_per_week: Math.round(workoutFrequency * 10) / 10,
            duration_per_week: Math.round((totalDurationMinutes / (daysInMonth / 7)) * 10) / 10,
            calories_per_week: Math.round((totalCaloriesBurned / (daysInMonth / 7)) * 10) / 10
          }
        };

        // Insert the report
        const { error: insertError } = await supabaseClient
          .from('monthly_exercise_reports')
          .insert({
            user_id: user.user_id,
            month_start: monthStart.toISOString().split('T')[0],
            month_end: monthEnd.toISOString().split('T')[0],
            total_workouts_completed: totalWorkouts,
            days_skipped: daysSkipped,
            total_duration_minutes: totalDurationMinutes,
            total_calories_burned: totalCaloriesBurned,
            most_frequent_muscle_groups: mostFrequentActivities,
            missed_target_areas: missedAreas,
            motivational_title: motivationalTitle,
            personalized_message: personalizedMessage,
            smart_suggestions: smartSuggestions,
            report_data: reportData
          });

        if (insertError) {
          console.error(`Error inserting report for user ${user.user_id}:`, insertError);
          continue;
        }

        reports.push({
          user_id: user.user_id,
          total_workouts: totalWorkouts,
          title: motivationalTitle
        });

        console.log(`Created report for user ${user.user_id}: ${totalWorkouts} workouts`);

      } catch (userError) {
        console.error(`Error processing user ${user.user_id}:`, userError);
        continue;
      }
    }

    console.log(`Successfully generated ${reports.length} monthly exercise reports`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Generated ${reports.length} monthly exercise reports`,
        reports_summary: reports
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in generate-monthly-exercise-reports function:', error);
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
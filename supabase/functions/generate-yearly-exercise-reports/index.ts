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

interface YearlyMetrics {
  totalWorkouts: number;
  totalDuration: number;
  totalCalories: number;
  daysActive: number;
  daysSkipped: number;
  mostFrequentActivities: string[];
  missedMuscleGroups: string[];
  monthlyBreakdown: Record<string, any>;
  quarterlyTrends: any[];
  yearOverYearComparison?: any;
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

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    console.log('Starting yearly exercise report generation...');

    const { manual_trigger, target_year } = await req.json().catch(() => ({}));

    // Calculate year bounds - default to previous year if automatic, current year if manual
    let year: number;
    if (manual_trigger && target_year) {
      year = target_year;
    } else {
      year = new Date().getFullYear() - 1; // Previous year for cron
    }

    const yearStart = new Date(year, 0, 1); // Jan 1st
    const yearEnd = new Date(year, 11, 31, 23, 59, 59); // Dec 31st

    console.log(`Generating reports for year: ${year} (${yearStart.toISOString().split('T')[0]} to ${yearEnd.toISOString().split('T')[0]})`);

    // Get all users who have exercise logs in the target year
    const { data: usersWithExercise, error: usersError } = await supabaseClient
      .from('exercise_logs')
      .select(`
        user_id,
        user_profiles!inner(first_name, last_name)
      `)
      .gte('created_at', yearStart.toISOString())
      .lte('created_at', yearEnd.toISOString());

    if (usersError) {
      console.error('Error fetching users with exercise:', usersError);
      throw usersError;
    }

    if (!usersWithExercise || usersWithExercise.length === 0) {
      console.log('No users with exercise data found for the year');
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

    console.log(`Found ${uniqueUsers.length} users with exercise data for ${year}`);

    const reports = [];

    for (const user of uniqueUsers) {
      try {
        // Check if report already exists for this user and year (unless manual trigger)
        if (!manual_trigger) {
          const { data: existingReport } = await supabaseClient
            .from('yearly_exercise_reports')
            .select('id')
            .eq('user_id', user.user_id)
            .eq('year_start', yearStart.toISOString().split('T')[0])
            .single();

          if (existingReport) {
            console.log(`Report already exists for user ${user.user_id} for year ${year}`);
            continue;
          }
        }

        // Get user's exercise data for the entire year
        const { data: exerciseData, error: exerciseError } = await supabaseClient
          .from('exercise_logs')
          .select('*')
          .eq('user_id', user.user_id)
          .gte('created_at', yearStart.toISOString())
          .lte('created_at', yearEnd.toISOString())
          .order('created_at', { ascending: true });

        if (exerciseError) {
          console.error(`Error fetching exercise data for user ${user.user_id}:`, exerciseError);
          continue;
        }

        if (!exerciseData || exerciseData.length === 0) {
          console.log(`No exercise data found for user ${user.user_id} in ${year}`);
          continue;
        }

        // Calculate comprehensive yearly metrics
        const metrics = calculateYearlyMetrics(exerciseData, year);

        // Get previous year data for comparison
        const previousYear = year - 1;
        const prevYearStart = new Date(previousYear, 0, 1);
        const prevYearEnd = new Date(previousYear, 11, 31, 23, 59, 59);

        const { data: prevYearData } = await supabaseClient
          .from('exercise_logs')
          .select('*')
          .eq('user_id', user.user_id)
          .gte('created_at', prevYearStart.toISOString())
          .lte('created_at', prevYearEnd.toISOString());

        let yearOverYearComparison = {};
        if (prevYearData && prevYearData.length > 0) {
          const prevMetrics = calculateYearlyMetrics(prevYearData, previousYear);
          yearOverYearComparison = {
            workouts_change: metrics.totalWorkouts - prevMetrics.totalWorkouts,
            workouts_change_percent: prevMetrics.totalWorkouts > 0 
              ? Math.round(((metrics.totalWorkouts - prevMetrics.totalWorkouts) / prevMetrics.totalWorkouts) * 100) 
              : 100,
            duration_change: metrics.totalDuration - prevMetrics.totalDuration,
            calories_change: metrics.totalCalories - prevMetrics.totalCalories,
            activity_days_change: metrics.daysActive - prevMetrics.daysActive
          };
        }

        // Generate AI content using OpenAI
        const aiContent = await generateAIContent(metrics, yearOverYearComparison, user, year, openAIApiKey);

        // Prepare report data
        const reportData = {
          monthly_breakdown: metrics.monthlyBreakdown,
          quarterly_trends: metrics.quarterlyTrends,
          activity_distribution: getActivityDistribution(exerciseData),
          peak_months: getPeakMonths(metrics.monthlyBreakdown),
          consistency_score: calculateConsistencyScore(exerciseData),
          fitness_milestones: identifyMilestones(exerciseData),
          year_over_year: yearOverYearComparison
        };

        // Insert or update the report
        const reportRecord = {
          user_id: user.user_id,
          year_start: yearStart.toISOString().split('T')[0],
          year_end: yearEnd.toISOString().split('T')[0],
          total_workouts_completed: metrics.totalWorkouts,
          total_duration_minutes: metrics.totalDuration,
          total_calories_burned: metrics.totalCalories,
          days_active: metrics.daysActive,
          days_skipped: metrics.daysSkipped,
          most_frequent_muscle_groups: metrics.mostFrequentActivities,
          missed_muscle_groups: metrics.missedMuscleGroups,
          year_over_year_progress: yearOverYearComparison,
          motivational_title: aiContent.title,
          personalized_message: aiContent.message,
          smart_suggestions: aiContent.suggestions,
          report_data: reportData
        };

        let insertError;
        if (manual_trigger) {
          // For manual trigger, use upsert
          const { error } = await supabaseClient
            .from('yearly_exercise_reports')
            .upsert(reportRecord, { 
              onConflict: 'user_id,year_start',
              ignoreDuplicates: false 
            });
          insertError = error;
        } else {
          // For automatic cron, use insert
          const { error } = await supabaseClient
            .from('yearly_exercise_reports')
            .insert(reportRecord);
          insertError = error;
        }

        if (insertError) {
          console.error(`Error ${manual_trigger ? 'upserting' : 'inserting'} report for user ${user.user_id}:`, insertError);
          continue;
        }

        reports.push({
          user_id: user.user_id,
          year,
          total_workouts: metrics.totalWorkouts,
          title: aiContent.title
        });

        console.log(`${manual_trigger ? 'Updated' : 'Created'} report for user ${user.user_id}: ${metrics.totalWorkouts} workouts in ${year}`);

      } catch (userError) {
        console.error(`Error processing user ${user.user_id}:`, userError);
        continue;
      }
    }

    console.log(`Successfully generated ${reports.length} yearly exercise reports for ${year}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Generated ${reports.length} yearly exercise reports for ${year}`,
        year,
        manual_trigger: !!manual_trigger,
        reports_summary: reports
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in generate-yearly-exercise-reports function:', error);
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

function calculateYearlyMetrics(exerciseData: ExerciseData[], year: number): YearlyMetrics {
  const totalWorkouts = exerciseData.length;
  const totalDuration = exerciseData.reduce((sum, log) => sum + (log.duration_minutes || 0), 0);
  const totalCalories = exerciseData.reduce((sum, log) => sum + (log.calories_burned || 0), 0);
  
  // Calculate unique workout days
  const uniqueWorkoutDays = new Set(
    exerciseData.map(log => new Date(log.created_at).toDateString())
  ).size;
  
  const daysInYear = isLeapYear(year) ? 366 : 365;
  const daysSkipped = daysInYear - uniqueWorkoutDays;
  
  // Activity analysis
  const activityCounts: Record<string, number> = {};
  exerciseData.forEach(log => {
    const activity = log.activity_type || 'general';
    activityCounts[activity] = (activityCounts[activity] || 0) + 1;
  });
  
  const mostFrequentActivities = Object.entries(activityCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([activity]) => activity);
  
  // Define comprehensive muscle groups and identify missed ones
  const allMuscleGroups = [
    'cardio', 'strength', 'flexibility', 'balance', 'endurance',
    'upper_body', 'lower_body', 'core', 'full_body'
  ];
  
  const userActivities = Object.keys(activityCounts);
  const missedMuscleGroups = allMuscleGroups.filter(group => 
    !userActivities.some(activity => 
      activity.toLowerCase().includes(group.replace('_', '')) ||
      (group === 'cardio' && ['running', 'cycling', 'swimming', 'walking'].some(cardio => activity.toLowerCase().includes(cardio))) ||
      (group === 'strength' && ['weightlifting', 'bodyweight', 'resistance'].some(strength => activity.toLowerCase().includes(strength)))
    )
  );
  
  // Monthly breakdown
  const monthlyBreakdown: Record<string, any> = {};
  for (let month = 0; month < 12; month++) {
    const monthData = exerciseData.filter(log => 
      new Date(log.created_at).getMonth() === month
    );
    
    monthlyBreakdown[month] = {
      month_name: new Date(year, month).toLocaleString('default', { month: 'long' }),
      workouts: monthData.length,
      duration: monthData.reduce((sum, log) => sum + (log.duration_minutes || 0), 0),
      calories: monthData.reduce((sum, log) => sum + (log.calories_burned || 0), 0),
      unique_days: new Set(monthData.map(log => new Date(log.created_at).toDateString())).size
    };
  }
  
  // Quarterly trends
  const quarterlyTrends = [];
  for (let quarter = 0; quarter < 4; quarter++) {
    const quarterMonths = [quarter * 3, quarter * 3 + 1, quarter * 3 + 2];
    const quarterData = exerciseData.filter(log => 
      quarterMonths.includes(new Date(log.created_at).getMonth())
    );
    
    quarterlyTrends.push({
      quarter: quarter + 1,
      quarter_name: `Q${quarter + 1} ${year}`,
      workouts: quarterData.length,
      duration: quarterData.reduce((sum, log) => sum + (log.duration_minutes || 0), 0),
      calories: quarterData.reduce((sum, log) => sum + (log.calories_burned || 0), 0),
      avg_workouts_per_month: quarterData.length / 3
    });
  }
  
  return {
    totalWorkouts,
    totalDuration,
    totalCalories,
    daysActive: uniqueWorkoutDays,
    daysSkipped,
    mostFrequentActivities,
    missedMuscleGroups,
    monthlyBreakdown,
    quarterlyTrends
  };
}

async function generateAIContent(
  metrics: YearlyMetrics, 
  yearOverYear: any, 
  user: UserData, 
  year: number,
  apiKey: string
): Promise<{ title: string; message: string; suggestions: string }> {
  
  const userName = user.first_name || 'there';
  const workoutsPerMonth = Math.round(metrics.totalWorkouts / 12);
  const hoursPerWeek = Math.round((metrics.totalDuration / 52) / 60 * 10) / 10;
  
  const prompt = `Create a personalized yearly fitness report for ${userName} based on their ${year} exercise data:

EXERCISE STATS:
- Total Workouts: ${metrics.totalWorkouts}
- Total Duration: ${Math.round(metrics.totalDuration / 60)} hours
- Total Calories: ${Math.round(metrics.totalCalories)}
- Active Days: ${metrics.daysActive} out of ${isLeapYear(year) ? 366 : 365}
- Average: ${workoutsPerMonth} workouts/month, ${hoursPerWeek} hours/week
- Top Activities: ${metrics.mostFrequentActivities.slice(0, 3).join(', ')}
- Areas to Explore: ${metrics.missedMuscleGroups.slice(0, 3).join(', ')}

YEAR-OVER-YEAR COMPARISON:
${yearOverYear.workouts_change ? `Workouts changed by ${yearOverYear.workouts_change} (${yearOverYear.workouts_change_percent > 0 ? '+' : ''}${yearOverYear.workouts_change_percent}%)` : 'First year with data'}

Generate exactly 3 items:

1. MOTIVATIONAL_TITLE: A fun, encouraging title that celebrates their ${year} fitness journey (max 8 words)

2. PERSONALIZED_MESSAGE: A warm, detailed message (2-3 sentences) highlighting their biggest achievements and progress in ${year}

3. SMART_SUGGESTIONS: Specific, actionable advice for their ${year + 1} fitness goals based on their data (2-3 sentences)

Keep the tone upbeat, personal, and motivating. Focus on their unique journey and specific achievements.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14', // Exercise report analysis requires advanced reasoning
        messages: [
          {
            role: 'system',
            content: 'You are a highly motivational fitness coach who creates personalized yearly fitness reports. Always respond with exactly the 3 requested items labeled clearly.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Parse the AI response
    const lines = content.split('\n').filter((line: string) => line.trim());
    
    let title = '', message = '', suggestions = '';
    
    for (const line of lines) {
      if (line.includes('MOTIVATIONAL_TITLE:') || line.includes('1.')) {
        title = line.replace(/^\d+\.\s*MOTIVATIONAL_TITLE:\s*/i, '').trim();
      } else if (line.includes('PERSONALIZED_MESSAGE:') || line.includes('2.')) {
        message = line.replace(/^\d+\.\s*PERSONALIZED_MESSAGE:\s*/i, '').trim();
      } else if (line.includes('SMART_SUGGESTIONS:') || line.includes('3.')) {
        suggestions = line.replace(/^\d+\.\s*SMART_SUGGESTIONS:\s*/i, '').trim();
      }
    }
    
    // Fallback content if parsing fails
    if (!title || !message || !suggestions) {
      title = title || `🎉 ${userName}'s Amazing ${year} Fitness Journey!`;
      message = message || `You completed ${metrics.totalWorkouts} workouts in ${year}, burning ${Math.round(metrics.totalCalories)} calories and staying active for ${Math.round(metrics.totalDuration / 60)} hours total. Your dedication and consistency have been remarkable!`;
      suggestions = suggestions || `For ${year + 1}, consider adding ${metrics.missedMuscleGroups.slice(0, 2).join(' and ')} to diversify your routine. Aim to increase your weekly workout frequency slightly while maintaining the great momentum you've built.`;
    }
    
    return { title, message, suggestions };
    
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    
    // Fallback content
    return {
      title: `🏆 ${userName}'s Incredible ${year} Journey!`,
      message: `What an amazing year! You completed ${metrics.totalWorkouts} workouts, burned ${Math.round(metrics.totalCalories)} calories, and stayed active for ${Math.round(metrics.totalDuration / 60)} hours total. Your commitment to fitness has been truly inspiring!`,
      suggestions: `For ${year + 1}, consider exploring ${metrics.missedMuscleGroups.slice(0, 2).join(' and ')} activities to add variety. Keep up the fantastic work and aim for even more consistency in the coming year!`
    };
  }
}

function getActivityDistribution(exerciseData: ExerciseData[]): Record<string, number> {
  const distribution: Record<string, number> = {};
  exerciseData.forEach(log => {
    const activity = log.activity_type || 'general';
    distribution[activity] = (distribution[activity] || 0) + 1;
  });
  return distribution;
}

function getPeakMonths(monthlyData: Record<string, any>): string[] {
  const months = Object.entries(monthlyData)
    .sort(([,a], [,b]) => b.workouts - a.workouts)
    .slice(0, 3)
    .map(([,data]) => data.month_name);
  return months;
}

function calculateConsistencyScore(exerciseData: ExerciseData[]): number {
  if (exerciseData.length === 0) return 0;
  
  // Calculate how evenly distributed workouts are throughout the year
  const weeks: Record<string, number> = {};
  exerciseData.forEach(log => {
    const date = new Date(log.created_at);
    const weekKey = `${date.getFullYear()}-W${Math.ceil(date.getDate() / 7)}-${date.getMonth()}`;
    weeks[weekKey] = (weeks[weekKey] || 0) + 1;
  });
  
  const weekCounts = Object.values(weeks);
  const avgWorkoutsPerWeek = weekCounts.reduce((sum, count) => sum + count, 0) / 52;
  const variance = weekCounts.reduce((sum, count) => sum + Math.pow(count - avgWorkoutsPerWeek, 2), 0) / weekCounts.length;
  
  // Score from 0-100, where lower variance = higher consistency
  return Math.max(0, Math.min(100, 100 - (variance * 10)));
}

function identifyMilestones(exerciseData: ExerciseData[]): string[] {
  const milestones: string[] = [];
  const totalWorkouts = exerciseData.length;
  const totalHours = Math.round(exerciseData.reduce((sum, log) => sum + (log.duration_minutes || 0), 0) / 60);
  const totalCalories = Math.round(exerciseData.reduce((sum, log) => sum + (log.calories_burned || 0), 0));
  
  if (totalWorkouts >= 200) milestones.push('Fitness Fanatic - 200+ Workouts');
  else if (totalWorkouts >= 100) milestones.push('Century Club - 100+ Workouts');
  else if (totalWorkouts >= 50) milestones.push('Consistency Champion - 50+ Workouts');
  
  if (totalHours >= 100) milestones.push('Time Warrior - 100+ Hours');
  else if (totalHours >= 50) milestones.push('Dedication Hero - 50+ Hours');
  
  if (totalCalories >= 50000) milestones.push('Calorie Crusher - 50K+ Burned');
  else if (totalCalories >= 25000) milestones.push('Burn Master - 25K+ Calories');
  
  // Monthly consistency milestone
  const monthsWithWorkouts = new Set(
    exerciseData.map(log => new Date(log.created_at).getMonth())
  ).size;
  
  if (monthsWithWorkouts === 12) milestones.push('Year-Round Warrior - Active Every Month');
  else if (monthsWithWorkouts >= 9) milestones.push('Consistency Star - 9+ Active Months');
  
  return milestones;
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}
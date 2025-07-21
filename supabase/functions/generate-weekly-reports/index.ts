import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface User {
  id: string;
  email: string;
}

interface WeeklyReportData {
  nutrition: {
    logs: any[];
    totalCalories: number;
    avgProtein: number;
    avgCarbs: number;
    avgFat: number;
    mealCount: number;
    avgQualityScore: number;
  };
  mood: {
    logs: any[];
    avgMood: number;
    avgEnergy: number;
    avgWellness: number;
    journalEntries: number;
  };
  hydration: {
    logs: any[];
    totalVolume: number;
    avgDailyVolume: number;
    logCount: number;
  };
  supplements: {
    logs: any[];
    uniqueSupplements: number;
    totalDoses: number;
    complianceRate: number;
  };
  toxins: {
    detections: any[];
    flaggedFoodCount: number;
    severityBreakdown: Record<string, number>;
  };
  exercise: {
    totalWorkouts: number;
    avgIntensity: number;
    totalDuration: number;
  };
  streaks: {
    nutrition: number;
    hydration: number;
    supplements: number;
  };
}

Deno.serve(async (req) => {
  console.log('🕒 Weekly report generation started');
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Calculate week dates (Sunday to Saturday)
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const weekEndDate = new Date(now);
    weekEndDate.setDate(now.getDate() - dayOfWeek); // Go to last Sunday
    weekEndDate.setHours(23, 59, 59, 999);
    
    const weekStartDate = new Date(weekEndDate);
    weekStartDate.setDate(weekEndDate.getDate() - 6); // Go back 6 days
    weekStartDate.setHours(0, 0, 0, 0);

    console.log(`📅 Generating reports for week: ${weekStartDate.toISOString().split('T')[0]} to ${weekEndDate.toISOString().split('T')[0]}`);

    // Get all active users
    const { data: users, error: usersError } = await supabase
      .from('user_profiles')
      .select('user_id')
      .not('user_id', 'is', null);

    if (usersError) {
      throw new Error(`Error fetching users: ${usersError.message}`);
    }

    console.log(`👥 Found ${users?.length || 0} users to generate reports for`);

    let successCount = 0;
    let errorCount = 0;

    // Generate report for each user
    for (const user of users || []) {
      try {
        console.log(`📊 Generating report for user: ${user.user_id}`);
        
        // Check if report already exists for this week
        const { data: existingReport } = await supabase
          .from('weekly_reports')
          .select('id')
          .eq('user_id', user.user_id)
          .eq('week_start_date', weekStartDate.toISOString().split('T')[0])
          .single();

        if (existingReport) {
          console.log(`⏭️ Report already exists for user ${user.user_id}, skipping`);
          continue;
        }

        // Collect user data for the week
        const reportData = await collectUserWeekData(supabase, user.user_id, weekStartDate, weekEndDate);
        
        // Calculate overall score
        const overallScore = calculateOverallScore(reportData);
        
        // Generate summary text
        const summaryText = generateSummaryText(reportData);
        
        // Generate title
        const title = generateWeekTitle(weekStartDate);

        // Insert the report
        const { error: insertError } = await supabase
          .from('weekly_reports')
          .insert({
            user_id: user.user_id,
            week_start_date: weekStartDate.toISOString().split('T')[0],
            week_end_date: weekEndDate.toISOString().split('T')[0],
            title,
            report_data: reportData,
            summary_text: summaryText,
            overall_score: overallScore
          });

        if (insertError) {
          console.error(`❌ Error inserting report for user ${user.user_id}:`, insertError);
          errorCount++;
        } else {
          console.log(`✅ Successfully generated report for user ${user.user_id}`);
          successCount++;
        }

      } catch (error) {
        console.error(`❌ Error processing user ${user.user_id}:`, error);
        errorCount++;
      }
    }

    console.log(`🎉 Report generation completed. Success: ${successCount}, Errors: ${errorCount}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Weekly reports generated successfully. Success: ${successCount}, Errors: ${errorCount}`,
        stats: { successCount, errorCount, totalUsers: users?.length || 0 }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('💥 Fatal error in weekly report generation:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        message: 'Failed to generate weekly reports'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

async function collectUserWeekData(supabase: any, userId: string, startDate: Date, endDate: Date): Promise<WeeklyReportData> {
  const start = startDate.toISOString();
  const end = endDate.toISOString();

  console.log(`🔍 Collecting data for user ${userId} from ${start} to ${end}`);

  // Fetch nutrition logs
  const { data: nutritionLogs } = await supabase
    .from('nutrition_logs')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', start)
    .lte('created_at', end)
    .order('created_at', { ascending: true });

  // Fetch mood logs
  const { data: moodLogs } = await supabase
    .from('mood_logs')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', start)
    .lte('created_at', end)
    .order('created_at', { ascending: true });

  // Fetch hydration logs
  const { data: hydrationLogs } = await supabase
    .from('hydration_logs')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', start)
    .lte('created_at', end)
    .order('created_at', { ascending: true });

  // Fetch supplement logs
  const { data: supplementLogs } = await supabase
    .from('supplement_logs')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', start)
    .lte('created_at', end)
    .order('created_at', { ascending: true });

  // Fetch toxin detections
  const { data: toxinDetections } = await supabase
    .from('toxin_detections')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', start)
    .lte('created_at', end)
    .order('created_at', { ascending: true });

  // Fetch user profile for streaks
  const { data: userProfile } = await supabase
    .from('user_profiles')
    .select('current_nutrition_streak, current_hydration_streak, current_supplement_streak')
    .eq('user_id', userId)
    .single();

  // Process nutrition data
  const totalCalories = nutritionLogs?.reduce((sum: number, log: any) => sum + (log.calories || 0), 0) || 0;
  const avgProtein = nutritionLogs?.length ? nutritionLogs.reduce((sum: number, log: any) => sum + (log.protein || 0), 0) / nutritionLogs.length : 0;
  const avgCarbs = nutritionLogs?.length ? nutritionLogs.reduce((sum: number, log: any) => sum + (log.carbs || 0), 0) / nutritionLogs.length : 0;
  const avgFat = nutritionLogs?.length ? nutritionLogs.reduce((sum: number, log: any) => sum + (log.fat || 0), 0) / nutritionLogs.length : 0;
  const avgQualityScore = nutritionLogs?.length ? nutritionLogs.reduce((sum: number, log: any) => sum + (log.quality_score || 0), 0) / nutritionLogs.length : 0;

  // Process mood data
  const avgMood = moodLogs?.length ? moodLogs.reduce((sum: number, log: any) => sum + (log.mood || 0), 0) / moodLogs.length : 0;
  const avgEnergy = moodLogs?.length ? moodLogs.reduce((sum: number, log: any) => sum + (log.energy || 0), 0) / moodLogs.length : 0;
  const avgWellness = moodLogs?.length ? moodLogs.reduce((sum: number, log: any) => sum + (log.wellness || 0), 0) / moodLogs.length : 0;
  const journalEntries = moodLogs?.filter((log: any) => log.journal_text?.length > 0).length || 0;

  // Process hydration data
  const totalVolume = hydrationLogs?.reduce((sum: number, log: any) => sum + (log.volume || 0), 0) || 0;
  const avgDailyVolume = totalVolume / 7; // Weekly average

  // Process supplement data
  const uniqueSupplements = new Set(supplementLogs?.map((log: any) => log.name) || []).size;
  const totalDoses = supplementLogs?.length || 0;
  const complianceRate = calculateSupplementCompliance(supplementLogs || []);

  // Process toxin data
  const flaggedFoodCount = toxinDetections?.length || 0;
  const severityBreakdown = toxinDetections?.reduce((acc: Record<string, number>, detection: any) => {
    const severity = detection.severity || 'medium';
    acc[severity] = (acc[severity] || 0) + 1;
    return acc;
  }, {}) || {};

  return {
    nutrition: {
      logs: nutritionLogs || [],
      totalCalories,
      avgProtein,
      avgCarbs,
      avgFat,
      mealCount: nutritionLogs?.length || 0,
      avgQualityScore
    },
    mood: {
      logs: moodLogs || [],
      avgMood,
      avgEnergy,
      avgWellness,
      journalEntries
    },
    hydration: {
      logs: hydrationLogs || [],
      totalVolume,
      avgDailyVolume,
      logCount: hydrationLogs?.length || 0
    },
    supplements: {
      logs: supplementLogs || [],
      uniqueSupplements,
      totalDoses,
      complianceRate
    },
    toxins: {
      detections: toxinDetections || [],
      flaggedFoodCount,
      severityBreakdown
    },
    exercise: {
      totalWorkouts: 0, // We don't have exercise logs table yet
      avgIntensity: 0,
      totalDuration: 0
    },
    streaks: {
      nutrition: userProfile?.current_nutrition_streak || 0,
      hydration: userProfile?.current_hydration_streak || 0,
      supplements: userProfile?.current_supplement_streak || 0
    }
  };
}

function calculateSupplementCompliance(logs: any[]): number {
  if (!logs.length) return 0;
  
  // Simple compliance calculation - could be more sophisticated
  const dailyLogs = logs.reduce((acc: Record<string, number>, log: any) => {
    const date = log.created_at.split('T')[0];
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {});
  
  const daysWithLogs = Object.keys(dailyLogs).length;
  return Math.min(100, (daysWithLogs / 7) * 100);
}

function calculateOverallScore(data: WeeklyReportData): number {
  let score = 0;
  let factors = 0;

  // Nutrition score (40% weight)
  if (data.nutrition.mealCount > 0) {
    const nutritionScore = Math.min(100, (data.nutrition.avgQualityScore / 10) * 100);
    score += nutritionScore * 0.4;
    factors += 0.4;
  }

  // Mood score (20% weight)
  if (data.mood.logs.length > 0) {
    const moodScore = (data.mood.avgMood / 10) * 100;
    score += moodScore * 0.2;
    factors += 0.2;
  }

  // Hydration score (15% weight)
  if (data.hydration.logCount > 0) {
    const hydrationScore = Math.min(100, (data.hydration.avgDailyVolume / 2000) * 100); // Assuming 2L target
    score += hydrationScore * 0.15;
    factors += 0.15;
  }

  // Supplement compliance (15% weight)
  if (data.supplements.totalDoses > 0) {
    score += data.supplements.complianceRate * 0.15;
    factors += 0.15;
  }

  // Toxin penalty (10% weight)
  const toxinPenalty = Math.min(50, data.toxins.flaggedFoodCount * 5); // Max 50% penalty
  score += (100 - toxinPenalty) * 0.1;
  factors += 0.1;

  return factors > 0 ? Math.round(score / factors) : 0;
}

function generateSummaryText(data: WeeklyReportData): string {
  const insights = [];

  if (data.nutrition.mealCount > 0) {
    insights.push(`Logged ${data.nutrition.mealCount} meals with an average quality score of ${data.nutrition.avgQualityScore.toFixed(1)}/10`);
  }

  if (data.mood.avgMood > 0) {
    insights.push(`Maintained an average mood of ${data.mood.avgMood.toFixed(1)}/10`);
  }

  if (data.hydration.totalVolume > 0) {
    insights.push(`Consumed ${Math.round(data.hydration.totalVolume)}ml of fluids`);
  }

  if (data.supplements.totalDoses > 0) {
    insights.push(`${data.supplements.complianceRate.toFixed(0)}% supplement compliance`);
  }

  if (data.toxins.flaggedFoodCount > 0) {
    insights.push(`${data.toxins.flaggedFoodCount} flagged foods detected`);
  }

  return insights.length > 0 ? insights.join('; ') : 'Limited activity this week';
}

function generateWeekTitle(startDate: Date): string {
  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];
  
  const month = monthNames[startDate.getMonth()];
  const weekNumber = Math.ceil(startDate.getDate() / 7);
  
  return `${month} – Week ${weekNumber}`;
}
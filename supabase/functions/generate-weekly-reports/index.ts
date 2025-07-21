import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WeeklyReportData {
  nutrition: {
    totalCalories: number;
    avgProtein: number;
    avgCarbs: number;
    avgFat: number;
    mealCount: number;
    avgQualityScore: number;
    proteinGoalPercentage: number;
    calorieGoalPercentage: number;
    dailyData: Array<{date: string, calories: number, protein: number, quality: number, carbs: number, fat: number}>;
  };
  mood: {
    avgMood: number;
    avgEnergy: number;
    avgWellness: number;
    journalEntries: number;
    trendDirection: string;
    dailyData: Array<{date: string, mood: number, energy: number, wellness: number}>;
  };
  exercise: {
    totalWorkouts: number;
    avgSteps: number;
    totalDuration: number;
    avgIntensity: number;
    activeDays: number;
    dailyData: Array<{date: string, steps: number, workouts: number, duration: number, intensity: string}>;
  };
  hydration: {
    totalVolume: number;
    avgDailyVolume: number;
    goalComplianceDays: number;
    consistencyScore: number;
    dailyData: Array<{date: string, volume: number, goal: number}>;
  };
  supplements: {
    uniqueSupplements: number;
    totalDoses: number;
    compliancePercentage: number;
    missedDays: number;
    dailyData: Array<{date: string, count: number}>;
  };
  toxins: {
    flaggedFoodCount: number;
    severityBreakdown: Record<string, number>;
    totalExposure: number;
  };
  streaks: {
    nutrition: number;
    hydration: number;
    supplements: number;
    exercise: number;
  };
  weeklyScores: {
    nutrition: number;
    mood: number;
    exercise: number;
    hydration: number;
    supplements: number;
    overall: number;
  };
  weekStats: {
    totalMeals: number;
    avgMoodScore: number;
    totalExercises: number;
    avgHydration: number;
    supplementDays: number;
  };
  achievements: string[];
  improvements: string[];
  recommendations: string[];
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
  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];

  // Fetch user profile for goals
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  // Fetch nutrition logs
  const { data: nutritionLogs } = await supabase
    .from('nutrition_logs')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())
    .order('created_at');

  // Fetch mood logs
  const { data: moodLogs } = await supabase
    .from('mood_logs')
    .select('*')
    .eq('user_id', userId)
    .gte('date', startDateStr)
    .lte('date', endDateStr)
    .order('date');

  // Fetch hydration logs
  const { data: hydrationLogs } = await supabase
    .from('hydration_logs')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())
    .order('created_at');

  // Fetch supplement logs
  const { data: supplementLogs } = await supabase
    .from('supplement_logs')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())
    .order('created_at');

  // Fetch exercise logs
  const { data: exerciseLogs } = await supabase
    .from('exercise_logs')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())
    .order('created_at');

  // Fetch toxin detections
  const { data: toxinDetections } = await supabase
    .from('toxin_detections')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())
    .order('created_at');

  // Process nutrition data
  const nutritionData = processNutritionData(nutritionLogs || [], profile);
  
  // Process mood data
  const moodData = processMoodData(moodLogs || []);
  
  // Process hydration data
  const hydrationData = processHydrationData(hydrationLogs || [], profile);
  
  // Process supplement data
  const supplementData = processSupplementData(supplementLogs || []);
  
  // Process exercise data
  const exerciseData = processExerciseData(exerciseLogs || []);
  
  // Process toxin data
  const toxinData = processToxinData(toxinDetections || []);

  // Calculate scores
  const nutritionScore = calculateNutritionScore(nutritionData, profile);
  const moodScore = calculateMoodScore(moodData);
  const exerciseScore = calculateExerciseScore(exerciseData);
  const hydrationScore = calculateHydrationScore(hydrationData);
  const supplementScore = calculateSupplementScore(supplementData);
  
  const overallScore = (
    nutritionScore * 0.35 +
    moodScore * 0.20 +
    exerciseScore * 0.15 +
    hydrationScore * 0.15 +
    supplementScore * 0.10 +
    (100 - Math.min(toxinData.totalExposure * 10, 50)) * 0.05
  );

  // Generate insights
  const achievements = generateAchievements(nutritionData, moodData, exerciseData, hydrationData, supplementData);
  const improvements = generateImprovements(nutritionData, moodData, exerciseData);
  const recommendations = generateRecommendations(nutritionData, moodData, exerciseData, hydrationData, profile);

  return {
    nutrition: nutritionData,
    mood: moodData,
    exercise: exerciseData,
    hydration: hydrationData,
    supplements: supplementData,
    toxins: toxinData,
    streaks: {
      nutrition: profile?.current_nutrition_streak || 0,
      hydration: profile?.current_hydration_streak || 0,
      supplements: profile?.current_supplement_streak || 0,
      exercise: calculateExerciseStreak(exerciseLogs || [])
    },
    weeklyScores: {
      nutrition: Math.round(nutritionScore),
      mood: Math.round(moodScore),
      exercise: Math.round(exerciseScore),
      hydration: Math.round(hydrationScore),
      supplements: Math.round(supplementScore),
      overall: Math.round(overallScore)
    },
    weekStats: {
      totalMeals: nutritionData.mealCount,
      avgMoodScore: moodData.avgMood,
      totalExercises: exerciseData.totalWorkouts,
      avgHydration: hydrationData.avgDailyVolume,
      supplementDays: supplementData.totalDoses > 0 ? 7 - supplementData.missedDays : 0
    },
    achievements,
    improvements,
    recommendations
  };
}

function processNutritionData(logs: any[], profile: any) {
  const dailyData = getDailyNutritionData(logs);
  const totalCalories = logs.reduce((sum, log) => sum + (log.calories || 0), 0);
  const avgProtein = logs.length > 0 ? logs.reduce((sum, log) => sum + (log.protein || 0), 0) / logs.length : 0;
  const avgCarbs = logs.length > 0 ? logs.reduce((sum, log) => sum + (log.carbs || 0), 0) / logs.length : 0;
  const avgFat = logs.length > 0 ? logs.reduce((sum, log) => sum + (log.fat || 0), 0) / logs.length : 0;
  const avgQualityScore = logs.filter(log => log.quality_score).length > 0 
    ? logs.filter(log => log.quality_score).reduce((sum, log) => sum + log.quality_score, 0) / logs.filter(log => log.quality_score).length 
    : 0;

  const targetCalories = profile?.target_calories || 2000;
  const targetProtein = profile?.target_protein || 150;

  return {
    totalCalories: Math.round(totalCalories),
    avgProtein: Math.round(avgProtein),
    avgCarbs: Math.round(avgCarbs),
    avgFat: Math.round(avgFat),
    mealCount: logs.length,
    avgQualityScore: Math.round(avgQualityScore * 100) / 100,
    proteinGoalPercentage: Math.round((avgProtein / targetProtein) * 100),
    calorieGoalPercentage: Math.round((totalCalories / 7 / targetCalories) * 100),
    dailyData
  };
}

function getDailyNutritionData(logs: any[]) {
  const dailyMap = new Map();
  
  logs.forEach(log => {
    const date = log.created_at.split('T')[0];
    if (!dailyMap.has(date)) {
      dailyMap.set(date, { calories: 0, protein: 0, carbs: 0, fat: 0, quality: 0, count: 0 });
    }
    const day = dailyMap.get(date);
    day.calories += log.calories || 0;
    day.protein += log.protein || 0;
    day.carbs += log.carbs || 0;
    day.fat += log.fat || 0;
    if (log.quality_score) {
      day.quality += log.quality_score;
      day.count++;
    }
  });

  return Array.from(dailyMap.entries()).map(([date, data]) => ({
    date,
    calories: Math.round(data.calories),
    protein: Math.round(data.protein),
    carbs: Math.round(data.carbs),
    fat: Math.round(data.fat),
    quality: data.count > 0 ? Math.round((data.quality / data.count) * 100) / 100 : 0
  }));
}

function processMoodData(logs: any[]) {
  if (logs.length === 0) {
    return {
      avgMood: 0,
      avgEnergy: 0,
      avgWellness: 0,
      journalEntries: 0,
      trendDirection: 'stable',
      dailyData: []
    };
  }

  const avgMood = logs.reduce((sum, log) => sum + (log.mood || 0), 0) / logs.length;
  const avgEnergy = logs.reduce((sum, log) => sum + (log.energy || 0), 0) / logs.length;
  const avgWellness = logs.reduce((sum, log) => sum + (log.wellness || 0), 0) / logs.length;
  const journalEntries = logs.filter(log => log.journal_text && log.journal_text.length > 0).length;

  // Calculate trend
  const firstHalf = logs.slice(0, Math.ceil(logs.length / 2));
  const secondHalf = logs.slice(Math.ceil(logs.length / 2));
  const firstAvg = firstHalf.reduce((sum, log) => sum + (log.mood || 0), 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, log) => sum + (log.mood || 0), 0) / secondHalf.length;
  const trendDirection = secondAvg > firstAvg + 0.5 ? 'improving' : secondAvg < firstAvg - 0.5 ? 'declining' : 'stable';

  const dailyData = logs.map(log => ({
    date: log.date,
    mood: log.mood || 0,
    energy: log.energy || 0,
    wellness: log.wellness || 0
  }));

  return {
    avgMood: Math.round(avgMood * 10) / 10,
    avgEnergy: Math.round(avgEnergy * 10) / 10,
    avgWellness: Math.round(avgWellness * 10) / 10,
    journalEntries,
    trendDirection,
    dailyData
  };
}

function processHydrationData(logs: any[], profile: any) {
  const dailyData = getDailyHydrationData(logs);
  const totalVolume = logs.reduce((sum, log) => sum + (log.volume || 0), 0);
  const avgDailyVolume = totalVolume / 7; // 7 days
  const dailyGoal = 2000; // Default 2L, could be from profile
  const goalComplianceDays = dailyData.filter(day => day.volume >= dailyGoal).length;
  const consistencyScore = dailyData.filter(day => day.volume > 0).length / 7 * 100;

  return {
    totalVolume: Math.round(totalVolume),
    avgDailyVolume: Math.round(avgDailyVolume),
    goalComplianceDays,
    consistencyScore: Math.round(consistencyScore),
    dailyData
  };
}

function getDailyHydrationData(logs: any[]) {
  const dailyMap = new Map();
  
  // Initialize 7 days
  for (let i = 0; i < 7; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    dailyMap.set(date.toISOString().split('T')[0], { volume: 0, goal: 2000 });
  }

  logs.forEach(log => {
    const date = log.created_at.split('T')[0];
    if (dailyMap.has(date)) {
      dailyMap.get(date).volume += log.volume || 0;
    }
  });

  return Array.from(dailyMap.entries()).map(([date, data]) => ({
    date,
    volume: Math.round(data.volume),
    goal: data.goal
  }));
}

function processSupplementData(logs: any[]) {
  const dailyData = getDailySupplementData(logs);
  const uniqueSupplements = new Set(logs.map(log => log.name)).size;
  const totalDoses = logs.length;
  const missedDays = dailyData.filter(day => day.count === 0).length;
  const compliancePercentage = ((7 - missedDays) / 7) * 100;

  return {
    uniqueSupplements,
    totalDoses,
    compliancePercentage: Math.round(compliancePercentage),
    missedDays,
    dailyData
  };
}

function getDailySupplementData(logs: any[]) {
  const dailyMap = new Map();
  
  // Initialize 7 days
  for (let i = 0; i < 7; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    dailyMap.set(date.toISOString().split('T')[0], { count: 0 });
  }

  logs.forEach(log => {
    const date = log.created_at.split('T')[0];
    if (dailyMap.has(date)) {
      dailyMap.get(date).count++;
    }
  });

  return Array.from(dailyMap.entries()).map(([date, data]) => ({
    date,
    count: data.count
  }));
}

function processExerciseData(logs: any[]) {
  const dailyData = getDailyExerciseData(logs);
  const totalWorkouts = logs.length;
  const avgSteps = logs.filter(log => log.steps).length > 0 
    ? logs.filter(log => log.steps).reduce((sum, log) => sum + log.steps, 0) / logs.filter(log => log.steps).length 
    : 0;
  const totalDuration = logs.reduce((sum, log) => sum + (log.duration_minutes || 0), 0);
  const activeDays = dailyData.filter(day => day.workouts > 0 || day.steps > 0).length;

  // Calculate average intensity
  const intensityMap = { 'low': 1, 'moderate': 2, 'high': 3 };
  const avgIntensity = logs.filter(log => log.intensity_level).length > 0
    ? logs.filter(log => log.intensity_level).reduce((sum, log) => sum + (intensityMap[log.intensity_level] || 2), 0) / logs.filter(log => log.intensity_level).length
    : 2;

  return {
    totalWorkouts,
    avgSteps: Math.round(avgSteps),
    totalDuration,
    avgIntensity,
    activeDays,
    dailyData
  };
}

function getDailyExerciseData(logs: any[]) {
  const dailyMap = new Map();
  
  // Initialize 7 days
  for (let i = 0; i < 7; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    dailyMap.set(date.toISOString().split('T')[0], { workouts: 0, steps: 0, duration: 0, intensity: 'moderate' });
  }

  logs.forEach(log => {
    const date = log.created_at.split('T')[0];
    if (dailyMap.has(date)) {
      const day = dailyMap.get(date);
      day.workouts++;
      day.steps = Math.max(day.steps, log.steps || 0); // Take max steps for the day
      day.duration += log.duration_minutes || 0;
      if (log.intensity_level) day.intensity = log.intensity_level;
    }
  });

  return Array.from(dailyMap.entries()).map(([date, data]) => ({
    date,
    workouts: data.workouts,
    steps: data.steps,
    duration: data.duration,
    intensity: data.intensity
  }));
}

function processToxinData(detections: any[]) {
  const severityBreakdown = { low: 0, medium: 0, high: 0 };
  
  detections.forEach(detection => {
    // Assume toxin_type contains severity info or default to medium
    const severity = detection.severity || 'medium';
    severityBreakdown[severity] = (severityBreakdown[severity] || 0) + 1;
  });

  const totalExposure = detections.length;

  return {
    flaggedFoodCount: detections.length,
    severityBreakdown,
    totalExposure
  };
}

// Scoring functions
function calculateNutritionScore(nutritionData: any, profile: any): number {
  let score = 70; // Base score

  // Meal consistency (20 points)
  if (nutritionData.mealCount >= 14) score += 20; // 2+ meals per day
  else if (nutritionData.mealCount >= 7) score += 10; // 1+ meal per day

  // Quality score (15 points)
  if (nutritionData.avgQualityScore >= 8) score += 15;
  else if (nutritionData.avgQualityScore >= 6) score += 10;
  else if (nutritionData.avgQualityScore >= 4) score += 5;

  // Goal achievement (15 points)
  if (nutritionData.proteinGoalPercentage >= 90) score += 8;
  if (nutritionData.calorieGoalPercentage >= 80 && nutritionData.calorieGoalPercentage <= 120) score += 7;

  return Math.min(100, Math.max(0, score));
}

function calculateMoodScore(moodData: any): number {
  if (moodData.avgMood === 0) return 50; // No data

  let score = moodData.avgMood * 10; // Base score from mood (0-100)
  
  // Trend bonus
  if (moodData.trendDirection === 'improving') score += 10;
  else if (moodData.trendDirection === 'declining') score -= 10;

  // Journal bonus
  if (moodData.journalEntries >= 3) score += 5;

  return Math.min(100, Math.max(0, score));
}

function calculateExerciseScore(exerciseData: any): number {
  let score = 40; // Base score

  // Workout frequency (30 points)
  if (exerciseData.totalWorkouts >= 5) score += 30;
  else if (exerciseData.totalWorkouts >= 3) score += 20;
  else if (exerciseData.totalWorkouts >= 1) score += 10;

  // Steps (20 points)
  if (exerciseData.avgSteps >= 10000) score += 20;
  else if (exerciseData.avgSteps >= 7000) score += 15;
  else if (exerciseData.avgSteps >= 5000) score += 10;

  // Active days (10 points)
  score += (exerciseData.activeDays / 7) * 10;

  return Math.min(100, Math.max(0, score));
}

function calculateHydrationScore(hydrationData: any): number {
  let score = 20; // Base score

  // Goal compliance (50 points)
  score += (hydrationData.goalComplianceDays / 7) * 50;

  // Consistency (30 points)
  score += (hydrationData.consistencyScore / 100) * 30;

  return Math.min(100, Math.max(0, score));
}

function calculateSupplementScore(supplementData: any): number {
  if (supplementData.totalDoses === 0) return 50; // Neutral if no supplements

  let score = 40; // Base score

  // Compliance (60 points)
  score += (supplementData.compliancePercentage / 100) * 60;

  return Math.min(100, Math.max(0, score));
}

function calculateExerciseStreak(logs: any[]): number {
  // Simple calculation - could be more sophisticated
  const today = new Date().toISOString().split('T')[0];
  let streak = 0;
  let currentDate = new Date();
  
  for (let i = 0; i < 30; i++) { // Check last 30 days
    const dateStr = currentDate.toISOString().split('T')[0];
    const hasExercise = logs.some(log => log.created_at.split('T')[0] === dateStr);
    
    if (hasExercise) {
      streak++;
    } else {
      break;
    }
    
    currentDate.setDate(currentDate.getDate() - 1);
  }
  
  return streak;
}

function calculateOverallScore(data: WeeklyReportData): number {
  return data.weeklyScores.overall;
}

function generateSummaryText(data: WeeklyReportData): string {
  const insights = [];
  
  // Nutrition insights
  if (data.nutrition.proteinGoalPercentage >= 90) {
    insights.push(`Excellent protein intake at ${data.nutrition.proteinGoalPercentage}% of goal`);
  } else if (data.nutrition.proteinGoalPercentage >= 70) {
    insights.push(`Good protein intake at ${data.nutrition.proteinGoalPercentage}% of goal`);
  }

  // Mood insights
  if (data.mood.avgMood >= 8) {
    insights.push(`Outstanding mood levels averaging ${data.mood.avgMood}/10`);
  } else if (data.mood.trendDirection === 'improving') {
    insights.push(`Mood trending upward`);
  }

  // Exercise insights
  if (data.exercise.totalWorkouts >= 5) {
    insights.push(`Highly active with ${data.exercise.totalWorkouts} workouts`);
  } else if (data.exercise.avgSteps >= 8000) {
    insights.push(`Great daily step average of ${data.exercise.avgSteps.toLocaleString()}`);
  }

  // Hydration insights
  if (data.hydration.goalComplianceDays >= 5) {
    insights.push(`Excellent hydration with ${data.hydration.goalComplianceDays} days meeting goals`);
  }

  return insights.slice(0, 3).join('. ') + (insights.length > 0 ? '.' : 'Keep up the great work on your health journey!');
}

function generateWeekTitle(startDate: Date): string {
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  
  const month = monthNames[startDate.getMonth()];
  const weekOfMonth = Math.ceil(startDate.getDate() / 7);
  
  return `${month} – Week ${weekOfMonth}`;
}

function generateAchievements(nutrition: any, mood: any, exercise: any, hydration: any, supplements: any): string[] {
  const achievements = [];
  
  if (nutrition.proteinGoalPercentage >= 95) achievements.push("Protein Champion");
  if (mood.avgMood >= 8.5) achievements.push("Mood Master");
  if (exercise.totalWorkouts >= 5) achievements.push("Fitness Warrior");
  if (hydration.goalComplianceDays >= 6) achievements.push("Hydration Hero");
  if (supplements.compliancePercentage >= 90) achievements.push("Supplement Superstar");
  if (nutrition.avgQualityScore >= 8) achievements.push("Quality Food Advocate");
  
  return achievements.slice(0, 4);
}

function generateImprovements(nutrition: any, mood: any, exercise: any): string[] {
  const improvements = [];
  
  if (mood.trendDirection === 'improving') improvements.push("Mood improved significantly");
  if (exercise.activeDays >= 5) improvements.push("Exercise consistency up");
  if (nutrition.avgQualityScore >= 7) improvements.push("Food quality enhanced");
  
  return improvements.slice(0, 3);
}

function generateRecommendations(nutrition: any, mood: any, exercise: any, hydration: any, profile: any): string[] {
  const recommendations = [];
  
  if (nutrition.proteinGoalPercentage < 80) recommendations.push("Increase protein-rich foods");
  if (hydration.goalComplianceDays < 4) recommendations.push("Boost daily water intake");
  if (exercise.totalWorkouts < 3) recommendations.push("Add more physical activity");
  if (mood.avgMood < 6) recommendations.push("Focus on stress management");
  if (nutrition.avgQualityScore < 6) recommendations.push("Choose more whole foods");
  
  return recommendations.slice(0, 4);
}
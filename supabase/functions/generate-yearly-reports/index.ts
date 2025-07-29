import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface YearlyReportData {
  nutrition: {
    totalCalories: number;
    avgProtein: number;
    avgCarbs: number;
    avgFat: number;
    mealCount: number;
    avgQualityScore: number;
    proteinGoalPercentage: number;
    calorieGoalPercentage: number;
    monthlyData: Array<{month: string, calories: number, protein: number, quality: number, carbs: number, fat: number}>;
  };
  mood: {
    avgMood: number;
    avgEnergy: number;
    avgWellness: number;
    journalEntries: number;
    trendDirection: string;
    monthlyData: Array<{month: string, mood: number, energy: number, wellness: number}>;
  };
  exercise: {
    totalWorkouts: number;
    avgSteps: number;
    totalDuration: number;
    avgIntensity: number;
    activeDays: number;
    monthlyData: Array<{month: string, steps: number, workouts: number, duration: number, intensity: string}>;
  };
  hydration: {
    totalVolume: number;
    avgDailyVolume: number;
    goalComplianceDays: number;
    consistencyScore: number;
    monthlyData: Array<{month: string, volume: number, goal: number}>;
  };
  supplements: {
    uniqueSupplements: number;
    totalDoses: number;
    compliancePercentage: number;
    missedDays: number;
    monthlyData: Array<{month: string, count: number}>;
  };
  recovery: {
    total_sessions: number;
    avg_mood: number;
    avg_stress: number;
    top_recovery_types: Array<{type: string, count: number}>;
    best_streak: number;
    recovery_score: number;
    insights: string[];
    monthlyData: Array<{month: string, sessions: number, mood: number, stress: number}>;
  };
  toxins: {
    flaggedFoodCount: number;
    severityBreakdown: Record<string, number>;
    totalExposure: number;
    mostCommonToxins: Array<{type: string, count: number}>;
  };
  streaks: {
    nutrition: number;
    hydration: number;
    supplements: number;
    exercise: number;
    longestStreaks: {
      nutrition: number;
      hydration: number;
      supplements: number;
      exercise: number;
    };
  };
  yearlyScores: {
    nutrition: number;
    mood: number;
    exercise: number;
    hydration: number;
    supplements: number;
    recovery: number;
    overall: number;
  };
  yearStats: {
    totalMeals: number;
    avgMoodScore: number;
    totalExercises: number;
    avgHydration: number;
    supplementDays: number;
    healthScore: number;
  };
  achievements: string[];
  improvements: string[];
  recommendations: string[];
  seasonalInsights: Array<{season: string, insight: string}>;
}

Deno.serve(async (req) => {
  console.log('📅 Yearly report generation started');
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { user_id } = await req.json().catch(() => ({}));

    // Calculate year dates (January 1st to December 31st of current year)
    const now = new Date();
    const yearStartDate = new Date(now.getFullYear(), 0, 1);
    yearStartDate.setHours(0, 0, 0, 0);
    
    const yearEndDate = new Date(now.getFullYear(), 11, 31);
    yearEndDate.setHours(23, 59, 59, 999);

    console.log(`📅 Generating reports for year: ${yearStartDate.toISOString().split('T')[0]} to ${yearEndDate.toISOString().split('T')[0]}`);

    let users;
    if (user_id) {
      // Manual testing for specific user
      users = [{ user_id }];
      console.log(`🧪 Testing mode: generating report for user ${user_id}`);
    } else {
      // Get all active users
      const { data: allUsers, error: usersError } = await supabase
        .from('user_profiles')
        .select('user_id')
        .not('user_id', 'is', null);

      if (usersError) {
        throw new Error(`Error fetching users: ${usersError.message}`);
      }
      users = allUsers;
    }

    console.log(`👥 Found ${users?.length || 0} users to generate reports for`);

    let successCount = 0;
    let errorCount = 0;

    // Generate report for each user
    for (const user of users || []) {
      try {
        console.log(`📊 Generating yearly report for user: ${user.user_id}`);
        
        // Check if report already exists for this year
        const { data: existingReport } = await supabase
          .from('yearly_reports')
          .select('id')
          .eq('user_id', user.user_id)
          .eq('year_start_date', yearStartDate.toISOString().split('T')[0])
          .single();

        if (existingReport) {
          console.log(`⏭️ Yearly report already exists for user ${user.user_id}, skipping`);
          continue;
        }

        // Collect user data for the year
        const reportData = await collectUserYearData(supabase, user.user_id, yearStartDate, yearEndDate);
        
        // Skip if insufficient data
        if (reportData.nutrition.mealCount < 50 && reportData.exercise.totalWorkouts < 10) {
          console.log(`⚠️ Insufficient data for user ${user.user_id}, skipping yearly report`);
          continue;
        }
        
        // Calculate overall score
        const overallScore = calculateOverallScore(reportData);
        
        // Generate summary text with AI
        const summaryText = await generateAISummaryText(reportData, 'yearly');
        
        // Generate title
        const title = generateYearTitle(yearStartDate);

        // Insert the report
        const { error: insertError } = await supabase
          .from('yearly_reports')
          .insert({
            user_id: user.user_id,
            year_start_date: yearStartDate.toISOString().split('T')[0],
            year_end_date: yearEndDate.toISOString().split('T')[0],
            title,
            report_data: reportData,
            summary_text: summaryText,
            overall_score: overallScore
          });

        if (insertError) {
          console.error(`❌ Error inserting yearly report for user ${user.user_id}:`, insertError);
          errorCount++;
        } else {
          console.log(`✅ Successfully generated yearly report for user ${user.user_id}`);
          successCount++;
        }

      } catch (error) {
        console.error(`❌ Error processing user ${user.user_id}:`, error);
        errorCount++;
      }
    }

    console.log(`🎉 Yearly report generation completed. Success: ${successCount}, Errors: ${errorCount}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Yearly reports generated successfully. Success: ${successCount}, Errors: ${errorCount}`,
        stats: { successCount, errorCount, totalUsers: users?.length || 0 }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('💥 Fatal error in yearly report generation:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        message: 'Failed to generate yearly reports'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

async function collectUserYearData(supabase: any, userId: string, startDate: Date, endDate: Date): Promise<YearlyReportData> {
  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];

  // Fetch user profile for goals
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  // Fetch all logs for the entire year
  const [nutritionLogs, moodLogs, hydrationLogs, supplementLogs, exerciseLogs, toxinDetections, recoveryLogs, meditationStreak] = await Promise.all([
    supabase
      .from('nutrition_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at'),
    
    supabase
      .from('mood_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDateStr)
      .lte('date', endDateStr)
      .order('date'),
    
    supabase
      .from('hydration_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at'),
    
    supabase
      .from('supplement_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at'),
    
    supabase
      .from('exercise_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at'),
    
    supabase
      .from('toxin_detections')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at'),

    supabase
      .from('recovery_session_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('completed_at', startDate.toISOString())
      .lte('completed_at', endDate.toISOString())
      .order('completed_at'),

    supabase
      .from('meditation_streaks')
      .select('*')
      .eq('user_id', userId)
      .single()
  ]);

  // Process all data with yearly aggregations
  const nutritionData = processYearlyNutritionData(nutritionLogs.data || [], profile);
  const moodData = processYearlyMoodData(moodLogs.data || []);
  const hydrationData = processYearlyHydrationData(hydrationLogs.data || [], profile);
  const supplementData = processYearlySupplementData(supplementLogs.data || []);
  const exerciseData = processYearlyExerciseData(exerciseLogs.data || []);
  const toxinData = processYearlyToxinData(toxinDetections.data || []);
  const recoveryData = processYearlyRecoveryData(recoveryLogs.data || [], moodLogs.data || [], meditationStreak.data);

  // Calculate scores
  const nutritionScore = calculateYearlyNutritionScore(nutritionData, profile);
  const moodScore = calculateYearlyMoodScore(moodData);
  const exerciseScore = calculateYearlyExerciseScore(exerciseData);
  const hydrationScore = calculateYearlyHydrationScore(hydrationData);
  const supplementScore = calculateYearlySupplementScore(supplementData);
  const recoveryScore = calculateYearlyRecoveryScore(recoveryData);
  
  const overallScore = (
    nutritionScore * 0.30 +
    moodScore * 0.15 +
    exerciseScore * 0.15 +
    hydrationScore * 0.15 +
    supplementScore * 0.10 +
    recoveryScore * 0.10 +
    (100 - Math.min(toxinData.totalExposure * 5, 50)) * 0.05
  );

  // Generate insights
  const achievements = generateYearlyAchievements(nutritionData, moodData, exerciseData, hydrationData, supplementData);
  const improvements = generateYearlyImprovements(nutritionData, moodData, exerciseData);
  const recommendations = generateYearlyRecommendations(nutritionData, moodData, exerciseData, hydrationData, profile);
  const seasonalInsights = generateSeasonalInsights(nutritionLogs.data || [], moodLogs.data || [], exerciseLogs.data || []);

  return {
    nutrition: nutritionData,
    mood: moodData,
    exercise: exerciseData,
    hydration: hydrationData,
    supplements: supplementData,
    recovery: recoveryData,
    toxins: toxinData,
    streaks: {
      nutrition: profile?.current_nutrition_streak || 0,
      hydration: profile?.current_hydration_streak || 0,
      supplements: profile?.current_supplement_streak || 0,
      exercise: calculateExerciseStreak(exerciseLogs.data || []),
      longestStreaks: {
        nutrition: profile?.longest_nutrition_streak || 0,
        hydration: profile?.longest_hydration_streak || 0,
        supplements: profile?.longest_supplement_streak || 0,
        exercise: calculateLongestExerciseStreak(exerciseLogs.data || [])
      }
    },
    yearlyScores: {
      nutrition: Math.round(nutritionScore),
      mood: Math.round(moodScore),
      exercise: Math.round(exerciseScore),
      hydration: Math.round(hydrationScore),
      supplements: Math.round(supplementScore),
      recovery: Math.round(recoveryScore),
      overall: Math.round(overallScore)
    },
    yearStats: {
      totalMeals: nutritionData.mealCount,
      avgMoodScore: moodData.avgMood,
      totalExercises: exerciseData.totalWorkouts,
      avgHydration: hydrationData.avgDailyVolume,
      supplementDays: supplementData.totalDoses > 0 ? 365 - supplementData.missedDays : 0,
      healthScore: Math.round(overallScore)
    },
    achievements,
    improvements,
    recommendations,
    seasonalInsights
  };
}

function processYearlyNutritionData(logs: any[], profile: any) {
  const monthlyData = getMonthlyNutritionData(logs);
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
    calorieGoalPercentage: Math.round((totalCalories / 365 / targetCalories) * 100),
    monthlyData
  };
}

function getMonthlyNutritionData(logs: any[]) {
  const monthlyMap = new Map();
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  // Initialize all months
  for (let i = 0; i < 12; i++) {
    monthlyMap.set(monthNames[i], { calories: 0, protein: 0, carbs: 0, fat: 0, quality: 0, count: 0 });
  }

  logs.forEach(log => {
    const date = new Date(log.created_at);
    const month = monthNames[date.getMonth()];
    if (monthlyMap.has(month)) {
      const data = monthlyMap.get(month);
      data.calories += log.calories || 0;
      data.protein += log.protein || 0;
      data.carbs += log.carbs || 0;
      data.fat += log.fat || 0;
      if (log.quality_score) {
        data.quality += log.quality_score;
        data.count++;
      }
    }
  });

  return Array.from(monthlyMap.entries()).map(([month, data]) => ({
    month,
    calories: Math.round(data.calories),
    protein: Math.round(data.protein),
    carbs: Math.round(data.carbs),
    fat: Math.round(data.fat),
    quality: data.count > 0 ? Math.round((data.quality / data.count) * 100) / 100 : 0
  }));
}

function processYearlyMoodData(logs: any[]) {
  if (logs.length === 0) {
    return {
      avgMood: 0,
      avgEnergy: 0,
      avgWellness: 0,
      journalEntries: 0,
      trendDirection: 'stable',
      monthlyData: []
    };
  }

  const avgMood = logs.reduce((sum, log) => sum + (log.mood || 0), 0) / logs.length;
  const avgEnergy = logs.reduce((sum, log) => sum + (log.energy || 0), 0) / logs.length;
  const avgWellness = logs.reduce((sum, log) => sum + (log.wellness || 0), 0) / logs.length;
  const journalEntries = logs.filter(log => log.journal_text && log.journal_text.length > 0).length;

  // Calculate yearly trend
  const q1 = logs.slice(0, Math.floor(logs.length / 4));
  const q4 = logs.slice(Math.floor(logs.length * 3 / 4));
  const q1Avg = q1.reduce((sum, log) => sum + (log.mood || 0), 0) / q1.length;
  const q4Avg = q4.reduce((sum, log) => sum + (log.mood || 0), 0) / q4.length;
  const trendDirection = q4Avg > q1Avg + 0.5 ? 'improving' : q4Avg < q1Avg - 0.5 ? 'declining' : 'stable';

  const monthlyData = getMonthlyMoodData(logs);

  return {
    avgMood: Math.round(avgMood * 10) / 10,
    avgEnergy: Math.round(avgEnergy * 10) / 10,
    avgWellness: Math.round(avgWellness * 10) / 10,
    journalEntries,
    trendDirection,
    monthlyData
  };
}

function getMonthlyMoodData(logs: any[]) {
  const monthlyMap = new Map();
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  // Initialize all months
  for (let i = 0; i < 12; i++) {
    monthlyMap.set(monthNames[i], { mood: 0, energy: 0, wellness: 0, count: 0 });
  }

  logs.forEach(log => {
    const date = new Date(log.date);
    const month = monthNames[date.getMonth()];
    if (monthlyMap.has(month)) {
      const data = monthlyMap.get(month);
      data.mood += log.mood || 0;
      data.energy += log.energy || 0;
      data.wellness += log.wellness || 0;
      data.count++;
    }
  });

  return Array.from(monthlyMap.entries()).map(([month, data]) => ({
    month,
    mood: data.count > 0 ? Math.round((data.mood / data.count) * 10) / 10 : 0,
    energy: data.count > 0 ? Math.round((data.energy / data.count) * 10) / 10 : 0,
    wellness: data.count > 0 ? Math.round((data.wellness / data.count) * 10) / 10 : 0
  }));
}

function processYearlyHydrationData(logs: any[], profile: any) {
  const monthlyData = getMonthlyHydrationData(logs);
  const totalVolume = logs.reduce((sum, log) => sum + (log.volume || 0), 0);
  const avgDailyVolume = totalVolume / 365;
  const dailyGoal = 2000; // Default 2L
  
  // Calculate goal compliance days
  const dailyVolumeMap = new Map();
  logs.forEach(log => {
    const date = log.created_at.split('T')[0];
    if (!dailyVolumeMap.has(date)) {
      dailyVolumeMap.set(date, 0);
    }
    dailyVolumeMap.set(date, dailyVolumeMap.get(date) + (log.volume || 0));
  });
  
  const goalComplianceDays = Array.from(dailyVolumeMap.values()).filter(volume => volume >= dailyGoal).length;
  const consistencyScore = dailyVolumeMap.size / 365 * 100;

  return {
    totalVolume: Math.round(totalVolume),
    avgDailyVolume: Math.round(avgDailyVolume),
    goalComplianceDays,
    consistencyScore: Math.round(consistencyScore),
    monthlyData
  };
}

function getMonthlyHydrationData(logs: any[]) {
  const monthlyMap = new Map();
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  // Initialize all months
  for (let i = 0; i < 12; i++) {
    monthlyMap.set(monthNames[i], { volume: 0, goal: 2000 });
  }

  logs.forEach(log => {
    const date = new Date(log.created_at);
    const month = monthNames[date.getMonth()];
    if (monthlyMap.has(month)) {
      monthlyMap.get(month).volume += log.volume || 0;
    }
  });

  return Array.from(monthlyMap.entries()).map(([month, data]) => ({
    month,
    volume: Math.round(data.volume),
    goal: data.goal * 30 // Monthly goal approximation
  }));
}

function processYearlySupplementData(logs: any[]) {
  const monthlyData = getMonthlySupplementData(logs);
  const uniqueSupplements = new Set(logs.map(log => log.name)).size;
  const totalDoses = logs.length;
  
  // Calculate missed days
  const dailyDosesMap = new Map();
  logs.forEach(log => {
    const date = log.created_at.split('T')[0];
    if (!dailyDosesMap.has(date)) {
      dailyDosesMap.set(date, 0);
    }
    dailyDosesMap.set(date, dailyDosesMap.get(date) + 1);
  });
  
  const missedDays = 365 - dailyDosesMap.size;
  const compliancePercentage = ((365 - missedDays) / 365) * 100;

  return {
    uniqueSupplements,
    totalDoses,
    compliancePercentage: Math.round(compliancePercentage),
    missedDays,
    monthlyData
  };
}

function getMonthlySupplementData(logs: any[]) {
  const monthlyMap = new Map();
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  // Initialize all months
  for (let i = 0; i < 12; i++) {
    monthlyMap.set(monthNames[i], { count: 0 });
  }

  logs.forEach(log => {
    const date = new Date(log.created_at);
    const month = monthNames[date.getMonth()];
    if (monthlyMap.has(month)) {
      monthlyMap.get(month).count++;
    }
  });

  return Array.from(monthlyMap.entries()).map(([month, data]) => ({
    month,
    count: data.count
  }));
}

function processYearlyExerciseData(logs: any[]) {
  const monthlyData = getMonthlyExerciseData(logs);
  const totalWorkouts = logs.length;
  const avgSteps = logs.filter(log => log.steps).length > 0 
    ? logs.filter(log => log.steps).reduce((sum, log) => sum + log.steps, 0) / logs.filter(log => log.steps).length 
    : 0;
  const totalDuration = logs.reduce((sum, log) => sum + (log.duration_minutes || 0), 0);
  
  // Calculate active days
  const activeDaysSet = new Set();
  logs.forEach(log => {
    const date = log.created_at.split('T')[0];
    if (log.steps > 0 || log.duration_minutes > 0) {
      activeDaysSet.add(date);
    }
  });
  const activeDays = activeDaysSet.size;

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
    monthlyData
  };
}

function getMonthlyExerciseData(logs: any[]) {
  const monthlyMap = new Map();
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  // Initialize all months
  for (let i = 0; i < 12; i++) {
    monthlyMap.set(monthNames[i], { workouts: 0, steps: 0, duration: 0, intensity: 'moderate', count: 0 });
  }

  logs.forEach(log => {
    const date = new Date(log.created_at);
    const month = monthNames[date.getMonth()];
    if (monthlyMap.has(month)) {
      const data = monthlyMap.get(month);
      data.workouts++;
      data.steps += log.steps || 0;
      data.duration += log.duration_minutes || 0;
      if (log.intensity_level) {
        data.intensity = log.intensity_level;
      }
      data.count++;
    }
  });

  return Array.from(monthlyMap.entries()).map(([month, data]) => ({
    month,
    workouts: data.workouts,
    steps: data.count > 0 ? Math.round(data.steps / data.count) : 0,
    duration: data.duration,
    intensity: data.intensity
  }));
}

function processYearlyToxinData(detections: any[]) {
  const severityBreakdown = { low: 0, medium: 0, high: 0 };
  const toxinCounts = new Map();
  
  detections.forEach(detection => {
    const severity = detection.severity || 'medium';
    severityBreakdown[severity] = (severityBreakdown[severity] || 0) + 1;
    
    // Count most common toxin types
    const toxinType = detection.toxin_type || 'unknown';
    toxinCounts.set(toxinType, (toxinCounts.get(toxinType) || 0) + 1);
  });

  const mostCommonToxins = Array.from(toxinCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([type, count]) => ({ type, count }));

  return {
    flaggedFoodCount: detections.length,
    severityBreakdown,
    totalExposure: detections.length,
    mostCommonToxins
  };
}

function calculateYearlyNutritionScore(nutritionData: any, profile: any): number {
  let score = 70; // Base score

  // Meal consistency (30 points) - yearly scale
  const avgMealsPerDay = nutritionData.mealCount / 365;
  if (avgMealsPerDay >= 2.5) score += 30;
  else if (avgMealsPerDay >= 2) score += 25;
  else if (avgMealsPerDay >= 1.5) score += 20;
  else if (avgMealsPerDay >= 1) score += 15;

  // Quality score (15 points)
  if (nutritionData.avgQualityScore >= 8) score += 15;
  else if (nutritionData.avgQualityScore >= 6) score += 10;
  else if (nutritionData.avgQualityScore >= 4) score += 5;

  // Goal achievement (15 points)
  if (nutritionData.proteinGoalPercentage >= 90) score += 8;
  if (nutritionData.calorieGoalPercentage >= 80 && nutritionData.calorieGoalPercentage <= 120) score += 7;

  return Math.min(100, Math.max(0, score));
}

function calculateYearlyMoodScore(moodData: any): number {
  if (moodData.avgMood === 0) return 50;

  let score = moodData.avgMood * 10;
  
  if (moodData.trendDirection === 'improving') score += 20;
  else if (moodData.trendDirection === 'declining') score -= 20;

  if (moodData.journalEntries >= 50) score += 15;
  else if (moodData.journalEntries >= 25) score += 10;
  else if (moodData.journalEntries >= 10) score += 5;

  return Math.min(100, Math.max(0, score));
}

function calculateYearlyExerciseScore(exerciseData: any): number {
  let score = 40;

  // Yearly workout frequency (40 points)
  if (exerciseData.totalWorkouts >= 200) score += 40;
  else if (exerciseData.totalWorkouts >= 150) score += 30;
  else if (exerciseData.totalWorkouts >= 100) score += 20;
  else if (exerciseData.totalWorkouts >= 50) score += 15;

  // Steps (20 points)
  if (exerciseData.avgSteps >= 10000) score += 20;
  else if (exerciseData.avgSteps >= 7000) score += 15;
  else if (exerciseData.avgSteps >= 5000) score += 10;

  // Active days (10 points)
  score += (exerciseData.activeDays / 365) * 10;

  return Math.min(100, Math.max(0, score));
}

function calculateYearlyHydrationScore(hydrationData: any): number {
  let score = 20;

  // Goal compliance (50 points)
  score += (hydrationData.goalComplianceDays / 365) * 50;

  // Consistency (30 points)
  score += (hydrationData.consistencyScore / 100) * 30;

  return Math.min(100, Math.max(0, score));
}

function calculateYearlySupplementScore(supplementData: any): number {
  if (supplementData.totalDoses === 0) return 50;

  let score = 40;
  score += (supplementData.compliancePercentage / 100) * 60;

  return Math.min(100, Math.max(0, score));
}

function calculateExerciseStreak(logs: any[]): number {
  const today = new Date().toISOString().split('T')[0];
  let streak = 0;
  let currentDate = new Date();
  
  for (let i = 0; i < 365; i++) {
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

function calculateLongestExerciseStreak(logs: any[]): number {
  const sortedDates = [...new Set(logs.map(log => log.created_at.split('T')[0]))].sort();
  
  let longestStreak = 0;
  let currentStreak = 1;
  
  for (let i = 1; i < sortedDates.length; i++) {
    const prevDate = new Date(sortedDates[i - 1]);
    const currentDate = new Date(sortedDates[i]);
    const dayDiff = (currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);
    
    if (dayDiff === 1) {
      currentStreak++;
    } else {
      longestStreak = Math.max(longestStreak, currentStreak);
      currentStreak = 1;
    }
  }
  
  return Math.max(longestStreak, currentStreak);
}

function calculateOverallScore(data: YearlyReportData): number {
  return data.yearlyScores.overall;
}

async function generateAISummaryText(data: YearlyReportData, period: string): Promise<string> {
  try {
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    
    if (!openAIApiKey) {
      return generateFallbackSummaryText(data, period);
    }

    const prompt = `Write a motivational ${period} health and wellness report summary for a user with the following data:

Nutrition: ${data.nutrition.mealCount} meals logged this year, avg quality score ${data.nutrition.avgQualityScore}/10, ${data.nutrition.proteinGoalPercentage}% of protein goal achieved.
Mood: Average mood ${data.mood.avgMood}/10, energy ${data.mood.avgEnergy}/10, trend: ${data.mood.trendDirection}, ${data.mood.journalEntries} journal entries.
Exercise: ${data.exercise.totalWorkouts} workouts, ${data.exercise.avgSteps} average daily steps, ${data.exercise.activeDays} active days.
Hydration: ${data.hydration.goalComplianceDays} days meeting hydration goals, ${data.hydration.consistencyScore}% consistency.
Supplements: ${data.supplements.compliancePercentage}% compliance rate.
Overall health score: ${data.yearStats.healthScore}/100.

Write an inspiring, comprehensive summary (max 200 words) celebrating their year-long health journey and encouraging continued progress.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a supportive wellness coach writing personalized yearly health reports.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 250,
        temperature: 0.7
      }),
    });

    const aiResponse = await response.json();
    return aiResponse.choices?.[0]?.message?.content || generateFallbackSummaryText(data, period);
    
  } catch (error) {
    console.error('Error generating AI summary:', error);
    return generateFallbackSummaryText(data, period);
  }
}

function generateFallbackSummaryText(data: YearlyReportData, period: string): string {
  const insights = [];
  
  if (data.nutrition.proteinGoalPercentage >= 90) {
    insights.push(`Outstanding protein intake at ${data.nutrition.proteinGoalPercentage}% of goal throughout ${period}`);
  }

  if (data.mood.avgMood >= 8) {
    insights.push(`Exceptional mood levels averaging ${data.mood.avgMood}/10 this ${period}`);
  }

  if (data.exercise.totalWorkouts >= 150) {
    insights.push(`Remarkable fitness commitment with ${data.exercise.totalWorkouts} workouts this ${period}`);
  }

  if (data.hydration.goalComplianceDays >= 250) {
    insights.push(`Excellent hydration discipline with ${data.hydration.goalComplianceDays} days meeting goals`);
  }

  return insights.slice(0, 3).join('. ') + (insights.length > 0 ? '. ' : '') + `What an incredible ${period} of dedication to your health journey! Your overall score of ${data.yearStats.healthScore}/100 reflects your commitment to wellness.`;
}

function generateYearTitle(startDate: Date): string {
  return `${startDate.getFullYear()} Health Summary`;
}

function generateSeasonalInsights(nutritionLogs: any[], moodLogs: any[], exerciseLogs: any[]): Array<{season: string, insight: string}> {
  const seasons = ['Winter', 'Spring', 'Summer', 'Fall'];
  const insights = [];
  
  // Simple seasonal analysis based on months
  const seasonalData = {
    Winter: { months: [11, 0, 1], nutrition: 0, mood: 0, exercise: 0, counts: { nutrition: 0, mood: 0, exercise: 0 } },
    Spring: { months: [2, 3, 4], nutrition: 0, mood: 0, exercise: 0, counts: { nutrition: 0, mood: 0, exercise: 0 } },
    Summer: { months: [5, 6, 7], nutrition: 0, mood: 0, exercise: 0, counts: { nutrition: 0, mood: 0, exercise: 0 } },
    Fall: { months: [8, 9, 10], nutrition: 0, mood: 0, exercise: 0, counts: { nutrition: 0, mood: 0, exercise: 0 } }
  };

  // Aggregate data by season
  nutritionLogs.forEach(log => {
    const month = new Date(log.created_at).getMonth();
    for (const [season, data] of Object.entries(seasonalData)) {
      if (data.months.includes(month) && log.quality_score) {
        data.nutrition += log.quality_score;
        data.counts.nutrition++;
      }
    }
  });

  moodLogs.forEach(log => {
    const month = new Date(log.date).getMonth();
    for (const [season, data] of Object.entries(seasonalData)) {
      if (data.months.includes(month) && log.mood) {
        data.mood += log.mood;
        data.counts.mood++;
      }
    }
  });

  exerciseLogs.forEach(log => {
    const month = new Date(log.created_at).getMonth();
    for (const [season, data] of Object.entries(seasonalData)) {
      if (data.months.includes(month)) {
        data.exercise++;
        data.counts.exercise++;
      }
    }
  });

  // Generate insights
  for (const [season, data] of Object.entries(seasonalData)) {
    const avgNutrition = data.counts.nutrition > 0 ? data.nutrition / data.counts.nutrition : 0;
    const avgMood = data.counts.mood > 0 ? data.mood / data.counts.mood : 0;
    const totalExercise = data.exercise;

    let insight = '';
    if (avgNutrition >= 8) {
      insight = `${season}: Excellent nutrition choices`;
    } else if (avgMood >= 8) {
      insight = `${season}: Great mood and energy levels`;
    } else if (totalExercise >= 20) {
      insight = `${season}: High activity and fitness focus`;
    } else if (avgNutrition >= 6 || avgMood >= 6 || totalExercise >= 10) {
      insight = `${season}: Steady progress in wellness habits`;
    } else {
      insight = `${season}: Opportunity for improvement in wellness routines`;
    }

    if (insight) {
      insights.push({ season, insight });
    }
  }

  return insights.slice(0, 4);
}

function generateYearlyAchievements(nutrition: any, mood: any, exercise: any, hydration: any, supplements: any): string[] {
  const achievements = [];
  
  if (nutrition.proteinGoalPercentage >= 95) achievements.push("Yearly Protein Champion");
  if (mood.avgMood >= 8.5) achievements.push("Wellness Master of the Year");
  if (exercise.totalWorkouts >= 200) achievements.push("Fitness Warrior Extraordinaire");
  if (hydration.goalComplianceDays >= 300) achievements.push("Hydration Hero of the Year");
  if (supplements.compliancePercentage >= 90) achievements.push("Supplement Consistency Champion");
  if (nutrition.avgQualityScore >= 8) achievements.push("Quality Nutrition Advocate");
  if (exercise.activeDays >= 300) achievements.push("Active Lifestyle Champion");
  if (mood.journalEntries >= 100) achievements.push("Mindful Reflection Master");
  
  return achievements.slice(0, 6);
}

function generateYearlyImprovements(nutrition: any, mood: any, exercise: any): string[] {
  const improvements = [];
  
  if (mood.trendDirection === 'improving') improvements.push("Mood and wellness improved significantly throughout the year");
  if (exercise.activeDays >= 250) improvements.push("Exercise consistency reached new heights");
  if (nutrition.avgQualityScore >= 7) improvements.push("Food quality choices enhanced dramatically");
  if (nutrition.mealCount >= 500) improvements.push("Nutrition logging became a strong habit");
  
  return improvements.slice(0, 4);
}

function generateYearlyRecommendations(nutrition: any, mood: any, exercise: any, hydration: any, profile: any): string[] {
  const recommendations = [];
  
  if (nutrition.proteinGoalPercentage < 80) recommendations.push("Focus on increasing protein-rich foods for better muscle health");
  if (hydration.goalComplianceDays < 200) recommendations.push("Prioritize consistent daily water intake");
  if (exercise.totalWorkouts < 100) recommendations.push("Gradually increase physical activity frequency");
  if (mood.avgMood < 6) recommendations.push("Consider stress management and mindfulness practices");
  if (nutrition.avgQualityScore < 6) recommendations.push("Emphasize whole, unprocessed foods in your diet");
  if (exercise.avgSteps < 7000) recommendations.push("Aim for more daily movement and walking");
  
  return recommendations.slice(0, 5);
}

function processYearlyRecoveryData(recoveryLogs: any[], moodLogs: any[], meditationStreak: any) {
  console.log(`🧘 Processing yearly recovery data: ${recoveryLogs.length} sessions, ${moodLogs.length} mood entries`);

  const monthlyData = getMonthlyRecoveryData(recoveryLogs, moodLogs);
  const totalSessions = recoveryLogs.length;
  
  // Calculate average mood and stress from mood logs
  const avgMood = moodLogs.length > 0 
    ? moodLogs.reduce((sum, log) => sum + (log.mood || 0), 0) / moodLogs.length
    : 0;
  
  // Use wellness as inverse stress indicator (higher wellness = lower stress)
  const avgStress = moodLogs.length > 0
    ? 10 - (moodLogs.reduce((sum, log) => sum + (log.wellness || 5), 0) / moodLogs.length)
    : 5;

  // Calculate top recovery types
  const typeCount = new Map();
  recoveryLogs.forEach(log => {
    const type = log.category || 'Unknown';
    typeCount.set(type, (typeCount.get(type) || 0) + 1);
  });

  const topRecoveryTypes = Array.from(typeCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([type, count]) => ({ type, count }));

  // Get best streak from meditation data (yearly context)
  const bestStreak = meditationStreak?.longest_streak || meditationStreak?.current_streak || 0;

  // Calculate yearly recovery score using weighted formula
  const sessionScore = Math.min(totalSessions * 0.5, 30); // Max 30 points for sessions
  const consistencyScore = Math.min((totalSessions / 365) * 25, 25); // Max 25 points for consistency  
  const moodScore = avgMood * 2; // Max 20 points for mood
  const stressScore = Math.max(0, (10 - avgStress) * 2); // Max 20 points for low stress
  const streakBonus = Math.min(bestStreak * 0.5, 5); // Max 5 bonus points for streak

  const recoveryScore = sessionScore + consistencyScore + moodScore + stressScore + streakBonus;

  // Generate insights for yearly context
  const insights = generateYearlyRecoveryInsights(totalSessions, avgMood, avgStress, topRecoveryTypes, bestStreak);

  return {
    total_sessions: totalSessions,
    avg_mood: Math.round(avgMood * 10) / 10,
    avg_stress: Math.round(avgStress * 10) / 10,
    top_recovery_types: topRecoveryTypes,
    best_streak: bestStreak,
    recovery_score: Math.round(Math.min(100, recoveryScore)),
    insights,
    monthlyData
  };
}

function getMonthlyRecoveryData(recoveryLogs: any[], moodLogs: any[]) {
  const monthlyMap = new Map();
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  // Initialize all months
  for (let i = 0; i < 12; i++) {
    monthlyMap.set(monthNames[i], { sessions: 0, mood: 0, stress: 5, moodCount: 0 });
  }

  // Add recovery sessions
  recoveryLogs.forEach(log => {
    const date = new Date(log.completed_at);
    const month = monthNames[date.getMonth()];
    if (monthlyMap.has(month)) {
      monthlyMap.get(month).sessions++;
    }
  });

  // Add mood data
  moodLogs.forEach(log => {
    const date = new Date(log.date);
    const month = monthNames[date.getMonth()];
    if (monthlyMap.has(month)) {
      const monthData = monthlyMap.get(month);
      monthData.mood += log.mood || 0;
      monthData.stress += log.wellness ? 10 - log.wellness : 5; // Inverse of wellness
      monthData.moodCount++;
    }
  });

  return Array.from(monthlyMap.entries()).map(([month, data]) => ({
    month,
    sessions: data.sessions,
    mood: data.moodCount > 0 ? Math.round((data.mood / data.moodCount) * 10) / 10 : 0,
    stress: data.moodCount > 0 ? Math.round((data.stress / data.moodCount) * 10) / 10 : 5
  }));
}

function generateYearlyRecoveryInsights(totalSessions: number, avgMood: number, avgStress: number, topTypes: any[], bestStreak: number): string[] {
  const insights = [];

  if (totalSessions >= 100) {
    insights.push("Outstanding recovery practice throughout the year!");
  } else if (totalSessions >= 50) {
    insights.push("Solid foundation in recovery practices established");
  } else if (totalSessions >= 25) {
    insights.push("Good progress in developing recovery habits");
  } else if (totalSessions > 0) {
    insights.push("Beginning your recovery journey - great first steps!");
  } else {
    insights.push("Consider incorporating recovery sessions into your routine");
  }

  if (avgMood >= 8) {
    insights.push("Exceptional emotional well-being maintained year-round");
  } else if (avgMood >= 7) {
    insights.push("Strong emotional balance achieved through the year");
  } else if (avgMood >= 6) {
    insights.push("Positive mood trends developed throughout the year");
  }

  if (avgStress <= 3) {
    insights.push("Excellent stress management throughout the year");
  } else if (avgStress <= 4) {
    insights.push("Good stress control maintained consistently");
  } else if (avgStress <= 5) {
    insights.push("Stress levels kept in healthy range");
  }

  if (bestStreak >= 30) {
    insights.push(`Remarkable ${bestStreak}-day recovery streak achieved!`);
  } else if (bestStreak >= 14) {
    insights.push(`Strong ${bestStreak}-day recovery streak built`);
  } else if (bestStreak >= 7) {
    insights.push(`Good ${bestStreak}-day recovery consistency developed`);
  }

  if (topTypes.length > 0) {
    const topType = topTypes[0];
    insights.push(`${topType.type} became your go-to recovery method (${topType.count} sessions)`);
  }

  return insights.slice(0, 5);
}

function calculateYearlyRecoveryScore(recoveryData: any): number {
  return recoveryData.recovery_score;
}
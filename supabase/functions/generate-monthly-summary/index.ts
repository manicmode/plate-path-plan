import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Enhanced mood pattern analysis with AI tags
function analyzeMoodPatterns(moodLogs: any[], nutritionLogs: any[], supplementLogs: any[]) {
  const insights: string[] = [];
  
  if (moodLogs.length === 0) {
    return insights;
  }

  // Calculate averages
  const moodAvg = moodLogs.reduce((sum, log) => sum + (log.mood || 0), 0) / moodLogs.length;
  const energyAvg = moodLogs.reduce((sum, log) => sum + (log.energy || 0), 0) / moodLogs.length;
  const wellnessAvg = moodLogs.reduce((sum, log) => sum + (log.wellness || 0), 0) / moodLogs.length;

  // Analyze AI-detected tags for patterns
  const allTags: string[] = [];
  const tagsByDate: Record<string, string[]> = {};
  
  moodLogs.forEach(log => {
    if (log.ai_detected_tags && Array.isArray(log.ai_detected_tags)) {
      allTags.push(...log.ai_detected_tags);
      tagsByDate[log.date] = log.ai_detected_tags;
    }
  });

  // Find most common tags
  const tagFrequency: Record<string, number> = {};
  allTags.forEach(tag => {
    tagFrequency[tag] = (tagFrequency[tag] || 0) + 1;
  });

  const commonTags = Object.entries(tagFrequency)
    .filter(([_, count]) => count >= 3)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  // Report on common patterns
  commonTags.forEach(([tag, count]) => {
    const tagDisplayName = tag.replace(/_/g, ' ');
    if (count >= 5) {
      insights.push(`You mentioned "${tagDisplayName}" ${count} times this month - might be worth discussing with a healthcare provider.`);
    } else if (count >= 3) {
      insights.push(`"${tagDisplayName}" appeared ${count} times in your logs.`);
    }
  });

  // Identify low energy/mood days
  const lowEnergyDays = moodLogs.filter(log => (log.energy || 0) <= 4);
  const lowMoodDays = moodLogs.filter(log => (log.mood || 0) <= 4);
  const lowWellnessDays = moodLogs.filter(log => (log.wellness || 0) <= 4);

  // Enhanced breakfast analysis with AI tags
  if (lowEnergyDays.length >= 3) {
    const breakfastMissedCount = lowEnergyDays.filter(moodLog => {
      const date = moodLog.date;
      const morningMeals = nutritionLogs.filter(nutLog => {
        const nutDate = nutLog.created_at.split('T')[0];
        const nutHour = parseInt(nutLog.created_at.split('T')[1].split(':')[0]);
        return nutDate === date && nutHour <= 10;
      });
      return morningMeals.length === 0;
    }).length;

    if (breakfastMissedCount >= Math.floor(lowEnergyDays.length * 0.6)) {
      insights.push(`You logged low energy on ${lowEnergyDays.length} days. On ${breakfastMissedCount} of those, you skipped breakfast.`);
    }

    // Check if fatigue tag correlates with skipped breakfast
    const fatigueOnLowEnergyDays = lowEnergyDays.filter(log => 
      log.ai_detected_tags?.includes('fatigue') || log.ai_detected_tags?.includes('tired')
    ).length;
    
    if (fatigueOnLowEnergyDays >= 2) {
      insights.push(`Fatigue was specifically mentioned ${fatigueOnLowEnergyDays} times on low energy days.`);
    }
  }

  // Enhanced supplement analysis with AI tags
  const digestiveIssueTags = ['bloating', 'stomach_ache', 'nausea', 'digestive_issues', 'acid_reflux', 'indigestion'];
  const digestiveIssues = moodLogs.filter(log => 
    log.ai_detected_tags?.some((tag: string) => digestiveIssueTags.includes(tag))
  );

  if (digestiveIssues.length >= 3) {
    // Find common supplements on digestive issue days
    const supplementCounts: Record<string, number> = {};
    digestiveIssues.forEach(moodLog => {
      const date = moodLog.date;
      const daySupplement = supplementLogs.filter(suppLog => 
        suppLog.created_at.split('T')[0] === date
      );
      daySupplement.forEach(supp => {
        supplementCounts[supp.name] = (supplementCounts[supp.name] || 0) + 1;
      });
    });

    for (const [suppName, count] of Object.entries(supplementCounts)) {
      if (count >= Math.floor(digestiveIssues.length * 0.7)) {
        insights.push(`Digestive discomfort was mentioned ${digestiveIssues.length} times, ${count} times after taking ${suppName}.`);
      }
    }
  }

  // Analyze stress patterns
  const stressTags = ['stressed', 'anxious', 'overwhelmed', 'work_pressure'];
  const stressfulDays = moodLogs.filter(log => 
    log.ai_detected_tags?.some((tag: string) => stressTags.includes(tag))
  );

  if (stressfulDays.length >= 4) {
    const avgMoodOnStressfulDays = stressfulDays.reduce((sum, log) => sum + (log.mood || 0), 0) / stressfulDays.length;
    if (avgMoodOnStressfulDays < moodAvg - 1) {
      insights.push(`Stress-related feelings appeared ${stressfulDays.length} times and correlated with lower mood scores.`);
    }
  }

  // Analyze positive patterns - high energy/mood days
  const highEnergyDays = moodLogs.filter(log => (log.energy || 0) >= 8);
  const positiveTags = ['happy', 'grateful', 'motivated', 'content', 'energetic', 'refreshed'];
  
  if (highEnergyDays.length >= 3) {
    const positiveTagsOnGoodDays = highEnergyDays.filter(log =>
      log.ai_detected_tags?.some((tag: string) => positiveTags.includes(tag))
    ).length;

    if (positiveTagsOnGoodDays >= 2) {
      insights.push(`Great job! Positive feelings were noted ${positiveTagsOnGoodDays} times on your high-energy days.`);
    }

    // Check protein patterns on high energy days
    const proteinMorningCount = highEnergyDays.filter(moodLog => {
      const date = moodLog.date;
      const morningMeals = nutritionLogs.filter(nutLog => {
        const nutDate = nutLog.created_at.split('T')[0];
        const nutHour = parseInt(nutLog.created_at.split('T')[1].split(':')[0]);
        const hasProtein = nutLog.food_name?.toLowerCase().includes('protein') ||
                          nutLog.food_name?.toLowerCase().includes('egg') ||
                          nutLog.food_name?.toLowerCase().includes('chicken') ||
                          nutLog.food_name?.toLowerCase().includes('fish') ||
                          nutLog.food_name?.toLowerCase().includes('meat');
        return nutDate === date && nutHour <= 12 && hasProtein;
      });
      return morningMeals.length > 0;
    }).length;

    if (proteinMorningCount >= Math.floor(highEnergyDays.length * 0.7)) {
      insights.push(`You feel best when protein is logged early in the day — keep that up!`);
    }
  }

  // Sleep pattern analysis
  const sleepTags = ['insomnia', 'restless_sleep', 'sleep_quality_poor', 'tired'];
  const poorSleepDays = moodLogs.filter(log => 
    log.ai_detected_tags?.some((tag: string) => sleepTags.includes(tag))
  );

  if (poorSleepDays.length >= 4) {
    const avgEnergyOnPoorSleepDays = poorSleepDays.reduce((sum, log) => sum + (log.energy || 0), 0) / poorSleepDays.length;
    if (avgEnergyOnPoorSleepDays < energyAvg - 1) {
      insights.push(`Sleep issues were mentioned ${poorSleepDays.length} times and strongly correlated with low energy.`);
    }
  }

  // Check overall wellness trends
  if (wellnessAvg >= 8) {
    insights.push(`Outstanding wellness this month with an average of ${wellnessAvg.toFixed(1)}/10!`);
  } else if (wellnessAvg <= 5) {
    insights.push(`Your wellness averaged ${wellnessAvg.toFixed(1)}/10 this month. Small nutrition changes can make a big difference.`);
  }

  return insights;
}

// Enhanced message generation with mood insights
function generateEnhancedMessage(
  avgScore: number,
  prevAvgScore: number | null,
  mealsCount: number,
  daysWithMeals: number,
  daysInMonth: number,
  moodInsights: string[]
): string {
  let message = '';
  
  // Base nutrition message
  if (mealsCount === 0) {
    message = "Time for a fresh start this month! Let's build some healthy habits 🌱";
  } else if (daysWithMeals <= 3) {
    message = "🔄 Let's get back on track! Small steps lead to big changes.";
  } else if (daysWithMeals >= Math.floor(daysInMonth * 0.8)) {
    message = `🎉 Outstanding consistency! You logged meals ${daysWithMeals} out of ${daysInMonth} days!`;
  } else if (prevAvgScore && avgScore > prevAvgScore) {
    const improvement = ((avgScore - prevAvgScore) / prevAvgScore * 100).toFixed(1);
    message = `📈 Fantastic progress! Your average score improved by ${improvement}% this month!`;
  } else if (prevAvgScore && avgScore < prevAvgScore) {
    const decline = ((prevAvgScore - avgScore) / prevAvgScore * 100).toFixed(1);
    message = `📉 Your average dipped by ${decline}% — but every new day is a chance to improve!`;
  } else if (avgScore >= 85) {
    message = `🌟 Exceptional month with an average score of ${avgScore.toFixed(1)}!`;
  } else if (avgScore >= 70) {
    message = `💪 Strong month! You're averaging ${avgScore.toFixed(1)} — keep building momentum!`;
  } else if (avgScore >= 50) {
    message = `🎯 This month averaged ${avgScore.toFixed(1)}. Every meal is a step forward!`;
  } else {
    message = `🌅 Ready for a fresh start? This month's journey begins with your next meal!`;
  }

  // Add mood insights if available
  if (moodInsights.length > 0) {
    message += '\n\n🧠 Wellness Insights:\n';
    moodInsights.forEach((insight, index) => {
      message += `• ${insight}\n`;
    });
    
    // Add personalized recommendations based on insights
    if (moodInsights.some(insight => insight.includes('skipped breakfast'))) {
      message += '\n💡 Try setting a breakfast reminder to boost your energy levels.';
    }
    if (moodInsights.some(insight => insight.includes('digestive discomfort'))) {
      message += '\n💡 Consider tracking which supplements correlate with digestive issues.';
    }
    if (moodInsights.some(insight => insight.includes('protein is logged early'))) {
      message += '\n🌟 Your morning protein routine is working great!';
    }
    if (moodInsights.some(insight => insight.includes('Sleep issues'))) {
      message += '\n💡 Consider establishing a consistent bedtime routine.';
    }
    if (moodInsights.some(insight => insight.includes('Stress-related feelings'))) {
      message += '\n💡 Stress management techniques might help improve your overall mood.';
    }
  }

  return message;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('❌ Error getting user:', userError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`🔄 Generating monthly summary for user: ${user.id}`);

    // Get today's date and calculate the current month start
    const today = new Date();
    const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    
    // Calculate the previous month start
    const previousMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    
    // Calculate the end of previous month
    const previousMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
    
    const currentMonthStartStr = currentMonthStart.toISOString().split('T')[0];
    const previousMonthStartStr = previousMonthStart.toISOString().split('T')[0];

    console.log(`📅 Current month start: ${currentMonthStartStr}`);
    console.log(`📅 Previous month start: ${previousMonthStartStr}`);

    // Check if summary already exists for this month
    const { data: existingSummary } = await supabase
      .from('monthly_summaries')
      .select('id, message')
      .eq('user_id', user.id)
      .eq('month_start', currentMonthStartStr)
      .maybeSingle();

    if (existingSummary) {
      console.log(`⏭️ Summary already exists for month ${currentMonthStartStr}`);
      return new Response(JSON.stringify({
        message: 'Monthly summary already exists',
        existing_summary: existingSummary.message
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get this month's meal scores (from first day of month to today)
    const { data: currentMonthScores, error: currentMonthError } = await supabase
      .from('meal_scores')
      .select('score, created_at')
      .eq('user_id', user.id)
      .gte('created_at', currentMonthStart.toISOString())
      .lte('created_at', today.toISOString());

    // Get mood/wellness logs for analysis
    const { data: moodLogs, error: moodError } = await supabase
      .from('mood_logs')
      .select('date, mood, energy, wellness, journal_text, ai_detected_tags')
      .eq('user_id', user.id)
      .gte('date', currentMonthStartStr)
      .lte('date', today.toISOString().split('T')[0]);

    // Get nutrition logs for pattern analysis
    const { data: nutritionLogs, error: nutritionError } = await supabase
      .from('nutrition_logs')
      .select('created_at, food_name, quality_score')
      .eq('user_id', user.id)
      .gte('created_at', currentMonthStart.toISOString())
      .lte('created_at', today.toISOString());

    // Get supplement logs for pattern analysis
    const { data: supplementLogs, error: supplementError } = await supabase
      .from('supplement_logs')
      .select('created_at, name')
      .eq('user_id', user.id)
      .gte('created_at', currentMonthStart.toISOString())
      .lte('created_at', today.toISOString());

    if (currentMonthError) {
      console.error(`❌ Error fetching current month's scores:`, currentMonthError);
      return new Response(JSON.stringify({ error: currentMonthError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get previous month's meal scores
    const { data: previousMonthScores, error: previousMonthError } = await supabase
      .from('meal_scores')
      .select('score, created_at')
      .eq('user_id', user.id)
      .gte('created_at', previousMonthStart.toISOString())
      .lte('created_at', previousMonthEnd.toISOString());

    if (previousMonthError) {
      console.error(`❌ Error fetching previous month's scores:`, previousMonthError);
      return new Response(JSON.stringify({ error: previousMonthError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Calculate current month's stats
    const mealsLoggedCount = currentMonthScores?.length || 0;
    const averageScoreCurrentMonth = mealsLoggedCount > 0 
      ? currentMonthScores!.reduce((sum, score) => sum + Number(score.score), 0) / mealsLoggedCount
      : 0;

    // Calculate days with meals this month
    const uniqueDaysCurrentMonth = new Set(
      (currentMonthScores || []).map(score => score.created_at.split('T')[0])
    );
    const daysWithMeals = uniqueDaysCurrentMonth.size;

    // Calculate previous month's average
    const previousMonthMealsCount = previousMonthScores?.length || 0;
    const averageScoreLastMonth = previousMonthMealsCount > 0
      ? previousMonthScores!.reduce((sum, score) => sum + Number(score.score), 0) / previousMonthMealsCount
      : null;

    console.log(`📊 Stats - Current month: ${averageScoreCurrentMonth.toFixed(1)} avg, ${mealsLoggedCount} meals, ${daysWithMeals} days`);
    console.log(`📊 Stats - Previous month: ${averageScoreLastMonth?.toFixed(1) || 'N/A'} avg, ${previousMonthMealsCount} meals`);

    // Calculate days in current month so far
    const daysInMonth = today.getDate();

    // Analyze mood/wellness patterns with enhanced AI tag analysis
    const moodInsights = analyzeMoodPatterns(moodLogs || [], nutritionLogs || [], supplementLogs || []);
    console.log(`🧠 Enhanced mood insights generated:`, moodInsights);

    // Generate personalized message based on performance and mood insights
    const message = generateEnhancedMessage(
      averageScoreCurrentMonth,
      averageScoreLastMonth,
      mealsLoggedCount,
      daysWithMeals,
      daysInMonth,
      moodInsights
    );

    // Insert the monthly summary
    const { data: insertedSummary, error: insertError } = await supabase
      .from('monthly_summaries')
      .insert({
        user_id: user.id,
        month_start: currentMonthStartStr,
        average_score: Math.round(averageScoreCurrentMonth * 100) / 100,
        previous_month_average: averageScoreLastMonth ? Math.round(averageScoreLastMonth * 100) / 100 : null,
        meals_logged_count: mealsLoggedCount,
        days_with_meals: daysWithMeals,
        message
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Error inserting monthly summary:', insertError);
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`✅ Generated enhanced monthly summary: ${message}`);

    return new Response(JSON.stringify({
      message: 'Monthly summary generated successfully',
      summary: {
        month_start: currentMonthStartStr,
        average_score_current_month: Math.round(averageScoreCurrentMonth * 100) / 100,
        average_score_last_month: averageScoreLastMonth ? Math.round(averageScoreLastMonth * 100) / 100 : null,
        meals_logged_count: mealsLoggedCount,
        days_with_meals: daysWithMeals,
        generated_message: message
      },
      inserted_summary: insertedSummary
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

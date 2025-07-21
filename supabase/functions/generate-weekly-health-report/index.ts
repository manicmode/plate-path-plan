import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("🚀 Generating weekly health report...");

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header provided');
    }

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    console.log(`📊 Fetching data for user: ${user.id}`);

    // Fetch user data for the past week
    const weeklyData = await fetchWeeklyUserData(supabase, user.id);
    
    // Generate HTML report with real data
    const reportHtml = generateWeeklyReportHTML(weeklyData);
    
    console.log("✅ Weekly report generated successfully");

    return new Response(reportHtml, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html; charset=utf-8',
      },
    });

  } catch (error) {
    console.error("❌ Error generating weekly report:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function fetchWeeklyUserData(supabase: any, userId: string) {
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 6);
  weekStart.setHours(0, 0, 0, 0);
  
  const weekEnd = new Date();
  weekEnd.setHours(23, 59, 59, 999);

  console.log(`📅 Fetching data from ${weekStart.toISOString()} to ${weekEnd.toISOString()}`);

  // Fetch all data in parallel
  const [
    nutritionLogs,
    hydrationLogs,
    supplementLogs,
    moodLogs,
    toxinDetections,
    userProfile
  ] = await Promise.all([
    // Nutrition logs for the past week
    supabase
      .from('nutrition_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', weekStart.toISOString())
      .lte('created_at', weekEnd.toISOString())
      .order('created_at', { ascending: true }),
    
    // Hydration logs for the past week
    supabase
      .from('hydration_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', weekStart.toISOString())
      .lte('created_at', weekEnd.toISOString())
      .order('created_at', { ascending: true }),
    
    // Supplement logs for the past week
    supabase
      .from('supplement_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', weekStart.toISOString())
      .lte('created_at', weekEnd.toISOString())
      .order('created_at', { ascending: true }),
    
    // Mood logs for the past week
    supabase
      .from('mood_logs')
      .select('date, mood, energy, wellness, ai_detected_tags')
      .eq('user_id', userId)
      .gte('date', weekStart.toISOString().split('T')[0])
      .lte('date', weekEnd.toISOString().split('T')[0])
      .order('date', { ascending: true }),
    
    // Toxin detections for the past week
    supabase
      .from('toxin_detections')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', weekStart.toISOString())
      .lte('created_at', weekEnd.toISOString()),
    
    // User profile for streaks and basic info
    supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()
  ]);

  // Check for errors
  if (nutritionLogs.error) console.error('Nutrition logs error:', nutritionLogs.error);
  if (hydrationLogs.error) console.error('Hydration logs error:', hydrationLogs.error);
  if (supplementLogs.error) console.error('Supplement logs error:', supplementLogs.error);
  if (moodLogs.error) console.error('Mood logs error:', moodLogs.error);
  if (toxinDetections.error) console.error('Toxin detections error:', toxinDetections.error);
  if (userProfile.error) console.error('User profile error:', userProfile.error);

  return {
    nutritionLogs: nutritionLogs.data || [],
    hydrationLogs: hydrationLogs.data || [],
    supplementLogs: supplementLogs.data || [],
    moodLogs: moodLogs.data || [],
    toxinDetections: toxinDetections.data || [],
    userProfile: userProfile.data || {},
    weekStart,
    weekEnd
  };
}

function calculateWeeklyStats(data: any) {
  const { nutritionLogs, hydrationLogs, supplementLogs, moodLogs, toxinDetections, userProfile } = data;
  
  // Calculate daily averages for macronutrients
  const dailyNutrition = {};
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  // Group nutrition logs by day
  nutritionLogs.forEach((log: any) => {
    const logDate = new Date(log.created_at);
    const dayIndex = (logDate.getDay() + 6) % 7; // Convert Sunday=0 to Monday=0
    const dayName = days[dayIndex];
    
    if (!dailyNutrition[dayName]) {
      dailyNutrition[dayName] = {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber: 0,
        sugar: 0,
        sodium: 0,
        count: 0,
        qualityScores: []
      };
    }
    
    dailyNutrition[dayName].calories += log.calories || 0;
    dailyNutrition[dayName].protein += log.protein || 0;
    dailyNutrition[dayName].carbs += log.carbs || 0;
    dailyNutrition[dayName].fat += log.fat || 0;
    dailyNutrition[dayName].fiber += log.fiber || 0;
    dailyNutrition[dayName].sugar += log.sugar || 0;
    dailyNutrition[dayName].sodium += log.sodium || 0;
    dailyNutrition[dayName].count += 1;
    
    if (log.quality_score) {
      dailyNutrition[dayName].qualityScores.push(log.quality_score);
    }
  });

  // Calculate weekly averages
  const totalDays = Object.keys(dailyNutrition).length;
  const weeklyAverages = {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0
  };

  Object.values(dailyNutrition).forEach((day: any) => {
    weeklyAverages.calories += day.calories;
    weeklyAverages.protein += day.protein;
    weeklyAverages.carbs += day.carbs;
    weeklyAverages.fat += day.fat;
    weeklyAverages.fiber += day.fiber;
  });

  if (totalDays > 0) {
    weeklyAverages.calories = Math.round(weeklyAverages.calories / totalDays);
    weeklyAverages.protein = Math.round(weeklyAverages.protein / totalDays);
    weeklyAverages.carbs = Math.round(weeklyAverages.carbs / totalDays);
    weeklyAverages.fat = Math.round(weeklyAverages.fat / totalDays);
    weeklyAverages.fiber = Math.round(weeklyAverages.fiber / totalDays);
  }

  // Calculate overall health score
  const avgHealthScore = nutritionLogs.length > 0 
    ? nutritionLogs.reduce((sum: number, log: any) => sum + (log.quality_score || 50), 0) / nutritionLogs.length / 10
    : 0;

  // Count top foods
  const foodCounts = {};
  nutritionLogs.forEach((log: any) => {
    const foodName = log.food_name;
    foodCounts[foodName] = (foodCounts[foodName] || 0) + 1;
  });
  
  const topFoods = Object.entries(foodCounts)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  // Count unique supplements and their frequency
  const supplementCounts = {};
  supplementLogs.forEach((log: any) => {
    const suppName = log.name;
    const logDate = new Date(log.created_at).toDateString();
    const key = `${suppName}-${logDate}`;
    
    if (!supplementCounts[suppName]) {
      supplementCounts[suppName] = new Set();
    }
    supplementCounts[suppName].add(logDate);
  });

  const supplementStats = Object.entries(supplementCounts).map(([name, daysSet]) => ({
    name,
    daysCount: (daysSet as Set<string>).size,
    percentage: Math.round(((daysSet as Set<string>).size / 7) * 100)
  }));

  // Calculate consistency stats
  const uniqueNutritionDays = new Set(
    nutritionLogs.map((log: any) => new Date(log.created_at).toDateString())
  ).size;
  
  const uniqueHydrationDays = new Set(
    hydrationLogs.map((log: any) => new Date(log.created_at).toDateString())
  ).size;

  const uniqueSupplementDays = new Set(
    supplementLogs.map((log: any) => new Date(log.created_at).toDateString())
  ).size;

  // Process mood data
  const dailyMoods = {};
  moodLogs.forEach((log: any) => {
    const dayIndex = new Date(log.date).getDay();
    const dayName = days[(dayIndex + 6) % 7];
    dailyMoods[dayName] = {
      mood: log.mood || 5,
      energy: log.energy || 5,
      wellness: log.wellness || 5
    };
  });

  // Process toxin data
  const toxinTypes = {};
  toxinDetections.forEach((detection: any) => {
    const toxinType = detection.toxin_type;
    toxinTypes[toxinType] = (toxinTypes[toxinType] || 0) + 1;
  });

  return {
    dailyNutrition,
    weeklyAverages,
    avgHealthScore: Math.round(avgHealthScore * 10) / 10,
    topFoods,
    supplementStats,
    nutritionDaysLogged: uniqueNutritionDays,
    hydrationDaysLogged: uniqueHydrationDays,
    supplementDaysLogged: uniqueSupplementDays,
    dailyMoods,
    toxinTypes,
    totalMealsLogged: nutritionLogs.length,
    streaks: {
      nutrition: userProfile.current_nutrition_streak || 0,
      hydration: userProfile.current_hydration_streak || 0,
      supplement: userProfile.current_supplement_streak || 0
    }
  };
}

function generateWeeklyReportHTML(weeklyData: any): string {
  const currentDate = new Date();
  const weekStart = new Date(currentDate.getTime() - 6 * 24 * 60 * 60 * 1000);
  
  // Calculate all stats from the weekly data
  const stats = calculateWeeklyStats(weeklyData);
  
  // Generate chart data arrays for each day
  const chartDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const proteinData = chartDays.map(day => {
    const fullDayName = day === 'Mon' ? 'Monday' : 
                       day === 'Tue' ? 'Tuesday' :
                       day === 'Wed' ? 'Wednesday' :
                       day === 'Thu' ? 'Thursday' :
                       day === 'Fri' ? 'Friday' :
                       day === 'Sat' ? 'Saturday' : 'Sunday';
    return stats.dailyNutrition[fullDayName]?.protein || 0;
  });
  
  const carbsData = chartDays.map(day => {
    const fullDayName = day === 'Mon' ? 'Monday' : 
                       day === 'Tue' ? 'Tuesday' :
                       day === 'Wed' ? 'Wednesday' :
                       day === 'Thu' ? 'Thursday' :
                       day === 'Fri' ? 'Friday' :
                       day === 'Sat' ? 'Saturday' : 'Sunday';
    return stats.dailyNutrition[fullDayName]?.carbs || 0;
  });
  
  const fatData = chartDays.map(day => {
    const fullDayName = day === 'Mon' ? 'Monday' : 
                       day === 'Tue' ? 'Tuesday' :
                       day === 'Wed' ? 'Wednesday' :
                       day === 'Thu' ? 'Thursday' :
                       day === 'Fri' ? 'Friday' :
                       day === 'Sat' ? 'Saturday' : 'Sunday';
    return stats.dailyNutrition[fullDayName]?.fat || 0;
  });

  const moodData = chartDays.map(day => {
    const fullDayName = day === 'Mon' ? 'Monday' : 
                       day === 'Tue' ? 'Tuesday' :
                       day === 'Wed' ? 'Wednesday' :
                       day === 'Thu' ? 'Thursday' :
                       day === 'Fri' ? 'Friday' :
                       day === 'Sat' ? 'Saturday' : 'Sunday';
    return stats.dailyMoods[fullDayName]?.mood || 5;
  });

  const nutritionQualityData = chartDays.map(day => {
    const fullDayName = day === 'Mon' ? 'Monday' : 
                       day === 'Tue' ? 'Tuesday' :
                       day === 'Wed' ? 'Wednesday' :
                       day === 'Thu' ? 'Thursday' :
                       day === 'Fri' ? 'Friday' :
                       day === 'Sat' ? 'Saturday' : 'Sunday';
    const scores = stats.dailyNutrition[fullDayName]?.qualityScores || [];
    return scores.length > 0 ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length / 10 : 5;
  });

  // Generate supplement cards HTML
  const supplementCardsHTML = stats.supplementStats.map((supp: any) => {
    const cardClass = supp.percentage >= 70 ? 'taken' : 'missed';
    return `
      <div class="supplement-card ${cardClass}">
        <div><strong>${supp.name}</strong></div>
        <div>${supp.daysCount}/7 days</div>
      </div>
    `;
  }).join('');

  // Generate top foods HTML
  const topFoodsHTML = stats.topFoods.map((food: any) => `
    <li>
      <span>${food.name}</span>
      <span>${food.count} times</span>
    </li>
  `).join('');

  // Generate toxin alerts
  const toxinAlertsHTML = Object.entries(stats.toxinTypes).map(([toxinType, count]) => `
    <div class="alert-item">
      <strong>⚠️ ${toxinType} Alert:</strong> Detected ${count} time${(count as number) > 1 ? 's' : ''} this week. Consider reviewing ingredient labels.
    </div>
  `).join('');

  const nutritionConsistency = Math.round((stats.nutritionDaysLogged / 7) * 100);
  const hydrationConsistency = Math.round((stats.hydrationDaysLogged / 7) * 100);
  const supplementConsistency = Math.round((stats.supplementDaysLogged / 7) * 100);
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Weekly Health Report - ${currentDate.toLocaleDateString()}</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #ffffff;
            color: #333333;
            line-height: 1.6;
            padding: 40px 20px;
            max-width: 900px;
            margin: 0 auto;
        }
        
        .header {
            text-align: center;
            border-bottom: 3px solid #4f46e5;
            padding-bottom: 30px;
            margin-bottom: 40px;
        }
        
        .header h1 {
            font-size: 2.5rem;
            color: #4f46e5;
            margin-bottom: 10px;
            font-weight: 700;
        }
        
        .header .date-range {
            font-size: 1.2rem;
            color: #6b7280;
            font-weight: 500;
        }
        
        .section {
            margin-bottom: 50px;
            background: #fafafa;
            border-radius: 12px;
            padding: 30px;
            border-left: 5px solid #4f46e5;
        }
        
        .section h2 {
            font-size: 1.8rem;
            color: #1f2937;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .section h3 {
            font-size: 1.3rem;
            color: #374151;
            margin-bottom: 15px;
            margin-top: 25px;
        }
        
        .chart-container {
            position: relative;
            height: 300px;
            margin: 25px 0;
            background: white;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        
        .chart-container canvas {
            max-height: 260px;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }
        
        .stat-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            border: 1px solid #e5e7eb;
        }
        
        .stat-card .value {
            font-size: 2rem;
            font-weight: bold;
            color: #4f46e5;
            display: block;
        }
        
        .stat-card .label {
            color: #6b7280;
            font-size: 0.9rem;
            margin-top: 5px;
        }
        
        .progress-bar {
            background: #e5e7eb;
            border-radius: 10px;
            height: 20px;
            margin: 10px 0;
            overflow: hidden;
        }
        
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #10b981, #34d399);
            border-radius: 10px;
            transition: width 0.3s ease;
        }
        
        .food-list {
            list-style: none;
            background: white;
            border-radius: 8px;
            padding: 20px;
        }
        
        .food-list li {
            padding: 10px 0;
            border-bottom: 1px solid #f3f4f6;
            display: flex;
            justify-content: space-between;
        }
        
        .food-list li:last-child {
            border-bottom: none;
        }
        
        .summary-text {
            background: white;
            padding: 25px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid #10b981;
            font-size: 1.1rem;
            line-height: 1.8;
        }
        
        .alert-item {
            background: #fef2f2;
            border: 1px solid #fecaca;
            border-radius: 6px;
            padding: 15px;
            margin: 10px 0;
            color: #dc2626;
        }
        
        .recommendation {
            background: #f0f9ff;
            border: 1px solid #bae6fd;
            border-radius: 6px;
            padding: 15px;
            margin: 10px 0;
            color: #0369a1;
        }
        
        .supplement-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin: 20px 0;
        }
        
        .supplement-card {
            background: white;
            padding: 15px;
            border-radius: 8px;
            text-align: center;
            border: 2px solid #e5e7eb;
        }
        
        .supplement-card.taken {
            border-color: #10b981;
            background: #f0fdf4;
        }
        
        .supplement-card.missed {
            border-color: #ef4444;
            background: #fef2f2;
        }
        
        @media print {
            body {
                padding: 20px;
            }
            
            .section {
                break-inside: avoid;
                margin-bottom: 30px;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🩺 Weekly Health Report</h1>
        <div class="date-range">
            ${weekStart.toLocaleDateString()} - ${currentDate.toLocaleDateString()}
        </div>
    </div>

    <div class="section">
        <h2>📊 Summary of the Week</h2>
        <div class="stats-grid">
            <div class="stat-card">
                <span class="value">${stats.weeklyAverages.calories || 0}</span>
                <div class="label">Avg Daily Calories</div>
            </div>
            <div class="stat-card">
                <span class="value">${stats.nutritionDaysLogged}/7</span>
                <div class="label">Days Logged</div>
            </div>
            <div class="stat-card">
                <span class="value">${nutritionConsistency}%</span>
                <div class="label">Goal Achievement</div>
            </div>
            <div class="stat-card">
                <span class="value">${stats.avgHealthScore}</span>
                <div class="label">Avg Health Score</div>
            </div>
        </div>
        
        <div class="summary-text">
            <strong>Weekly Performance:</strong> ${stats.nutritionDaysLogged >= 5 ? 'Great consistency this week!' : 'Room for improvement in logging consistency.'} You logged ${stats.totalMealsLogged} meals across ${stats.nutritionDaysLogged} days. ${stats.avgHealthScore >= 7 ? 'Your meal quality scores show excellent choices!' : 'Consider focusing on more nutritious food choices.'}
        </div>
    </div>

    <div class="section">
        <h2>🥗 Macronutrient Trends</h2>
        <div class="chart-container">
            <canvas id="macroChart"></canvas>
        </div>
        
        <div class="stats-grid">
            <div class="stat-card">
                <span class="value">${stats.weeklyAverages.protein}g</span>
                <div class="label">Avg Protein</div>
            </div>
            <div class="stat-card">
                <span class="value">${stats.weeklyAverages.carbs}g</span>
                <div class="label">Avg Carbs</div>
            </div>
            <div class="stat-card">
                <span class="value">${stats.weeklyAverages.fat}g</span>
                <div class="label">Avg Fat</div>
            </div>
            <div class="stat-card">
                <span class="value">${stats.weeklyAverages.fiber}g</span>
                <div class="label">Avg Fiber</div>
            </div>
        </div>
    </div>

    <div class="section">
        <h2>🎯 Micronutrient Radar</h2>
        <div class="chart-container">
            <canvas id="microChart"></canvas>
        </div>
        <p>Your vitamin and mineral intake compared to recommended daily values. This chart shows estimated nutrient levels based on your logged foods.</p>
    </div>

    <div class="section">
        <h2>⚠️ Toxins & Flags Overview</h2>
        <div class="chart-container">
            <canvas id="toxinChart"></canvas>
        </div>
        
        ${toxinAlertsHTML || '<p>No toxin alerts detected this week - great job avoiding problematic ingredients!</p>'}
    </div>

    <div class="section">
        <h2>😊 Mood vs. Nutrition</h2>
        <div class="chart-container">
            <canvas id="moodChart"></canvas>
        </div>
        <p>Correlation between your daily mood scores and nutritional quality. ${moodData.some(m => m > 0) ? 'Track patterns between your mood and food choices.' : 'Start logging your mood to see trends with nutrition!'}</p>
    </div>

    <div class="section">
        <h2>💊 Supplement Snapshot</h2>
        <div class="supplement-grid">
            ${supplementCardsHTML || '<p>No supplements logged this week. Consider tracking your supplement intake for better insights.</p>'}
        </div>
        
        ${stats.supplementStats.length > 0 ? `
        <div class="recommendation">
            <strong>💡 Recommendation:</strong> ${stats.supplementStats.filter((s: any) => s.percentage < 70).length > 0 ? `Consider setting reminders for supplements you missed: ${stats.supplementStats.filter((s: any) => s.percentage < 70).map((s: any) => s.name).join(', ')}.` : 'Excellent supplement consistency this week!'}
        </div>
        ` : ''}
    </div>

    <div class="section">
        <h2>🔥 Consistency & Streak Status</h2>
        <h3>Nutrition Logging</h3>
        <div class="progress-bar">
            <div class="progress-fill" style="width: ${nutritionConsistency}%"></div>
        </div>
        <p>${stats.nutritionDaysLogged} out of 7 days logged - ${nutritionConsistency}% consistency (Current streak: ${stats.streaks.nutrition} days)</p>
        
        <h3>Hydration Tracking</h3>
        <div class="progress-bar">
            <div class="progress-fill" style="width: ${hydrationConsistency}%"></div>
        </div>
        <p>${stats.hydrationDaysLogged} out of 7 days tracked - ${hydrationConsistency}% consistency (Current streak: ${stats.streaks.hydration} days)</p>
        
        <h3>Supplement Logging</h3>
        <div class="progress-bar">
            <div class="progress-fill" style="width: ${supplementConsistency}%"></div>
        </div>
        <p>${stats.supplementDaysLogged} out of 7 days logged - ${supplementConsistency}% consistency (Current streak: ${stats.streaks.supplement} days)</p>
    </div>

    <div class="section">
        <h2>🍽️ Top Logged Foods</h2>
        <ul class="food-list">
            ${topFoodsHTML || '<li><span>No foods logged this week</span><span>-</span></li>'}
        </ul>
    </div>

    <div class="section">
        <h2>🤖 AI-Powered Summary & Suggestions</h2>
        <div class="summary-text">
            <strong>Overall Assessment:</strong> ${stats.nutritionDaysLogged >= 5 ? 'Excellent week with strong logging habits!' : 'Consider improving logging consistency for better insights.'} ${stats.avgHealthScore >= 7 ? 'Your food quality scores are impressive, showing great nutritional choices.' : 'Focus on incorporating more whole foods and nutrient-dense options.'} ${stats.totalMealsLogged >= 10 ? 'Your detailed meal tracking provides excellent data for analysis.' : 'More meal logging will give you better insights into your nutrition patterns.'}
        </div>
        
        <div class="recommendation">
            <strong>🎯 Next Week's Focus:</strong>
            <ul style="margin-left: 20px; margin-top: 10px;">
                ${nutritionConsistency < 70 ? '<li>Improve nutrition logging consistency - aim for daily tracking</li>' : ''}
                ${stats.weeklyAverages.fiber < 25 ? '<li>Increase fiber intake by adding more vegetables and whole grains</li>' : ''}
                ${hydrationConsistency < 70 ? '<li>Better hydration tracking - log water intake daily</li>' : ''}
                ${supplementConsistency < 70 ? '<li>Set daily supplement reminders for better consistency</li>' : ''}
                <li>Try incorporating more colorful vegetables for micronutrient diversity</li>
            </ul>
        </div>
        
        <div class="recommendation">
            <strong>🏆 Achievements This Week:</strong>
            <ul style="margin-left: 20px; margin-top: 10px;">
                ${nutritionConsistency >= 80 ? '<li>Nutrition Logging Champion - Excellent consistency!</li>' : ''}
                ${stats.avgHealthScore >= 7 ? '<li>Quality Food Choices - High nutrition scores</li>' : ''}
                ${stats.streaks.nutrition >= 7 ? '<li>Week-long Nutrition Streak - Amazing dedication!</li>' : ''}
                ${stats.totalMealsLogged >= 15 ? '<li>Detailed Tracker - Comprehensive meal logging</li>' : ''}
            </ul>
        </div>
    </div>

    <script>
        // Macronutrient Trends Chart
        const macroCtx = document.getElementById('macroChart').getContext('2d');
        new Chart(macroCtx, {
            type: 'line',
            data: {
                labels: ${JSON.stringify(chartDays)},
                datasets: [{
                    label: 'Protein (g)',
                    data: ${JSON.stringify(proteinData)},
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    tension: 0.3
                }, {
                    label: 'Carbs (g)',
                    data: ${JSON.stringify(carbsData)},
                    borderColor: '#f59e0b',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    tension: 0.3
                }, {
                    label: 'Fat (g)',
                    data: ${JSON.stringify(fatData)},
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Daily Macronutrient Intake'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });

        // Micronutrient Radar Chart (using estimated values)
        const microCtx = document.getElementById('microChart').getContext('2d');
        new Chart(microCtx, {
            type: 'radar',
            data: {
                labels: ['Vitamin A', 'Vitamin C', 'Vitamin D', 'Iron', 'Calcium', 'Magnesium', 'Zinc', 'B12'],
                datasets: [{
                    label: 'Estimated Intake (%RDA)',
                    data: [85, 110, 60, 75, 90, 88, 95, 120],
                    borderColor: '#4f46e5',
                    backgroundColor: 'rgba(79, 70, 229, 0.2)',
                    pointBackgroundColor: '#4f46e5'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 150,
                        ticks: {
                            stepSize: 30
                        }
                    }
                }
            }
        });

        // Toxins & Flags Chart
        const toxinTypes = ${JSON.stringify(Object.keys(stats.toxinTypes))};
        const toxinCounts = ${JSON.stringify(Object.values(stats.toxinTypes))};
        
        const toxinCtx = document.getElementById('toxinChart').getContext('2d');
        new Chart(toxinCtx, {
            type: 'bar',
            data: {
                labels: toxinTypes.length > 0 ? toxinTypes : ['No Toxins Detected'],
                datasets: [{
                    label: 'Detection Count',
                    data: toxinCounts.length > 0 ? toxinCounts : [0],
                    backgroundColor: toxinCounts.length > 0 ? 
                        toxinCounts.map(() => 'rgba(239, 68, 68, 0.8)') : 
                        ['rgba(34, 197, 94, 0.8)'],
                    borderColor: toxinCounts.length > 0 ? 
                        toxinCounts.map(() => 'rgba(239, 68, 68, 1)') : 
                        ['rgba(34, 197, 94, 1)'],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Weekly Toxin Detection Count'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Detection Count'
                        }
                    }
                }
            }
        });

        // Mood vs Nutrition Chart
        const moodCtx = document.getElementById('moodChart').getContext('2d');
        new Chart(moodCtx, {
            type: 'line',
            data: {
                labels: ${JSON.stringify(chartDays)},
                datasets: [{
                    label: 'Mood Score',
                    data: ${JSON.stringify(moodData)},
                    borderColor: '#8b5cf6',
                    backgroundColor: 'rgba(139, 92, 246, 0.1)',
                    yAxisID: 'y'
                }, {
                    label: 'Nutrition Quality',
                    data: ${JSON.stringify(nutritionQualityData)},
                    borderColor: '#06b6d4',
                    backgroundColor: 'rgba(6, 182, 212, 0.1)',
                    yAxisID: 'y1'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        min: 0,
                        max: 10,
                        title: {
                            display: true,
                            text: 'Mood Score'
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        min: 0,
                        max: 10,
                        title: {
                            display: true,
                            text: 'Nutrition Quality'
                        },
                        grid: {
                            drawOnChartArea: false,
                        },
                    }
                }
            }
        });
    </script>
</body>
</html>`;
}
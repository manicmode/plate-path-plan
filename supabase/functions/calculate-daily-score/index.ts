import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper function to get authenticated user
async function getUser(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return { user: null, error: 'Missing authorization header' };
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    {
      global: {
        headers: { Authorization: authHeader },
      },
    }
  );

  const { data: { user }, error } = await supabaseClient.auth.getUser();
  if (error || !user) {
    return { user: null, error: 'Unauthorized' };
  }
  
  return { user, error: null };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Authenticate user
    const { user } = await getUser(req);
    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { target_date } = await req.json()
    
    // Use authenticated user ID instead of trusting client
    const user_id = user.id
    
    // Default to today if no target_date provided
    const dateToCalculate = target_date || new Date().toISOString().split('T')[0]
    
    console.log(`Calculating daily score for user ${user_id} on ${dateToCalculate}`)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get or create daily nutrition targets for this date
    let { data: dailyTargets, error: targetsError } = await supabase
      .from('daily_nutrition_targets')
      .select('*')
      .eq('user_id', user_id)
      .eq('target_date', dateToCalculate)
      .maybeSingle()

    if (targetsError) {
      console.error('Error fetching daily targets:', targetsError)
      return new Response(JSON.stringify({ error: 'Failed to fetch daily targets' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // If no targets exist, create default ones
    if (!dailyTargets) {
      console.log('No daily targets found, creating default targets')
      const { data: newTargets, error: createError } = await supabase
        .from('daily_nutrition_targets')
        .insert({
          user_id,
          target_date: dateToCalculate,
          calories: 2000,
          protein: 150,
          carbs: 250,
          fat: 65,
          fiber: 25,
          hydration_ml: 2000,
          supplement_count: 0
        })
        .select()
        .single()

      if (createError) {
        console.error('Error creating daily targets:', createError)
        return new Response(JSON.stringify({ error: 'Failed to create daily targets' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      
      dailyTargets = newTargets
    }

    // Get nutrition, hydration, and supplement logs for the date
    const startOfDay = `${dateToCalculate}T00:00:00.000Z`
    const endOfDay = `${dateToCalculate}T23:59:59.999Z`

    const [
      { data: nutritionLogs },
      { data: hydrationLogs },
      { data: supplementLogs },
      { data: toxinDetections }
    ] = await Promise.all([
      supabase
        .from('nutrition_logs')
        .select('*')
        .eq('user_id', user_id)
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay),
      
      supabase
        .from('hydration_logs')
        .select('*')
        .eq('user_id', user_id)
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay),
      
      supabase
        .from('supplement_logs')
        .select('*')
        .eq('user_id', user_id)
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay),
      
      supabase
        .from('toxin_detections')
        .select('*')
        .eq('user_id', user_id)
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay)
    ])

    console.log(`Found ${nutritionLogs?.length || 0} nutrition logs, ${hydrationLogs?.length || 0} hydration logs, ${supplementLogs?.length || 0} supplement logs, ${toxinDetections?.length || 0} toxin detections`)

    // Calculate daily score
    const dailyScore = calculateDailyScore({
      targets: dailyTargets,
      nutritionLogs: nutritionLogs || [],
      hydrationLogs: hydrationLogs || [],
      supplementLogs: supplementLogs || [],
      toxinDetections: toxinDetections || []
    })

    // Store the calculated score
    const { data: scoreRecord, error: scoreError } = await supabase
      .from('daily_scores')
      .upsert({
        user_id,
        date: dateToCalculate,
        score: dailyScore.totalScore,
        breakdown: dailyScore.breakdown,
        metrics: {
          nutrition_logs_count: nutritionLogs?.length || 0,
          hydration_logs_count: hydrationLogs?.length || 0,
          supplement_logs_count: supplementLogs?.length || 0,
          toxin_detections_count: toxinDetections?.length || 0,
          calculated_at: new Date().toISOString()
        }
      }, {
        onConflict: 'user_id,date'
      })
      .select()
      .single()

    if (scoreError) {
      console.error('Error storing daily score:', scoreError)
      // Continue anyway, return the calculated score
    }

    return new Response(JSON.stringify({
      ...dailyScore,
      date: dateToCalculate,
      stored: !scoreError
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error in calculate-daily-score:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

function calculateDailyScore({
  targets,
  nutritionLogs,
  hydrationLogs,
  supplementLogs,
  toxinDetections
}: {
  targets: any,
  nutritionLogs: any[],
  hydrationLogs: any[],
  supplementLogs: any[],
  toxinDetections: any[]
}) {
  
  // Aggregate nutrition data
  const totalNutrition = nutritionLogs.reduce((acc, log) => ({
    calories: acc.calories + (log.calories || 0),
    protein: acc.protein + (log.protein || 0),
    carbs: acc.carbs + (log.carbs || 0),
    fat: acc.fat + (log.fat || 0),
    fiber: acc.fiber + (log.fiber || 0),
    sugar: acc.sugar + (log.sugar || 0),
    sodium: acc.sodium + (log.sodium || 0)
  }), { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 })

  // Aggregate hydration
  const totalHydration = hydrationLogs.reduce((acc, log) => acc + (log.volume || 0), 0)

  let totalScore = 0
  
  // Calculate individual scores
  const nutritionScore = calculateNutritionScore(targets, totalNutrition)
  totalScore += nutritionScore
  
  const hydrationScore = calculateHydrationScore(targets, totalHydration)
  totalScore += hydrationScore
  
  const supplementScore = calculateSupplementScore(targets, supplementLogs)
  totalScore += supplementScore
  
  const bonusPoints = calculateBonusPoints(nutritionLogs, hydrationLogs, supplementLogs)
  totalScore += bonusPoints
  
  // Toxin penalty
  const toxinPenalty = toxinDetections.length * 10 // 10 points penalty per toxin
  totalScore = Math.max(0, totalScore - toxinPenalty)

  return {
    totalScore: Math.min(100, totalScore),
    breakdown: {
      nutrition: nutritionScore,
      hydration: hydrationScore,
      supplements: supplementScore,
      bonus: bonusPoints,
      toxinPenalty: -toxinPenalty
    },
    actual: {
      nutrition: totalNutrition,
      hydration: totalHydration,
      supplements: supplementLogs.length,
      toxins: toxinDetections.length
    },
    targets: {
      calories: targets.calories,
      protein: targets.protein,
      carbs: targets.carbs,
      fat: targets.fat,
      fiber: targets.fiber,
      hydration: targets.hydration_ml,
      supplements: targets.supplement_count
    }
  }
}

function calculateNutritionScore(targets: any, actual: any): number {
  const maxNutritionScore = 40
  let score = 0
  
  // Calorie adherence (20 points max)
  const calorieAdherence = actual.calories / (targets.calories || 1)
  if (calorieAdherence >= 0.8 && calorieAdherence <= 1.2) {
    score += 20
  } else if (calorieAdherence >= 0.6 && calorieAdherence <= 1.4) {
    score += 15
  } else if (calorieAdherence >= 0.4) {
    score += 10
  }
  
  // Protein adherence (10 points max)
  const proteinAdherence = actual.protein / (targets.protein || 1)
  if (proteinAdherence >= 0.8) {
    score += 10
  } else if (proteinAdherence >= 0.6) {
    score += 7
  } else if (proteinAdherence >= 0.4) {
    score += 5
  }
  
  // Fiber adherence (10 points max)
  const fiberAdherence = actual.fiber / (targets.fiber || 1)
  if (fiberAdherence >= 0.8) {
    score += 10
  } else if (fiberAdherence >= 0.6) {
    score += 7
  } else if (fiberAdherence >= 0.4) {
    score += 5
  }
  
  return Math.min(maxNutritionScore, score)
}

function calculateHydrationScore(targets: any, actualHydration: number): number {
  const maxHydrationScore = 20
  const targetHydration = targets.hydration_ml || 2000
  const adherence = actualHydration / targetHydration
  
  if (adherence >= 1) {
    return maxHydrationScore
  } else if (adherence >= 0.8) {
    return maxHydrationScore * 0.8
  } else if (adherence >= 0.6) {
    return maxHydrationScore * 0.6
  } else if (adherence >= 0.4) {
    return maxHydrationScore * 0.4
  } else {
    return maxHydrationScore * adherence
  }
}

function calculateSupplementScore(targets: any, supplementLogs: any[]): number {
  const maxSupplementScore = 15
  const targetSupplements = targets.supplement_count || 0
  
  if (targetSupplements === 0) {
    return maxSupplementScore // Full score if no supplements needed
  }
  
  const actualSupplements = supplementLogs.length
  const adherence = actualSupplements / targetSupplements
  
  return Math.min(maxSupplementScore, adherence * maxSupplementScore)
}

function calculateBonusPoints(nutritionLogs: any[], hydrationLogs: any[], supplementLogs: any[]): number {
  let bonusScore = 0
  
  // Meal frequency bonus (25 points max)
  const mealCount = nutritionLogs.length
  if (mealCount >= 4) bonusScore += 25
  else if (mealCount >= 3) bonusScore += 20
  else if (mealCount >= 2) bonusScore += 15
  else if (mealCount >= 1) bonusScore += 10
  
  // Hydration frequency bonus (25 points max)
  if (hydrationLogs.length >= 8) bonusScore += 25
  else if (hydrationLogs.length >= 6) bonusScore += 20
  else if (hydrationLogs.length >= 4) bonusScore += 15
  else if (hydrationLogs.length >= 2) bonusScore += 10
  
  // Supplement adherence bonus (25 points)
  if (supplementLogs.length > 0) bonusScore += 25
  
  console.log(`Bonus: ${mealCount} meals, ${hydrationLogs.length} hydration, ${supplementLogs.length} supplements = ${bonusScore}/100`)
  
  return bonusScore
}
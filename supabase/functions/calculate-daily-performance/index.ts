import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DatabaseClient {
  from: (table: string) => any;
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
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Authenticate user
    const { user } = await getUser(req);
    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { targetDate } = await req.json()
    
    // Use authenticated user ID instead of trusting client
    const userId = user.id

    const supabaseClient: DatabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const date = targetDate || new Date().toISOString().split('T')[0]
    
    // Get daily targets
    const { data: targets } = await supabaseClient
      .from('daily_nutrition_targets')
      .select('*')
      .eq('user_id', userId)
      .eq('target_date', date)
      .single()

    if (!targets) {
      return new Response(JSON.stringify({ error: 'No targets found for this date' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Get actual consumption data for the day
    const startOfDay = `${date}T00:00:00.000Z`
    const endOfDay = `${date}T23:59:59.999Z`

    // Nutrition logs
    const { data: nutritionLogs } = await supabaseClient
      .from('nutrition_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay)

    // Hydration logs
    const { data: hydrationLogs } = await supabaseClient
      .from('hydration_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay)

    // Supplement logs
    const { data: supplementLogs } = await supabaseClient
      .from('supplement_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay)

    // Toxin detections (penalty)
    const { data: toxinDetections } = await supabaseClient
      .from('toxin_detections')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay)

    // Calculate performance
    const performance = calculatePerformance({
      targets,
      nutritionLogs: nutritionLogs || [],
      hydrationLogs: hydrationLogs || [],
      supplementLogs: supplementLogs || [],
      toxinDetections: toxinDetections || []
    })

    return new Response(JSON.stringify(performance), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error in calculate-daily-performance:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

function calculatePerformance({
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

  // Calculate scores
  let totalScore = 0
  
  // 1. Nutrition Adherence (70 points)
  const nutritionScore = calculateNutritionScore(targets, totalNutrition)
  totalScore += nutritionScore
  
  // 2. Hydration Adherence (20 points)
  const hydrationScore = calculateHydrationScore(targets, totalHydration)
  totalScore += hydrationScore
  
  // 3. Supplement Adherence (10 points)
  const supplementScore = calculateSupplementScore(targets, supplementLogs)
  totalScore += supplementScore
  
  // 4. Toxin Penalty (subtract points)
  const toxinPenalty = toxinDetections.length * 5 // 5 points penalty per toxin
  totalScore = Math.max(0, totalScore - toxinPenalty)
  
  // 5. Consistency bonus
  const consistencyScore = calculateConsistencyScore(nutritionLogs, hydrationLogs, supplementLogs)
  totalScore += consistencyScore

  return {
    totalScore: Math.min(100, totalScore),
    breakdown: {
      nutrition: nutritionScore,
      hydration: hydrationScore,
      supplements: supplementScore,
      consistency: consistencyScore,
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
  const maxNutritionScore = 70
  let score = 0
  
  // Calorie adherence (25 points)
  const calorieAdherence = Math.min(actual.calories / (targets.calories || 1), 1.2)
  const calorieScore = calorieAdherence <= 1 
    ? calorieAdherence * 25 
    : Math.max(0, 25 - (calorieAdherence - 1) * 50) // Penalty for overeating
  score += calorieScore
  
  // Protein adherence (15 points)
  const proteinAdherence = Math.min(actual.protein / (targets.protein || 1), 1)
  score += proteinAdherence * 15
  
  // Carb adherence (10 points)
  const carbAdherence = Math.min(actual.carbs / (targets.carbs || 1), 1.2)
  const carbScore = carbAdherence <= 1 
    ? carbAdherence * 10 
    : Math.max(0, 10 - (carbAdherence - 1) * 20)
  score += carbScore
  
  // Fat adherence (10 points)
  const fatAdherence = Math.min(actual.fat / (targets.fat || 1), 1.2)
  const fatScore = fatAdherence <= 1 
    ? fatAdherence * 10 
    : Math.max(0, 10 - (fatAdherence - 1) * 20)
  score += fatScore
  
  // Fiber bonus (10 points)
  const fiberAdherence = Math.min(actual.fiber / (targets.fiber || 1), 1)
  score += fiberAdherence * 10
  
  return Math.min(maxNutritionScore, score)
}

function calculateHydrationScore(targets: any, actualHydration: number): number {
  const maxHydrationScore = 20
  const targetHydration = targets.hydration_ml || 2000
  const adherence = Math.min(actualHydration / targetHydration, 1)
  return adherence * maxHydrationScore
}

function calculateSupplementScore(targets: any, supplementLogs: any[]): number {
  const maxSupplementScore = 10
  const targetSupplements = targets.supplement_count || 0
  
  if (targetSupplements === 0) return maxSupplementScore // Full score if no supplements needed
  
  const actualSupplements = supplementLogs.length
  const adherence = Math.min(actualSupplements / targetSupplements, 1)
  
  return adherence * maxSupplementScore
}

function calculateConsistencyScore(nutritionLogs: any[], hydrationLogs: any[], supplementLogs: any[]): number {
  const maxConsistencyScore = 10
  let consistencyPoints = 0
  
  // Points for logging meals (4 points)
  const mealCount = nutritionLogs.length
  if (mealCount >= 3) consistencyPoints += 4
  else if (mealCount >= 2) consistencyPoints += 2
  else if (mealCount >= 1) consistencyPoints += 1
  
  // Points for hydration logging (4 points)
  if (hydrationLogs.length >= 6) consistencyPoints += 4
  else if (hydrationLogs.length >= 4) consistencyPoints += 3
  else if (hydrationLogs.length >= 2) consistencyPoints += 2
  else if (hydrationLogs.length >= 1) consistencyPoints += 1
  
  // Points for supplement logging (2 points)
  if (supplementLogs.length > 0) consistencyPoints += 2
  
  return Math.min(maxConsistencyScore, consistencyPoints)
}
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DatabaseClient {
  from: (table: string) => any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { userId, targetDate } = await req.json()
    
    if (!userId) {
      return new Response(JSON.stringify({ error: 'User ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

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

    // Calculate performance score
    const performanceScore = calculateDailyPerformanceScore({
      targets,
      nutritionLogs: nutritionLogs || [],
      hydrationLogs: hydrationLogs || [],
      supplementLogs: supplementLogs || [],
      toxinDetections: toxinDetections || []
    })

    // Update the targets table with the calculated score
    const { error: updateError } = await supabaseClient
      .from('daily_nutrition_targets')
      .update({ daily_performance_score: performanceScore })
      .eq('user_id', userId)
      .eq('target_date', date)

    if (updateError) {
      console.error('Error updating performance score:', updateError)
      return new Response(JSON.stringify({ error: 'Failed to update performance score' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ 
      success: true, 
      performanceScore: performanceScore.toFixed(2),
      date 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error calculating daily performance:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

function calculateDailyPerformanceScore({
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
}): number {
  let totalScore = 0
  const maxScore = 100

  // 1. Nutrition Adherence (50 points total)
  const nutritionScore = calculateNutritionScore(targets, nutritionLogs)
  totalScore += nutritionScore

  // 2. Hydration Adherence (15 points)
  const hydrationScore = calculateHydrationScore(targets, hydrationLogs)
  totalScore += hydrationScore

  // 3. Supplement Adherence (10 points)
  const supplementScore = calculateSupplementScore(targets, supplementLogs)
  totalScore += supplementScore

  // 4. Meal Quality Bonus (15 points)
  const qualityScore = calculateMealQualityScore(nutritionLogs)
  totalScore += qualityScore

  // 5. Consistency Bonus (10 points) - based on logging frequency
  const consistencyScore = calculateConsistencyScore(nutritionLogs, hydrationLogs, supplementLogs)
  totalScore += consistencyScore

  // 6. Toxin Penalty (up to -10 points)
  const toxinPenalty = calculateToxinPenalty(toxinDetections)
  totalScore += toxinPenalty

  // Ensure score is between 0 and 100
  return Math.max(0, Math.min(maxScore, totalScore))
}

function calculateNutritionScore(targets: any, nutritionLogs: any[]): number {
  const maxNutritionScore = 50
  let score = 0

  // Calculate actual totals
  const actualTotals = nutritionLogs.reduce((acc, log) => ({
    calories: acc.calories + (log.calories || 0),
    protein: acc.protein + (log.protein || 0),
    carbs: acc.carbs + (log.carbs || 0),
    fat: acc.fat + (log.fat || 0),
    fiber: acc.fiber + (log.fiber || 0)
  }), { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 })

  // Score each macro (10 points each)
  const macros = ['calories', 'protein', 'carbs', 'fat', 'fiber']
  macros.forEach(macro => {
    const target = targets[macro]
    const actual = actualTotals[macro]
    
    if (target && target > 0) {
      const adherence = Math.min(actual / target, 2) // Cap at 200% to prevent over-eating rewards
      const macroScore = adherence <= 1 
        ? adherence * 10 // Perfect score at 100% adherence
        : Math.max(0, 10 - ((adherence - 1) * 5)) // Penalty for exceeding targets
      
      score += macroScore
    }
  })

  return Math.min(score, maxNutritionScore)
}

function calculateHydrationScore(targets: any, hydrationLogs: any[]): number {
  const maxHydrationScore = 15
  const targetHydration = targets.hydration_ml || 2000 // Default 2L
  
  const actualHydration = hydrationLogs.reduce((total, log) => total + (log.volume || 0), 0)
  const adherence = Math.min(actualHydration / targetHydration, 1.5) // Cap at 150%
  
  return adherence <= 1 
    ? adherence * maxHydrationScore
    : Math.max(0, maxHydrationScore - ((adherence - 1) * 10)) // Slight penalty for excessive hydration
}

function calculateSupplementScore(targets: any, supplementLogs: any[]): number {
  const maxSupplementScore = 10
  const targetSupplements = targets.supplement_count || 0
  
  if (targetSupplements === 0) return maxSupplementScore // Full score if no supplements needed
  
  const actualSupplements = supplementLogs.length
  const adherence = Math.min(actualSupplements / targetSupplements, 1)
  
  return adherence * maxSupplementScore
}

function calculateMealQualityScore(nutritionLogs: any[]): number {
  const maxQualityScore = 15
  
  if (nutritionLogs.length === 0) return 0
  
  // Calculate average quality score
  const logsWithQuality = nutritionLogs.filter(log => log.quality_score !== null)
  
  if (logsWithQuality.length === 0) return maxQualityScore * 0.5 // Neutral score if no quality data
  
  const avgQualityScore = logsWithQuality.reduce((sum, log) => sum + (log.quality_score || 0), 0) / logsWithQuality.length
  
  // Convert 0-100 quality score to 0-15 point scale
  return (avgQualityScore / 100) * maxQualityScore
}

function calculateConsistencyScore(nutritionLogs: any[], hydrationLogs: any[], supplementLogs: any[]): number {
  const maxConsistencyScore = 10
  let consistencyPoints = 0
  
  // Points for having meals logged (up to 6 points)
  const mealCount = nutritionLogs.length
  consistencyPoints += Math.min(mealCount * 2, 6) // 2 points per meal, max 6
  
  // Points for hydration logging (2 points)
  if (hydrationLogs.length > 0) consistencyPoints += 2
  
  // Points for supplement logging (2 points)
  if (supplementLogs.length > 0) consistencyPoints += 2
  
  return Math.min(consistencyPoints, maxConsistencyScore)
}

function calculateToxinPenalty(toxinDetections: any[]): number {
  const maxPenalty = -10
  
  if (toxinDetections.length === 0) return 0
  
  // -2 points per toxin detection, capped at -10
  const penalty = Math.max(toxinDetections.length * -2, maxPenalty)
  
  return penalty
}
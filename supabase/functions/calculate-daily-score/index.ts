import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { user_id, target_date } = await req.json()
    
    if (!user_id) {
      console.error('Missing user_id in request')
      return new Response(JSON.stringify({ error: 'user_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

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

    // Get date range for the day
    const startOfDay = `${dateToCalculate}T00:00:00.000Z`
    const endOfDay = `${dateToCalculate}T23:59:59.999Z`

    // Fetch all relevant data for the day
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

    // Calculate the daily performance score
    const performanceScore = calculateDailyPerformanceScore({
      targets: dailyTargets,
      nutritionLogs: nutritionLogs || [],
      hydrationLogs: hydrationLogs || [],
      supplementLogs: supplementLogs || [],
      toxinDetections: toxinDetections || []
    })

    console.log(`Calculated performance score: ${performanceScore}`)

    // Update the daily targets with the calculated score
    const { error: updateError } = await supabase
      .from('daily_nutrition_targets')
      .update({ 
        daily_performance_score: performanceScore,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user_id)
      .eq('target_date', dateToCalculate)

    if (updateError) {
      console.error('Error updating performance score:', updateError)
      return new Response(JSON.stringify({ error: 'Failed to update performance score' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`Successfully updated daily performance score for ${user_id} on ${dateToCalculate}`)

    return new Response(JSON.stringify({ 
      success: true,
      user_id,
      target_date: dateToCalculate,
      daily_performance_score: Number(performanceScore.toFixed(2)),
      breakdown: {
        nutrition_logs_count: nutritionLogs?.length || 0,
        hydration_logs_count: hydrationLogs?.length || 0,
        supplement_logs_count: supplementLogs?.length || 0,
        toxin_detections_count: toxinDetections?.length || 0
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error in calculate-daily-score function:', error)
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error.message
    }), {
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

  // 1. Nutrition Adherence (50 points total)
  const nutritionScore = calculateNutritionScore(targets, nutritionLogs)
  totalScore += nutritionScore
  console.log(`Nutrition score: ${nutritionScore}/50`)

  // 2. Hydration Adherence (15 points)
  const hydrationScore = calculateHydrationScore(targets, hydrationLogs)
  totalScore += hydrationScore
  console.log(`Hydration score: ${hydrationScore}/15`)

  // 3. Supplement Adherence (10 points)
  const supplementScore = calculateSupplementScore(targets, supplementLogs)
  totalScore += supplementScore
  console.log(`Supplement score: ${supplementScore}/10`)

  // 4. Meal Quality Bonus (15 points)
  const qualityScore = calculateMealQualityScore(nutritionLogs)
  totalScore += qualityScore
  console.log(`Quality score: ${qualityScore}/15`)

  // 5. Consistency Bonus (10 points) - based on logging frequency
  const consistencyScore = calculateConsistencyScore(nutritionLogs, hydrationLogs, supplementLogs)
  totalScore += consistencyScore
  console.log(`Consistency score: ${consistencyScore}/10`)

  // 6. Toxin Penalty (up to -10 points)
  const toxinPenalty = calculateToxinPenalty(toxinDetections)
  totalScore += toxinPenalty
  console.log(`Toxin penalty: ${toxinPenalty}`)

  // Ensure score is between 0 and 100
  const finalScore = Math.max(0, Math.min(100, totalScore))
  console.log(`Final score: ${finalScore}/100`)
  
  return finalScore
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
      console.log(`${macro}: ${actual}/${target} (${(adherence * 100).toFixed(1)}%) = ${macroScore.toFixed(1)} points`)
    }
  })

  return Math.min(score, maxNutritionScore)
}

function calculateHydrationScore(targets: any, hydrationLogs: any[]): number {
  const maxHydrationScore = 15
  const targetHydration = targets.hydration_ml || 2000 // Default 2L
  
  const actualHydration = hydrationLogs.reduce((total, log) => total + (log.volume || 0), 0)
  const adherence = Math.min(actualHydration / targetHydration, 1.5) // Cap at 150%
  
  const score = adherence <= 1 
    ? adherence * maxHydrationScore
    : Math.max(0, maxHydrationScore - ((adherence - 1) * 10)) // Slight penalty for excessive hydration

  console.log(`Hydration: ${actualHydration}ml/${targetHydration}ml (${(adherence * 100).toFixed(1)}%)`)
  return score
}

function calculateSupplementScore(targets: any, supplementLogs: any[]): number {
  const maxSupplementScore = 10
  const targetSupplements = targets.supplement_count || 0
  
  if (targetSupplements === 0) return maxSupplementScore // Full score if no supplements needed
  
  const actualSupplements = supplementLogs.length
  const adherence = Math.min(actualSupplements / targetSupplements, 1)
  
  console.log(`Supplements: ${actualSupplements}/${targetSupplements}`)
  return adherence * maxSupplementScore
}

function calculateMealQualityScore(nutritionLogs: any[]): number {
  const maxQualityScore = 15
  
  if (nutritionLogs.length === 0) return 0
  
  // Calculate average quality score
  const logsWithQuality = nutritionLogs.filter(log => log.quality_score !== null && log.quality_score !== undefined)
  
  if (logsWithQuality.length === 0) return maxQualityScore * 0.5 // Neutral score if no quality data
  
  const avgQualityScore = logsWithQuality.reduce((sum, log) => sum + (log.quality_score || 0), 0) / logsWithQuality.length
  
  console.log(`Average meal quality: ${avgQualityScore.toFixed(1)}/100`)
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
  
  console.log(`Consistency: ${mealCount} meals, ${hydrationLogs.length} hydration, ${supplementLogs.length} supplements`)
  return Math.min(consistencyPoints, maxConsistencyScore)
}

function calculateToxinPenalty(toxinDetections: any[]): number {
  const maxPenalty = -10
  
  if (toxinDetections.length === 0) return 0
  
  // -2 points per toxin detection, capped at -10
  const penalty = Math.max(toxinDetections.length * -2, maxPenalty)
  
  console.log(`Toxin detections: ${toxinDetections.length} (penalty: ${penalty})`)
  return penalty
}
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
  // 1. Nutrition Target Adherence (35%)
  const nutritionScore = calculateNutritionTargetScore(targets, nutritionLogs)
  console.log(`Nutrition target score: ${nutritionScore.toFixed(2)}/100`)

  // 2. Meal Quality (30%)
  const mealQualityAvg = calculateMealQualityAverage(nutritionLogs)
  console.log(`Meal quality average: ${mealQualityAvg.toFixed(2)}/100`)

  // 3. Ingredient Flags Avoided (10%)
  const ingredientPenalty = calculateIngredientFlagPenalty(nutritionLogs, targets)
  const ingredientScore = (1 - ingredientPenalty) * 100
  console.log(`Ingredient flags avoided: ${ingredientScore.toFixed(2)}/100`)

  // 4. Hydration Target Met (10%)
  const hydrationPercent = calculateHydrationPercentage(targets, hydrationLogs)
  console.log(`Hydration percentage: ${hydrationPercent.toFixed(2)}/100`)

  // 5. Micronutrients & Fiber (10%)
  const micronutrientScore = calculateMicronutrientScore(targets, nutritionLogs)
  console.log(`Micronutrient score: ${micronutrientScore.toFixed(2)}/100`)

  // 6. Bonus (Streaks, Consistency) (5%)
  const bonusPoints = calculateBonusPoints(nutritionLogs, hydrationLogs, supplementLogs)
  console.log(`Bonus points: ${bonusPoints.toFixed(2)}/100`)

  // Apply weighted formula
  const finalScore = (
    0.35 * nutritionScore +
    0.30 * mealQualityAvg +
    0.10 * ingredientScore +
    0.10 * hydrationPercent +
    0.10 * micronutrientScore +
    0.05 * bonusPoints
  )

  console.log(`Final weighted score: ${finalScore.toFixed(2)}/100`)
  
  // Ensure score is between 0 and 100
  return Math.max(0, Math.min(100, finalScore))
}

function calculateNutritionTargetScore(targets: any, nutritionLogs: any[]): number {
  if (nutritionLogs.length === 0) return 0

  // Calculate actual totals
  const actualTotals = nutritionLogs.reduce((acc, log) => ({
    calories: acc.calories + (log.calories || 0),
    protein: acc.protein + (log.protein || 0),
    carbs: acc.carbs + (log.carbs || 0),
    fat: acc.fat + (log.fat || 0)
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 })

  const macros = ['calories', 'protein', 'carbs', 'fat']
  let totalScore = 0
  let validMacros = 0

  macros.forEach(macro => {
    const target = targets[macro]
    const actual = actualTotals[macro]
    
    if (target && target > 0) {
      validMacros++
      const adherence = actual / target
      // Perfect score at 90-110% adherence, declining outside that range
      let macroScore = 0
      if (adherence >= 0.9 && adherence <= 1.1) {
        macroScore = 100 // Perfect adherence
      } else if (adherence >= 0.7 && adherence <= 1.3) {
        macroScore = 100 - Math.abs(adherence - 1) * 200 // Linear decline
      } else {
        macroScore = Math.max(0, 100 - Math.abs(adherence - 1) * 300) // Steeper decline
      }
      
      totalScore += macroScore
      console.log(`${macro}: ${actual}/${target} (${(adherence * 100).toFixed(1)}%) = ${macroScore.toFixed(1)}`)
    }
  })

  return validMacros > 0 ? totalScore / validMacros : 0
}

function calculateMealQualityAverage(nutritionLogs: any[]): number {
  if (nutritionLogs.length === 0) return 50 // Neutral score if no meals

  const logsWithQuality = nutritionLogs.filter(log => 
    log.quality_score !== null && log.quality_score !== undefined
  )

  if (logsWithQuality.length === 0) return 50 // Neutral score if no quality data

  const avgQualityScore = logsWithQuality.reduce((sum, log) => 
    sum + (log.quality_score || 0), 0
  ) / logsWithQuality.length

  console.log(`Meal quality: ${avgQualityScore.toFixed(1)}/100 (${logsWithQuality.length} meals)`)
  return avgQualityScore
}

function calculateIngredientFlagPenalty(nutritionLogs: any[], targets: any): number {
  if (nutritionLogs.length === 0) return 0

  const flaggedIngredients = targets.flagged_ingredients || []
  if (flaggedIngredients.length === 0) return 0

  let totalFlaggedCount = 0
  let totalIngredientAnalyses = 0

  nutritionLogs.forEach(log => {
    if (log.ingredient_analysis && Array.isArray(log.ingredient_analysis)) {
      totalIngredientAnalyses += log.ingredient_analysis.length
      
      log.ingredient_analysis.forEach((ingredient: any) => {
        if (flaggedIngredients.some((flagged: string) => 
          ingredient.name?.toLowerCase().includes(flagged.toLowerCase())
        )) {
          totalFlaggedCount++
        }
      })
    }
  })

  const penalty = totalIngredientAnalyses > 0 ? totalFlaggedCount / totalIngredientAnalyses : 0
  console.log(`Flagged ingredients: ${totalFlaggedCount}/${totalIngredientAnalyses} (penalty: ${(penalty * 100).toFixed(1)}%)`)
  return Math.min(penalty, 1) // Cap at 100% penalty
}

function calculateHydrationPercentage(targets: any, hydrationLogs: any[]): number {
  const targetHydration = targets.hydration_ml || 2000
  const actualHydration = hydrationLogs.reduce((total, log) => total + (log.volume || 0), 0)
  
  const percentage = Math.min((actualHydration / targetHydration) * 100, 100)
  console.log(`Hydration: ${actualHydration}ml/${targetHydration}ml (${percentage.toFixed(1)}%)`)
  return percentage
}

function calculateMicronutrientScore(targets: any, nutritionLogs: any[]): number {
  if (nutritionLogs.length === 0) return 0

  const priorityMicronutrients = targets.priority_micronutrients || []
  if (priorityMicronutrients.length === 0) return 100 // Full score if no specific priorities

  // Calculate fiber target achievement
  const targetFiber = targets.fiber || 25
  const actualFiber = nutritionLogs.reduce((sum, log) => sum + (log.fiber || 0), 0)
  const fiberScore = Math.min((actualFiber / targetFiber) * 100, 100)

  // For now, use fiber as proxy for micronutrient achievement
  // In future, could analyze ingredient_analysis for specific micronutrients
  console.log(`Fiber: ${actualFiber}g/${targetFiber}g (${fiberScore.toFixed(1)}%)`)
  return fiberScore
}

function calculateBonusPoints(nutritionLogs: any[], hydrationLogs: any[], supplementLogs: any[]): number {
  let bonusScore = 0

  // Consistency bonus (50 points max)
  const mealCount = nutritionLogs.length
  if (mealCount >= 3) bonusScore += 30 // Full day logging
  else if (mealCount >= 2) bonusScore += 20
  else if (mealCount >= 1) bonusScore += 10

  // Hydration logging bonus (25 points)
  if (hydrationLogs.length >= 3) bonusScore += 25
  else if (hydrationLogs.length >= 1) bonusScore += 15

  // Supplement adherence bonus (25 points)
  if (supplementLogs.length > 0) bonusScore += 25

  console.log(`Bonus: ${mealCount} meals, ${hydrationLogs.length} hydration, ${supplementLogs.length} supplements = ${bonusScore}/100`)
  return Math.min(bonusScore, 100)
}
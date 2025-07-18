import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NutritionLogData {
  id?: string
  food_name: string
  calories?: number
  protein?: number
  carbs?: number
  fat?: number
  fiber?: number
  sugar?: number
  sodium?: number
  serving_size?: string
  user_id?: string
}

interface QualityResult {
  quality_score: number
  quality_verdict: 'Excellent' | 'Good' | 'Moderate' | 'Poor'
  quality_reasons: string[]
  processing_level: 'whole' | 'minimally_processed' | 'processed' | 'ultra_processed'
  ingredient_analysis: any
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { nutrition_log_id, food_data } = await req.json()
    console.log('Evaluating meal quality for:', { nutrition_log_id, food_data })

    let nutritionData: NutritionLogData
    let userId: string

    // Get nutrition log data if ID provided, otherwise use raw food data
    if (nutrition_log_id) {
      const { data: logData, error: logError } = await supabase
        .from('nutrition_logs')
        .select('*')
        .eq('id', nutrition_log_id)
        .single()

      if (logError || !logData) {
        throw new Error(`Failed to fetch nutrition log: ${logError?.message}`)
      }

      nutritionData = logData
      userId = logData.user_id
    } else if (food_data) {
      nutritionData = food_data
      userId = food_data.user_id
    } else {
      throw new Error('Either nutrition_log_id or food_data must be provided')
    }

    // Get user's daily nutrition targets and health conditions
    const { data: dailyTargets, error: targetsError } = await supabase
      .from('daily_nutrition_targets')
      .select('*')
      .eq('user_id', userId)
      .eq('target_date', new Date().toISOString().split('T')[0])
      .single()

    // Get user profile for health conditions
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('health_conditions')
      .eq('user_id', userId)
      .single()

    const healthConditions = userProfile?.health_conditions || []
    const flaggedIngredients = dailyTargets?.flagged_ingredients || []

    console.log('User health conditions:', healthConditions)
    console.log('Flagged ingredients:', flaggedIngredients)

    // Calculate quality score
    const qualityResult = calculateMealQuality(nutritionData, healthConditions, flaggedIngredients)

    // Update nutrition log with quality data if we have an ID
    if (nutrition_log_id) {
      const { error: updateError } = await supabase
        .from('nutrition_logs')
        .update({
          quality_score: qualityResult.quality_score,
          quality_verdict: qualityResult.quality_verdict,
          quality_reasons: qualityResult.quality_reasons,
          processing_level: qualityResult.processing_level,
          ingredient_analysis: qualityResult.ingredient_analysis
        })
        .eq('id', nutrition_log_id)

      if (updateError) {
        console.error('Failed to update nutrition log:', updateError)
      } else {
        console.log('Successfully updated nutrition log with quality data')
      }
    }

    return new Response(
      JSON.stringify(qualityResult),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error in evaluate-meal-quality:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})

function calculateMealQuality(
  nutritionData: NutritionLogData, 
  healthConditions: string[], 
  flaggedIngredients: string[]
): QualityResult {
  const foodName = nutritionData.food_name.toLowerCase()
  const calories = nutritionData.calories || 0
  const protein = nutritionData.protein || 0
  const carbs = nutritionData.carbs || 0
  const fat = nutritionData.fat || 0
  const fiber = nutritionData.fiber || 0
  const sugar = nutritionData.sugar || 0
  const sodium = nutritionData.sodium || 0

  let totalScore = 0
  const reasons: string[] = []
  const ingredientAnalysis: any = {
    flagged_count: 0,
    nutrient_density: 'unknown',
    processing_indicators: []
  }

  // 1. NUTRIENT DENSITY (35% weight)
  let nutrientScore = 0
  
  // Protein density (protein per 100 calories)
  const proteinDensity = calories > 0 ? (protein * 100) / calories : 0
  if (proteinDensity > 15) {
    nutrientScore += 25
    reasons.push('High protein density')
  } else if (proteinDensity > 10) {
    nutrientScore += 15
  } else if (proteinDensity < 5) {
    reasons.push('Low protein content')
  }

  // Fiber content
  if (fiber > 5) {
    nutrientScore += 20
    reasons.push('High fiber content')
  } else if (fiber > 2) {
    nutrientScore += 10
  } else if (fiber < 1) {
    reasons.push('Low fiber content')
  }

  // Micronutrient indicators (whole foods typically have better profiles)
  if (isWholeFood(foodName)) {
    nutrientScore += 20
    reasons.push('Whole food with natural nutrients')
    ingredientAnalysis.nutrient_density = 'high'
  } else if (isMinimallyProcessed(foodName)) {
    nutrientScore += 10
    ingredientAnalysis.nutrient_density = 'moderate'
  } else {
    ingredientAnalysis.nutrient_density = 'low'
  }

  // Sugar to fiber ratio
  const sugarFiberRatio = fiber > 0 ? sugar / fiber : sugar
  if (sugarFiberRatio > 5) {
    nutrientScore -= 10
    reasons.push('High sugar to fiber ratio')
  }

  totalScore += (nutrientScore / 65) * 35 // 35% weight

  // 2. PROCESSING LEVEL (25% weight)
  let processingScore = 0
  let processingLevel: 'whole' | 'minimally_processed' | 'processed' | 'ultra_processed'

  if (isWholeFood(foodName)) {
    processingScore = 100
    processingLevel = 'whole'
    reasons.push('Whole, unprocessed food')
  } else if (isMinimallyProcessed(foodName)) {
    processingScore = 75
    processingLevel = 'minimally_processed'
    reasons.push('Minimally processed food')
  } else if (isProcessed(foodName)) {
    processingScore = 50
    processingLevel = 'processed'
    reasons.push('Processed food with multiple ingredients')
    ingredientAnalysis.processing_indicators.push('multiple_ingredients')
  } else {
    processingScore = 25
    processingLevel = 'ultra_processed'
    reasons.push('Ultra-processed food')
    ingredientAnalysis.processing_indicators.push('ultra_processed', 'artificial_additives')
  }

  totalScore += (processingScore / 100) * 25 // 25% weight

  // 3. FLAGGED INGREDIENTS (20% weight)
  let flaggedScore = 100
  const detectedFlags: string[] = []

  // Check for common problematic ingredients
  const problematicIngredients = [
    'high fructose corn syrup', 'corn syrup', 'artificial sweetener',
    'trans fat', 'hydrogenated oil', 'msg', 'sodium benzoate',
    'carrageenan', 'artificial color', 'preservative'
  ]

  problematicIngredients.forEach(ingredient => {
    if (foodName.includes(ingredient) || flaggedIngredients.includes(ingredient)) {
      flaggedScore -= 15
      detectedFlags.push(ingredient)
      reasons.push(`Contains ${ingredient}`)
    }
  })

  // High sodium check
  if (sodium > 600) {
    flaggedScore -= 20
    detectedFlags.push('high_sodium')
    reasons.push('High sodium content')
  } else if (sodium > 400) {
    flaggedScore -= 10
    reasons.push('Moderate sodium content')
  }

  // High sugar check
  if (sugar > 15) {
    flaggedScore -= 15
    detectedFlags.push('high_sugar')
    reasons.push('High sugar content')
  }

  ingredientAnalysis.flagged_count = detectedFlags.length
  ingredientAnalysis.flagged_ingredients = detectedFlags

  totalScore += Math.max(0, flaggedScore / 100) * 20 // 20% weight

  // 4. HEALTH ALIGNMENT (20% weight)
  let healthScore = 100

  healthConditions.forEach(condition => {
    switch (condition.toLowerCase()) {
      case 'diabetes':
      case 'type 2 diabetes':
        if (sugar > 10 || carbs > 45) {
          healthScore -= 20
          reasons.push('High sugar/carbs - not ideal for diabetes')
        }
        break
      
      case 'hypertension':
      case 'high blood pressure':
        if (sodium > 400) {
          healthScore -= 15
          reasons.push('High sodium - not ideal for hypertension')
        }
        break
      
      case 'heart disease':
      case 'cardiovascular disease':
        if (fat > 15 || detectedFlags.includes('trans fat')) {
          healthScore -= 10
          reasons.push('High saturated/trans fats - not ideal for heart health')
        }
        break
      
      case 'inflammation':
      case 'inflammatory conditions':
        if (detectedFlags.some(flag => ['artificial_sweetener', 'preservative'].includes(flag))) {
          healthScore -= 12
          reasons.push('Contains inflammatory ingredients')
        }
        break
      
      case 'digestive issues':
      case 'ibs':
        if (detectedFlags.includes('carrageenan') || sugar > 20) {
          healthScore -= 10
          reasons.push('Contains ingredients that may irritate digestion')
        }
        break
    }
  })

  totalScore += Math.max(0, healthScore / 100) * 20 // 20% weight

  // Determine verdict
  let verdict: 'Excellent' | 'Good' | 'Moderate' | 'Poor'
  if (totalScore >= 85) {
    verdict = 'Excellent'
  } else if (totalScore >= 70) {
    verdict = 'Good'
  } else if (totalScore >= 50) {
    verdict = 'Moderate'
  } else {
    verdict = 'Poor'
  }

  // Add positive reasons for high scores
  if (totalScore >= 85) {
    reasons.unshift('Excellent nutritional profile')
  } else if (totalScore >= 70) {
    reasons.unshift('Good nutritional choice')
  }

  return {
    quality_score: Math.round(totalScore),
    quality_verdict: verdict,
    quality_reasons: reasons.slice(0, 8), // Limit to 8 most important reasons
    processing_level: processingLevel,
    ingredient_analysis: ingredientAnalysis
  }
}

function isWholeFood(foodName: string): boolean {
  const wholeFood Keywords = [
    'apple', 'banana', 'orange', 'berries', 'spinach', 'broccoli', 'carrot',
    'chicken breast', 'salmon', 'tuna', 'eggs', 'almonds', 'walnuts',
    'quinoa', 'brown rice', 'oats', 'sweet potato', 'avocado'
  ]
  
  return wholeFoodKeywords.some(keyword => foodName.includes(keyword)) &&
         !foodName.includes('processed') && !foodName.includes('packaged')
}

function isMinimallyProcessed(foodName: string): boolean {
  const minimallyProcessedKeywords = [
    'plain yogurt', 'milk', 'cheese', 'whole grain bread', 'pasta',
    'canned beans', 'frozen vegetables', 'olive oil', 'coconut oil'
  ]
  
  return minimallyProcessedKeywords.some(keyword => foodName.includes(keyword))
}

function isProcessed(foodName: string): boolean {
  const processedKeywords = [
    'sauce', 'dressing', 'crackers', 'cereal', 'granola bar',
    'canned soup', 'frozen meal', 'processed meat'
  ]
  
  return processedKeywords.some(keyword => foodName.includes(keyword))
}
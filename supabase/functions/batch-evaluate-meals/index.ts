import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NutritionLogData {
  id: string
  food_name: string
  calories?: number
  protein?: number
  carbs?: number
  fat?: number
  fiber?: number
  sugar?: number
  sodium?: number
  user_id?: string
  quality_score?: number
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

    const { limit = 1000, offset = 0 } = await req.json().catch(() => ({}))
    
    console.log(`Starting batch meal quality evaluation for ${limit} records, offset: ${offset}`)

    // Get nutrition logs that don't have quality scores yet
    const { data: nutritionLogs, error: fetchError } = await supabase
      .from('nutrition_logs')
      .select('id, food_name, calories, protein, carbs, fat, fiber, sugar, sodium, user_id, quality_score')
      .is('quality_score', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (fetchError) {
      console.error('Error fetching nutrition logs:', fetchError)
      throw new Error(`Failed to fetch nutrition logs: ${fetchError.message}`)
    }

    if (!nutritionLogs || nutritionLogs.length === 0) {
      console.log('No nutrition logs found without quality scores')
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No nutrition logs found that need quality evaluation',
          processed: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Found ${nutritionLogs.length} nutrition logs to process`)

    // Process logs in smaller batches to avoid timeouts
    const batchSize = 50
    let processed = 0
    let errors = 0
    const results = []

    // Define the background task for processing
    async function processBatch() {
      for (let i = 0; i < nutritionLogs.length; i += batchSize) {
        const batch = nutritionLogs.slice(i, i + batchSize)
        console.log(`Processing batch ${Math.floor(i / batchSize) + 1}, records ${i + 1}-${Math.min(i + batchSize, nutritionLogs.length)}`)

        for (const log of batch) {
          try {
            // Calculate quality for this log
            const qualityResult = await evaluateMealQuality(log, supabase)
            
            // Update the nutrition log with quality data
            const { error: updateError } = await supabase
              .from('nutrition_logs')
              .update({
                quality_score: qualityResult.quality_score,
                quality_verdict: qualityResult.quality_verdict,
                quality_reasons: qualityResult.quality_reasons,
                processing_level: qualityResult.processing_level,
                ingredient_analysis: qualityResult.ingredient_analysis
              })
              .eq('id', log.id)

            if (updateError) {
              console.error(`Error updating nutrition log ${log.id}:`, updateError)
              errors++
            } else {
              processed++
              results.push({
                id: log.id,
                food_name: log.food_name,
                quality_score: qualityResult.quality_score,
                quality_verdict: qualityResult.quality_verdict
              })
            }
          } catch (error) {
            console.error(`Error processing nutrition log ${log.id}:`, error)
            errors++
          }
        }

        // Small delay between batches to avoid overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      console.log(`Batch processing completed. Processed: ${processed}, Errors: ${errors}`)
    }

    // Start background processing
    EdgeRuntime.waitUntil(processBatch())

    // Return immediate response
    return new Response(
      JSON.stringify({
        success: true,
        message: `Started batch evaluation of ${nutritionLogs.length} nutrition logs`,
        total_logs: nutritionLogs.length,
        batch_size: batchSize,
        estimated_batches: Math.ceil(nutritionLogs.length / batchSize)
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error in batch-evaluate-meals:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})

// Meal quality evaluation logic (same as the main function)
async function evaluateMealQuality(nutritionData: NutritionLogData, supabase: any) {
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

  // Get user's health conditions if available
  let healthConditions: string[] = []
  if (nutritionData.user_id) {
    try {
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('health_conditions')
        .eq('user_id', nutritionData.user_id)
        .single()
      
      healthConditions = userProfile?.health_conditions || []
    } catch (error) {
      console.log('Could not fetch user health conditions:', error)
    }
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
    if (foodName.includes(ingredient)) {
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
  const wholeFoodKeywords = [
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
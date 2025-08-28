import { supabase } from '@/integrations/supabase/client';
import { HealthAnalysisResult } from '@/components/health-check/HealthCheckModal';

/**
 * Maps HealthAnalysisResult to nutrition_logs table format
 */
export function mapHealthScanToNutritionLog(
  result: HealthAnalysisResult,
  source: string = 'photo',
  imageUrl?: string,
  barcode?: string
) {
  // Extract name using the fixed extractName logic
  const food_name = result.productName || result.title || result.itemName;
  
  // Map nutrition data with defaults
  const nutrition = result.nutritionData || {};
  const calories = Math.round(nutrition.calories || 0);
  const protein = Number(nutrition.protein || 0);
  const carbs = Number(nutrition.carbs || 0);
  const fat = Number(nutrition.fat || 0);
  const fiber = Number(nutrition.fiber || 0);
  const sugar = Number(nutrition.sugar || 0);
  const sodium = Number(nutrition.sodium || 0);
  const saturated_fat = 0; // Not available in HealthAnalysisResult interface

  // Map quality data
  const quality_score = Math.round((result.healthScore || 0) * 10); // Convert 0-10 to 0-100
  const quality_verdict = result.overallRating || 'unknown';
  const quality_reasons = result.ingredientFlags?.map(flag => `${flag.ingredient}: ${flag.flag}`) || [];

  // Map processing and ingredient data
  const ingredient_analysis = {
    flags: result.ingredientFlags || [],
    allergens: result.healthProfile?.allergens || [],
    preservatives: result.healthProfile?.preservatives || [],
    additives: result.healthProfile?.additives || [],
    isOrganic: result.healthProfile?.isOrganic || false,
    isGMO: result.healthProfile?.isGMO || false
  };

  // Determine processing level based on ingredients and flags
  const processing_level = quality_score >= 80 ? 'minimal' : 
                          quality_score >= 40 ? 'moderate' : 'ultra-processed';

  // Confidence based on data completeness
  const confidence = (nutrition.calories && result.ingredientsText) ? 0.9 : 
                    (nutrition.calories || result.ingredientsText) ? 0.7 : 0.5;

  return {
    food_name,
    calories,
    protein,
    carbs,
    fat,
    fiber,
    sugar,
    sodium,
    saturated_fat,
    quality_score,
    quality_verdict,
    quality_reasons,
    serving_size: null, // Could be extracted from nutrition data if available
    source,
    image_url: imageUrl || null,
    processing_level,
    ingredient_analysis,
    confidence,
    barcode: barcode || null,
    brand: null // Could be extracted from product data if available
  };
}

/**
 * Saves health scan result to nutrition_logs table
 */
export async function saveHealthScanToNutritionLogs(
  result: HealthAnalysisResult,
  source: string = 'photo',
  imageUrl?: string,
  barcode?: string
): Promise<{ success: boolean; error?: string; id?: string }> {
  try {
    console.log('[NUTRITION_LOG] Saving health scan result:', { 
      itemName: result.itemName,
      source,
      hasImage: !!imageUrl,
      hasBarcode: !!barcode
    });

    const nutritionData = mapHealthScanToNutritionLog(result, source, imageUrl, barcode);
    
    // Note: user_id will be auto-filled by the trigger we created, but TypeScript requires it
    // Cast to any to bypass the type requirement since our trigger handles user_id
    const { data, error } = await supabase
      .from('nutrition_logs')
      .insert(nutritionData as any)
      .select('id')
      .single();

    if (error) {
      console.error('❌ Failed to save to nutrition_logs:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to save health scan result'
      };
    }

    console.log('✅ Health scan saved to nutrition_logs:', data?.id);
    return { success: true, id: data?.id };

  } catch (error) {
    console.error('❌ Exception saving to nutrition_logs:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}
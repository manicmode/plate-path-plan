// eslint-disable-next-line: no-cross-pipeline-imports
/**
 * Isolated Manual Pipeline
 * Snapshot of current working implementation
 */

import { supabase } from '@/integrations/supabase/client';

export type PipelineResult = { ok: true, report: any } | { ok: false, reason: string };

export async function analyzeManual(input: { query: string }): Promise<PipelineResult> {
  // Input validation
  if (!input?.query || typeof input.query !== 'string') {
    return { ok: false, reason: 'invalid_input' };
  }

  const trimmedQuery = input.query.trim();
  
  try {
    console.log('📝 Processing manual text input:', trimmedQuery);
    
    // Use the current working GPT analyzer implementation
    const { data, error } = await supabase.functions.invoke('gpt-smart-food-analyzer', {
      body: {
        text: trimmedQuery,
        taskType: 'food_analysis',
        complexity: 'auto'
      }
    });

    if (error) {
      console.error('[MANUAL][ERROR]', error);
      return { ok: false, reason: 'analysis_error' };
    }

    console.log('✅ GPT analyzer response:', data);
    
    if (!data.foods || data.foods.length === 0 || data.total_confidence < 0.3) {
      console.log('⚠️ GPT analysis returned low confidence or no foods');
      return { ok: false, reason: 'low_confidence' };
    }

    // Transform GPT response to report format (matching current implementation)
    const primaryFood = data.foods[0];
    const itemName = primaryFood.name || trimmedQuery;
    
    // Calculate health score using centralized scoring system
    const { scoreFood } = await import('@/health/scoring');
    
    const healthScore = scoreFood({
      name: itemName,
      source: 'manual',
      nutrients: {
        calories: primaryFood.calories,
        protein_g: primaryFood.protein,
        carbs_g: primaryFood.carbs,
        fat_g: primaryFood.fat,
        fiber_g: primaryFood.fiber,
        sugars_g: primaryFood.sugar,
        sodium_mg: primaryFood.sodium,
      }
    });

    const report = {
      itemName,
      productName: itemName,
      title: itemName,
      healthScore,
      ingredientsText: undefined, // GPT analyzer doesn't provide ingredients
      ingredientFlags: [],
      nutritionData: {
        calories: primaryFood.calories,
        protein: primaryFood.protein,
        carbs: primaryFood.carbs,
        fat: primaryFood.fat,
        fiber: primaryFood.fiber,
        sugar: primaryFood.sugar,
        sodium: primaryFood.sodium,
      },
      healthProfile: {
        isOrganic: false,
        isGMO: false,
        allergens: [],
        preservatives: [],
        additives: []
      },
      personalizedWarnings: [],
      suggestions: data.processing_notes ? [data.processing_notes] : [],
      overallRating: healthScore >= 8 ? 'excellent' : 
                    healthScore >= 6 ? 'good' : 
                    healthScore >= 4 ? 'fair' : 
                    healthScore >= 2 ? 'poor' : 'avoid',
      source: 'manual_entry'
    };
    
    return { ok: true, report };
  } catch (error) {
    console.error('[MANUAL][EXCEPTION]', error);
    return { ok: false, reason: 'network_error' };
  }
}

export async function __smokeTest(): Promise<'ok' | 'fail'> {
  try {
    // Test with a simple food item
    const result = await analyzeManual({ query: 'apple' });
    // Should return { ok: true, report: {...} } for basic foods
    return result.ok ? 'ok' : 'fail';
  } catch {
    return 'fail';
  }
}
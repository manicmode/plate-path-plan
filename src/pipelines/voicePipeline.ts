// eslint-disable-next-line: no-cross-pipeline-imports
/**
 * Isolated Voice Pipeline
 * Snapshot of current working implementation
 */

import { supabase } from '@/integrations/supabase/client';

export type PipelineResult = { ok: true, report: any } | { ok: false, reason: string };

export async function analyzeVoice(input: { transcript: string }): Promise<PipelineResult> {
  // Input validation
  if (!input?.transcript || typeof input.transcript !== 'string') {
    return { ok: false, reason: 'invalid_input' };
  }

  const trimmedTranscript = input.transcript.trim();
  
  try {
    console.log('🎤 Processing voice transcript:', trimmedTranscript);
    
    // Voice analysis uses the same GPT analyzer as manual text entry
    // This matches the current implementation where both voice and manual use gpt-smart-food-analyzer
    const { data, error } = await supabase.functions.invoke('gpt-smart-food-analyzer', {
      body: {
        text: trimmedTranscript,
        taskType: 'food_analysis',
        complexity: 'auto'
      }
    });

    if (error) {
      console.error('[VOICE][ERROR]', error);
      return { ok: false, reason: 'analysis_error' };
    }

    console.log('✅ Voice GPT analyzer response:', data);
    
    if (!data.foods || data.foods.length === 0 || data.total_confidence < 0.3) {
      console.log('⚠️ Voice analysis returned low confidence or no foods');
      return { ok: false, reason: 'low_confidence' };
    }

    // Transform response (same logic as manual pipeline)
    const primaryFood = data.foods[0];
    const itemName = primaryFood.name || trimmedTranscript;
    
    // Health scoring (same as manual)
    const calories = primaryFood.calories || 0;
    const protein = primaryFood.protein || 0;
    const fiber = primaryFood.fiber || 0;
    const sugar = primaryFood.sugar || 0;
    const sodium = primaryFood.sodium || 0;
    
    let healthScore = 5;
    if (fiber > 3) healthScore += 1;
    if (protein > 10) healthScore += 1;
    if (sugar > 15) healthScore -= 1;
    if (sodium > 400) healthScore -= 1;
    if (calories > 300) healthScore -= 0.5;
    healthScore = Math.max(1, Math.min(10, healthScore));

    const report = {
      itemName,
      productName: itemName,
      title: itemName,
      healthScore,
      ingredientsText: undefined,
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
      source: 'voice_input'
    };
    
    return { ok: true, report };
  } catch (error) {
    console.error('[VOICE][EXCEPTION]', error);
    return { ok: false, reason: 'network_error' };
  }
}

export async function __smokeTest(): Promise<'ok' | 'fail'> {
  try {
    // Test with a simple voice transcript
    const result = await analyzeVoice({ transcript: 'I had a banana for breakfast' });
    // Should return { ok: true, report: {...} } for basic food mentions
    return result.ok ? 'ok' : 'fail';
  } catch {
    return 'fail';
  }
}
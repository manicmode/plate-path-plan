/**
 * Shared Free-Text Parser
 * Extracted from Manual/Voice pipelines for consistent text analysis across all input modes
 * Extended with serving size extraction for V2 portion detection
 */

import { supabase } from '@/integrations/supabase/client';
import { parsePortionGrams, type PortionInfo } from '@/lib/nutrition/portionCalculator';

export type ParseResult = { ok: true, report: any } | { ok: false, reason: string };

/**
 * Extract serving size information from text using regex patterns
 */
export function extractServingSizeFromText(text: string): PortionInfo | null {
  if (!text || typeof text !== 'string') return null;
  
  const normalizedText = text.toLowerCase().trim();
  
  // Look for serving size declarations
  const servingSizePatterns = [
    /serving\s+size[:\s]+([^.\n]+)/i,
    /per\s+portion[:\s]+([^.\n]+)/i,
    /portion\s+size[:\s]+([^.\n]+)/i,
    /serv\s+size[:\s]+([^.\n]+)/i,
    /(?:^|\n)serving[:\s]+([^.\n]+)/i
  ];
  
  for (const pattern of servingSizePatterns) {
    const match = normalizedText.match(pattern);
    if (match) {
      const servingText = match[1].trim();
      
      // Extract grams from serving text
      const gramMatch = servingText.match(/(\d+(?:\.\d+)?)\s*g(?:rams?)?/);
      if (gramMatch) {
        const grams = parseFloat(gramMatch[1]);
        if (grams > 0 && grams <= 1000) { // Reasonable bounds
          return {
            grams: Math.round(grams),
            isEstimated: false,
            source: 'ocr_declared'
          };
        }
      }
      
      // Extract other units and convert
      const mlMatch = servingText.match(/(\d+(?:\.\d+)?)\s*ml/);
      if (mlMatch) {
        const ml = parseFloat(mlMatch[1]);
        // Assume liquid density ~1.0 for most beverages
        return {
          grams: Math.round(ml),
          isEstimated: false,
          source: 'ocr_declared'
        };
      }
      
      // Extract pieces/units
      const pieceMatch = servingText.match(/(\d+)\s*(?:piece|item|unit|cookie|cracker|bar)s?/);
      if (pieceMatch) {
        const pieces = parseInt(pieceMatch[1]);
        // Estimate based on typical piece sizes
        const estimatedGrams = pieces * 25; // 25g per piece average
        return {
          grams: Math.round(estimatedGrams),
          isEstimated: true,
          source: 'ocr_declared'
        };
      }
    }
  }
  
  return null;
}

/**
 * Parse free text using the same GPT analyzer as Manual/Voice pipelines
 * This ensures consistent scoring and analysis across all text-based inputs
 */
export async function parseFreeTextToReport(text: string): Promise<ParseResult> {
  // Input validation
  if (!text || typeof text !== 'string') {
    return { ok: false, reason: 'invalid_input' };
  }

  const trimmedText = text.trim();
  if (trimmedText.length === 0) {
    return { ok: false, reason: 'empty_input' };
  }
  
  try {
    console.log('[FREE_TEXT_PARSER] Processing text input:', trimmedText.substring(0, 100) + '...');
    
    // Use the same GPT analyzer implementation as Manual/Voice pipelines
    const { data, error } = await supabase.functions.invoke('gpt-smart-food-analyzer', {
      body: {
        text: trimmedText,
        taskType: 'food_analysis',
        complexity: 'auto'
      }
    });

    if (error) {
      console.error('[FREE_TEXT_PARSER][ERROR]', error);
      return { ok: false, reason: 'analysis_error' };
    }

    console.log('[FREE_TEXT_PARSER] GPT analyzer response:', data);
    
    if (!data.foods || data.foods.length === 0 || data.total_confidence < 0.3) {
      console.log('[FREE_TEXT_PARSER] Low confidence or no foods detected');
      return { ok: false, reason: 'low_confidence' };
    }

    // Transform GPT response to report format (matching Manual/Voice implementation)
    const primaryFood = data.foods[0];
    const itemName = primaryFood.name || trimmedText.split(' ').slice(0, 4).join(' ');
    
    // Extract serving size from original text
    const servingSizeInfo = extractServingSizeFromText(trimmedText);
    
    // Convert nutrition to health score (same heuristic as Manual/Voice)
    const calories = primaryFood.calories || 0;
    const protein = primaryFood.protein || 0;
    const fiber = primaryFood.fiber || 0;
    const sugar = primaryFood.sugar || 0;
    const sodium = primaryFood.sodium || 0;
    
    let healthScore = 5; // Start neutral
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
      ingredientsText: undefined, // GPT analyzer doesn't provide raw ingredients
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
      source: 'free_text_parser', // Will be overridden by calling function
      // Include portion info if detected
      servingSizeInfo
    };
    
    return { ok: true, report };
  } catch (error) {
    console.error('[FREE_TEXT_PARSER][EXCEPTION]', error);
    return { ok: false, reason: 'network_error' };
  }
}
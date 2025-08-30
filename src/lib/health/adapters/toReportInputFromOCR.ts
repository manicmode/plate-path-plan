/**
 * OCR Text to Health Report Input Adapter
 * 
 * Reuses the same free-text parsing path used by Manual/Voice flows
 * to ensure consistent health report generation across all text inputs.
 */

import { parseFreeTextToReport } from '@/lib/health/freeTextParser';
import { shouldReturnInconclusive, type InconclusiveResult } from './inconclusiveAnalyzer';

export type OCRReportResult = { ok: true, report: any } | { ok: false, reason: string } | InconclusiveResult;

export interface OCRHealthInput {
  name: string;
  ingredientsText?: string;
  nutrition?: {
    calories?: number;
    protein_g?: number;
    carbs_g?: number;
    fat_g?: number;
    sugar_g?: number;
    fiber_g?: number;
    sodium_mg?: number;
  };
}

/**
 * Robust OCR pre-cleaning
 * Normalizes OCR text before feeding to shared parser
 */
function precleanOCR(text: string): string {
  if (!text || text.trim().length < 5) {
    return '';
  }

  let cleaned = text
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim()
    // Replace bullet points with commas for ingredient lists
    .replace(/[•·•]/g, ',')
    // Fix common OCR character mistakes (conservative)
    .replace(/\bln\b/gi, 'In') // "ln" -> "In" for ingredients
    .replace(/\b0(?=\D)/g, 'O') // "0" -> "O" when followed by letter
    .replace(/\bO(?=\d)/g, '0'); // "O" -> "0" when followed by digit

  // Extract ingredients section if present, truncate at marketing text
  const ingredientsMatch = cleaned.match(/ingredients?:([^.]*?)(?:contains:|allergen|warnings?|distributed|$)/i);
  if (ingredientsMatch) {
    const beforeIngredients = cleaned.substring(0, cleaned.indexOf(ingredientsMatch[0]));
    const ingredientsPart = ingredientsMatch[0];
    const afterIngredients = cleaned.substring(cleaned.indexOf(ingredientsMatch[0]) + ingredientsMatch[0].length);
    
    // Keep product name + ingredients + nutrition facts, truncate marketing
    cleaned = (beforeIngredients + ingredientsPart + afterIngredients.substring(0, 200)).trim();
  }

  return cleaned;
}

/**
 * Convert OCR text to health report using the same pipeline as Manual/Voice
 * Returns the complete report (not just input) for consistency
 */
export async function toReportFromOCR(ocrText: string): Promise<OCRReportResult> {
  // Pre-clean the OCR text
  const cleaned = precleanOCR(ocrText);
  
  // Check for inconclusive cases early
  const inconclusiveCheck = shouldReturnInconclusive(cleaned);
  if (inconclusiveCheck) {
    return inconclusiveCheck;
  }

  try {
    // Use the same free-text parser as Manual/Voice
    const result = await parseFreeTextToReport(cleaned);
    
    if (!result.ok) {
      // Check if this should be inconclusive instead of error
      const inconclusiveFromParser = shouldReturnInconclusive(cleaned, result);
      if (inconclusiveFromParser) {
        return inconclusiveFromParser;
      }
      
      // Type-safe access to reason property
      return { ok: false, reason: (result as { ok: false, reason: string }).reason };
    }

    // Add OCR-specific source tag
    const report = {
      ...result.report,
      source: 'OCR'
    };

    return { ok: true, report };
  } catch (error) {
    console.error('[OCR][ADAPTER][ERROR]', error);
    return { ok: false, reason: 'analysis_error' };
  }
}

/**
 * Legacy adapter for backward compatibility with existing barcode pipeline
 * Converts OCR text to the input shape expected by barcode analyzer
 * @deprecated Use toReportFromOCR for new implementations
 */
export function toReportInputFromOCR(ocrText: string): OCRHealthInput {
  // Basic parsing - extract product name, ingredients, and nutrition facts
  const lines = ocrText.split('\n').map(line => line.trim()).filter(Boolean);
  
  let productName = 'Unknown Product';
  let ingredientsText = '';
  const nutrition: any = {};
  
  // Simple heuristics to extract information
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase();
    
    // Try to find product name (usually first significant line)
    if (i === 0 && lines[0].length > 2) {
      productName = lines[0];
    }
    
    // Look for ingredients section
    if (line.includes('ingredient') && i + 1 < lines.length) {
      ingredientsText = lines[i + 1];
    }
    
    // Extract nutrition facts with common patterns
    if (line.includes('calorie') || line.includes('kcal')) {
      const match = line.match(/(\d+(?:\.\d+)?)/);
      if (match) nutrition.calories = parseFloat(match[1]);
    }
    
    if (line.includes('protein')) {
      const match = line.match(/(\d+(?:\.\d+)?)/);
      if (match) nutrition.protein_g = parseFloat(match[1]);
    }
    
    if (line.includes('carb')) {
      const match = line.match(/(\d+(?:\.\d+)?)/);
      if (match) nutrition.carbs_g = parseFloat(match[1]);
    }
    
    if (line.includes('fat') && !line.includes('saturated')) {
      const match = line.match(/(\d+(?:\.\d+)?)/);
      if (match) nutrition.fat_g = parseFloat(match[1]);
    }
    
    if (line.includes('sugar')) {
      const match = line.match(/(\d+(?:\.\d+)?)/);
      if (match) nutrition.sugar_g = parseFloat(match[1]);
    }
    
    if (line.includes('fiber') || line.includes('fibre')) {
      const match = line.match(/(\d+(?:\.\d+)?)/);
      if (match) nutrition.fiber_g = parseFloat(match[1]);
    }
    
    if (line.includes('sodium')) {
      const match = line.match(/(\d+(?:\.\d+)?)/);
      if (match) nutrition.sodium_mg = parseFloat(match[1]);
    }
  }
  
  // Fallback: if no specific product name found, use first few words
  if (productName === 'Unknown Product' && ocrText.length > 0) {
    const words = ocrText.split(/\s+/).slice(0, 4);
    productName = words.join(' ') || 'OCR Product';
  }
  
  return {
    name: productName,
    ingredientsText: ingredientsText || undefined,
    nutrition: Object.keys(nutrition).length > 0 ? nutrition : undefined
  };
}
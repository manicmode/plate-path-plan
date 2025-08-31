import { VOLUME_TO_ML, mlToGrams } from '../units';
import { extractServingGramsFromText, inferCategory, fallbackServingGramsByCategory } from './nutritionFactsParser';

export interface OCRServingResult {
  grams: number;
  confidence: number;
  source: 'serving_size' | 'volume_conversion' | 'serving_context' | 'category_fallback';
  extractedText: string;
  rule?: string; // New: which rule extracted the grams
}

// Legacy function - now delegates to new robust parser
export function parseOCRServing(ocrText: string, productName: string = ''): OCRServingResult | null {
  if (!ocrText?.trim()) return null;
  
  console.info('[PORTION][OCR] Parsing serving from OCR:', { textLength: ocrText.length });
  
  // Try new robust parser first
  const grams = extractServingGramsFromText(ocrText);
  if (grams && grams >= 5 && grams <= 250) {
    return {
      grams,
      confidence: 0.9,
      source: 'serving_size',
      extractedText: ocrText.substring(0, 100) + '...', // Truncate for storage
      rule: 'nutrition_facts_parser'
    };
  }
  
  // Fallback to category-based serving size
  const category = inferCategory({ title: productName, ingredients: ocrText });
  const fallbackGrams = fallbackServingGramsByCategory(category);
  
  console.log('[PORTION][OCR] Using category fallback:', { category, grams: fallbackGrams });
  return {
    grams: fallbackGrams,
    confidence: 0.3,
    source: 'category_fallback',
    extractedText: `Category: ${category}`,
    rule: `fallback:${category}`
  };
}
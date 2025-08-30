/**
 * OCR Text to Health Report Input Adapter
 * 
 * Converts OCR extracted text to the same input shape used by barcode's 
 * analyzeProductForQuality function, ensuring consistent health report generation.
 */

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
 * Convert OCR text to structured health analysis input
 * Parses nutrition labels and ingredient lists from OCR text
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
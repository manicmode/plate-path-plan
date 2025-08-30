import { VOLUME_TO_ML, mlToGrams } from '../units';

export interface OCRServingResult {
  grams: number;
  confidence: number;
  source: 'serving_size' | 'volume_conversion' | 'serving_context';
  extractedText: string;
}

// Negative filters - reject lines containing these patterns
const REJECT_PATTERNS = [
  /net\s*wt|net\s*weight|total\s*weight/i,
  /per\s*container|entire\s*container|whole\s*container/i,
  /calories?|energy|sugars?|protein|total\s*fat|fat\b|fiber|sodium|carb(?:ohydrate)?s?|cholesterol/i,
  /vitamin|mineral|calcium|iron|potassium/i,
  /\b\d+\s*(?:cal|kcal)\b/i // calorie values
];

// Serving context patterns - accept only if line contains these
const SERVING_CONTEXT = [
  /serving\s*size/i,
  /per\s*serving/i,
  /servings?\s*per/i,
  /(?:1|one)\s*serving/i
];

export function parseOCRServing(ocrText: string, productName: string = ''): OCRServingResult | null {
  if (!ocrText?.trim()) return null;
  
  const lines = ocrText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const dec = (s: string) => parseFloat(s.replace(/,/g, '.'));
  
  console.info('[PORTION][OCR] Parsing serving from OCR:', { lines: lines.length });
  
  // Strategy 1: Explicit "serving size X g" patterns
  for (const line of lines) {
    if (REJECT_PATTERNS.some(pattern => pattern.test(line))) continue;
    
    const servingSizeMatch = line.match(/serving\s*size[^0-9]*?(\d+(?:[.,]\d+)?)\s*g/i);
    if (servingSizeMatch) {
      const grams = dec(servingSizeMatch[1]);
      if (grams >= 5 && grams <= 250) {
        return {
          grams,
          confidence: 0.9,
          source: 'serving_size',
          extractedText: line
        };
      }
    }
  }
  
  // Strategy 2: Volume with gram conversion "1 cup (30g)"
  for (const line of lines) {
    if (REJECT_PATTERNS.some(pattern => pattern.test(line))) continue;
    
    const volumeMatch = line.match(/(?:(\d+(?:[.,]\d+)?)\s*)?(cup|tbsp|tablespoon|tsp|teaspoon|ml|fl\s*oz)[^()]{0,32}\((\d+(?:[.,]\d+)?)\s*g\)/i);
    if (volumeMatch) {
      const grams = dec(volumeMatch[3]);
      if (grams >= 5 && grams <= 250) {
        return {
          grams,
          confidence: 0.8,
          source: 'volume_conversion',
          extractedText: line
        };
      }
    }
  }
  
  // Strategy 3: Plain grams but only in serving context
  for (const line of lines) {
    if (REJECT_PATTERNS.some(pattern => pattern.test(line))) continue;
    if (!SERVING_CONTEXT.some(pattern => pattern.test(line))) continue;
    
    const gramsMatch = line.match(/(\d+(?:[.,]\d+)?)\s*g(?:\s|$|[^a-z])/i);
    if (gramsMatch) {
      const grams = dec(gramsMatch[1]);
      // More restrictive bounds for plain grams
      if (grams >= 10 && grams <= 200) {
        return {
          grams,
          confidence: 0.6,
          source: 'serving_context',
          extractedText: line
        };
      }
    }
  }
  
  // Strategy 4: Volume to weight conversion using density
  for (const line of lines) {
    if (REJECT_PATTERNS.some(pattern => pattern.test(line))) continue;
    if (!SERVING_CONTEXT.some(pattern => pattern.test(line))) continue;
    
    const volumeOnlyMatch = line.match(/(\d+(?:[.,]\d+)?)\s*(cup|tbsp|tablespoon|tsp|teaspoon|ml|fl\s*oz)/i);
    if (volumeOnlyMatch) {
      const amount = dec(volumeOnlyMatch[1]);
      const unit = volumeOnlyMatch[2].toLowerCase().replace(/s$/, ''); // remove plural
      
      const mlPerUnit = VOLUME_TO_ML[unit];
      if (mlPerUnit) {
        const totalMl = amount * mlPerUnit;
        const estimatedGrams = mlToGrams(totalMl, productName);
        
        if (estimatedGrams >= 5 && estimatedGrams <= 250) {
          return {
            grams: estimatedGrams,
            confidence: 0.5,
            source: 'volume_conversion',
            extractedText: line
          };
        }
      }
    }
  }
  
  return null;
}
import { VOLUME_TO_ML, mlToGrams } from '../units';

export interface OCRServingResult {
  grams: number;
  confidence: number;
  source: 'serving_size' | 'volume_conversion' | 'serving_context';
  extractedText: string;
}

// Enhanced negative filters per PR requirements
const REJECT_PATTERNS = [
  /net\s*wt|net\s*weight|total\s*weight/i,
  /per\s*container|entire\s*container|whole\s*container|servings?\s*per\s*container/i,
  /package|contents/i,
  /calories?|energy|sugars?|protein|total\s*fat|fat\b|fiber|fibre|sodium|carb(?:ohydrate)?s?|cholesterol/i,
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
  
  // Locale decimal conversion (55,0 g → 55.0)
  const dec = (s: string) => parseFloat(s.replace(/,/g, '.'));
  
  console.info('[PORTION][OCR] Parsing serving from OCR:', { lines: lines.length });
  console.info('[PORTION][OCR] Top 3 lines considered:', lines.slice(0, 3));
  
  // Strategy 1: Explicit "serving size X g" patterns
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const rejectedBy = REJECT_PATTERNS.find(pattern => pattern.test(line));
    
    if (rejectedBy) {
      console.log(`[PORTION][OCR] Line ${i+1} rejected by filter:`, { line, filter: rejectedBy.source });
      continue;
    }
    
    const servingSizeMatch = line.match(/serving\s*size[^0-9]*?(\d+(?:[.,]\d+)?)\s*g/i);
    if (servingSizeMatch) {
      const grams = dec(servingSizeMatch[1]);
      const accepted = grams >= 5 && grams <= 250;
      console.log(`[PORTION][OCR] Line ${i+1} serving size:`, { line, grams, accepted });
      
      if (accepted) {
        return {
          grams,
          confidence: 0.9,
          source: 'serving_size',
          extractedText: line
        };
      }
    }
  }
  
  // Strategy 2: Volume with gram conversion "2/3 cup (30g)" or "1 cup (30 g)"
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const rejectedBy = REJECT_PATTERNS.find(pattern => pattern.test(line));
    if (rejectedBy) continue;
    
    // Enhanced volume pattern to catch fractions and various formats
    const volumeMatch = line.match(/(?:(\d+(?:\/\d+)?(?:[.,]\d+)?)\s*)?(cup|tbsp|tablespoon|tsp|teaspoon|ml|fl\s*oz)[^()]{0,32}\((\d+(?:[.,]\d+)?)\s*g\)/i);
    if (volumeMatch) {
      const grams = dec(volumeMatch[3]);
      const accepted = grams >= 5 && grams <= 250;
      console.log(`[PORTION][OCR] Line ${i+1} volume conversion:`, { line, grams, accepted });
      
      if (accepted) {
        return {
          grams,
          confidence: 0.8,
          source: 'volume_conversion',
          extractedText: line
        };
      }
    }
  }
  
  // Strategy 3: Plain grams but ONLY with serving context
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const rejectedBy = REJECT_PATTERNS.find(pattern => pattern.test(line));
    const hasServingContext = SERVING_CONTEXT.some(pattern => pattern.test(line));
    
    if (rejectedBy || !hasServingContext) {
      if (!hasServingContext) {
        console.log(`[PORTION][OCR] Line ${i+1} lacks serving context:`, line);
      }
      continue;
    }
    
    const gramsMatch = line.match(/(\d+(?:[.,]\d+)?)\s*g(?:\s|$|[^a-z])/i);
    if (gramsMatch) {
      const grams = dec(gramsMatch[1]);
      const accepted = grams >= 10 && grams <= 200; // Stricter bounds for context-only
      console.log(`[PORTION][OCR] Line ${i+1} context grams:`, { line, grams, accepted, hasContext: true });
      
      if (accepted) {
        return {
          grams,
          confidence: 0.6,
          source: 'serving_context',
          extractedText: line
        };
      }
    }
  }
  
  console.log('[PORTION][OCR] No valid serving size found in OCR text');
  return null;
}
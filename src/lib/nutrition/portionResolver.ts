import { parseOCRServing, type OCRServingResult } from './parsers/ocrServing';
import { mark, trace } from '../util/log';

// LRU Cache for portion resolution results
interface CachedPortionResult {
  result: PortionResult;
  timestamp: number;
}

class PortionCache {
  private cache = new Map<string, CachedPortionResult>();
  private maxSize = 100;
  private maxAge = 5 * 60 * 1000; // 5 minutes

  private generateKey(productData: any, ocrText?: string): string {
    const barcode = productData?.barcode || productData?.id;
    const productName = productData?.name || productData?.productName || '';
    const ocrHash = ocrText ? btoa(ocrText.slice(0, 100)).slice(0, 8) : '';
    return `${barcode || productName.slice(0, 20)}_${ocrHash}`;
  }

  get(productData: any, ocrText?: string): PortionResult | null {
    const key = this.generateKey(productData, ocrText);
    const cached = this.cache.get(key);
    
    if (!cached) return null;
    
    // Check if expired
    if (Date.now() - cached.timestamp > this.maxAge) {
      this.cache.delete(key);
      return null;
    }
    
    trace('portionCache:hit', { key });
    return cached.result;
  }

  set(productData: any, ocrText: string | undefined, result: PortionResult): void {
    const key = this.generateKey(productData, ocrText);
    
    // LRU eviction
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    
    this.cache.set(key, {
      result,
      timestamp: Date.now()
    });
    
    trace('portionCache:set', { key, size: this.cache.size });
  }

  clear(): void {
    this.cache.clear();
  }
}

const portionCache = new PortionCache();

export interface PortionCandidate {
  grams: number;
  confidence: number;
  source: 'ocr' | 'database' | 'ratio' | 'category' | 'fallback';
  label: string;
  details?: string;
}

export interface PortionResult {
  grams: number;
  label: string;
  source: string;
  confidence: number;
  candidates: PortionCandidate[];
}

// Category-based portion estimates
const CATEGORY_PORTIONS: Record<string, number> = {
  // Cereals and grains
  'cereal': 55,
  'granola': 55,
  'oatmeal': 40,
  'muesli': 55,
  'rice': 80,
  'pasta': 80,
  
  // Nuts and seeds
  'nuts': 40,
  'almonds': 40,
  'peanuts': 40,
  'seeds': 30,
  'trail mix': 40,
  
  // Snacks
  'chips': 30,
  'crackers': 30,
  'cookies': 25,
  'candy': 25,
  'chocolate': 25,
  
  // Spreads and condiments
  'peanut butter': 32,
  'jam': 20,
  'honey': 21,
  'sauce': 15,
  
  // Dairy
  'yogurt': 170,
  'cheese': 30,
  'milk': 240,
  
  // Default portions
  'supplement': 1,
  'vitamin': 1,
  'powder': 30,
  'bar': 40
};

function estimateFromCategory(productName: string): PortionCandidate | null {
  const name = productName.toLowerCase();
  
  for (const [category, grams] of Object.entries(CATEGORY_PORTIONS)) {
    if (name.includes(category)) {
      return {
        grams,
        confidence: 0.4,
        source: 'category',
        label: `${grams}g · ${category}`,
        details: `Estimated from ${category} category`
      };
    }
  }
  
  return null;
}

function parseFromDatabase(productData: any): PortionCandidate | null {
  if (!productData) return null;
  
  // Check various DB fields for serving size
  const servingGrams = productData.serving_size_g || 
                      productData.servingSize || 
                      productData.serving_grams ||
                      productData.portion_grams;
  
  if (typeof servingGrams === 'number' && servingGrams >= 5 && servingGrams <= 500) {
    return {
      grams: Math.round(servingGrams),
      confidence: 0.85,
      source: 'database',
      label: `${Math.round(servingGrams)}g · DB`,
      details: 'From product database'
    };
  }
  
  return null;
}

function calculateFromRatio(productData: any): PortionCandidate | null {
  if (!productData?.nutrition) return null;
  
  const { nutrition } = productData;
  
  // Check if we have both per-100g and per-serving values
  const calories100g = nutrition.calories_per_100g || nutrition.energy_per_100g;
  const caloriesServing = nutrition.calories || nutrition.energy;
  
  if (calories100g && caloriesServing && calories100g > 0) {
    const ratio = caloriesServing / calories100g;
    const estimatedGrams = Math.round(ratio * 100);
    
    if (estimatedGrams >= 5 && estimatedGrams <= 300) {
      return {
        grams: estimatedGrams,
        confidence: 0.7,
        source: 'ratio',
        label: `${estimatedGrams}g · calc`,
        details: 'Calculated from nutrition ratio'
      };
    }
  }
  
  return null;
}

function parseFromOCR(ocrText: string, productName: string = ''): PortionCandidate | null {
  const result = parseOCRServing(ocrText, productName);
  if (!result) return null;
  
  return {
    grams: Math.round(result.grams),
    confidence: result.confidence,
    source: 'ocr',
    label: `${Math.round(result.grams)}g · OCR`,
    details: `Extracted: "${result.extractedText}"`
  };
}

function sanitizeCandidate(candidate: PortionCandidate): PortionCandidate | null {
  // Bounds checking
  if (candidate.grams < 1 || candidate.grams > 500) return null;
  
  // Source-specific validation
  switch (candidate.source) {
    case 'ocr':
      // More restrictive for OCR due to parsing errors
      if (candidate.grams < 5 || candidate.grams > 250) return null;
      break;
    case 'database':
      // DB values can be more flexible
      if (candidate.grams < 1 || candidate.grams > 500) return null;
      break;
    case 'ratio':
      // Calculated values should be reasonable
      if (candidate.grams < 10 || candidate.grams > 300) return null;
      break;
  }
  
  return candidate;
}

function scoreCandidate(candidate: PortionCandidate, productName: string): number {
  let score = candidate.confidence;
  
  // Boost score based on source reliability
  const sourceBoosts = {
    'database': 0.1,
    'ratio': 0.05,
    'ocr': 0.0,
    'category': -0.1,
    'fallback': -0.2
  };
  
  score += sourceBoosts[candidate.source] || 0;
  
  // Penalize extreme values
  if (candidate.grams < 10 || candidate.grams > 200) {
    score -= 0.1;
  }
  
  // Boost common portion sizes
  const commonSizes = [15, 20, 25, 30, 40, 50, 55, 80, 100];
  if (commonSizes.includes(candidate.grams)) {
    score += 0.05;
  }
  
  return Math.max(0, Math.min(1, score));
}

export async function resolvePortion(
  productData: any,
  ocrText?: string,
  userId?: string
): Promise<PortionResult> {
  mark('resolvePortion:start');
  
  // Check cache first
  const cached = portionCache.get(productData, ocrText);
  if (cached) {
    mark('resolvePortion:cache_hit');
    return cached;
  }
  
  const productName = productData?.name || productData?.productName || '';
  const candidates: PortionCandidate[] = [];
  
  // Gather candidates from all sources
  const dbCandidate = parseFromDatabase(productData);
  if (dbCandidate) candidates.push(dbCandidate);
  
  const ratioCandidate = calculateFromRatio(productData);
  if (ratioCandidate) candidates.push(ratioCandidate);
  
  if (ocrText) {
    const ocrCandidate = parseFromOCR(ocrText, productName);
    if (ocrCandidate) candidates.push(ocrCandidate);
  }
  
  const categoryCandidate = estimateFromCategory(productName);
  if (categoryCandidate) candidates.push(categoryCandidate);
  
  // Fallback candidate
  candidates.push({
    grams: 30,
    confidence: 0.1,
    source: 'fallback',
    label: '30g · est.',
    details: 'Default estimate'
  });
  
  // Sanitize and score candidates
  const validCandidates = candidates
    .map(c => sanitizeCandidate(c))
    .filter(Boolean)
    .map(c => ({ ...c!, score: scoreCandidate(c!, productName) }))
    .sort((a, b) => b.score - a.score);
  
  const winner = validCandidates[0];
  
  const result: PortionResult = {
    grams: winner.grams,
    label: winner.label,
    source: winner.source,
    confidence: winner.score,
    candidates: validCandidates.map(c => ({
      grams: c.grams,
      confidence: c.score,
      source: c.source,
      label: c.label,
      details: c.details
    }))
  };
  
  // Cache the result
  portionCache.set(productData, ocrText, result);
  
  // Log telemetry (throttled)
  trace('REPORT:V2:PORTION:RESOLVE', {
    productName,
    selectedSource: winner.source,
    selectedGrams: winner.grams,
    candidateCount: validCandidates.length,
    topScore: winner.score
  });
  
  mark('resolvePortion:end');
  
  return result;
}
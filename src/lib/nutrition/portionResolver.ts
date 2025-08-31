import { parseOCRServing, type OCRServingResult } from './parsers/ocrServing';
import { calculateServingFromRatio } from './ratioServing';
import { getCategoryPortion, validateAgainstCaps } from './categories';
import { mark, trace } from '../util/log';
import { supabase } from '@/integrations/supabase/client';

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
  chosenFrom?: string;
}

// Memoized barcode lookup cache
const barcodeCache = new Map<string, { data: any; timestamp: number }>();
const BARCODE_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Fetch serving data from barcode with timeout and caching
 * NOTE: Uses nutrition_logs table as fallback since nutrition_database doesn't exist
 */
async function fetchServingFromBarcode(barcode: string): Promise<any> {
  if (!barcode) return null;
  
  // Check cache first
  const cached = barcodeCache.get(barcode);
  if (cached && (Date.now() - cached.timestamp) < BARCODE_CACHE_TTL) {
    return cached.data;
  }
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 800); // 800ms timeout
    
    // Fallback to nutrition_logs for barcode data since nutrition_database doesn't exist
    const { data, error } = await supabase
      .from('nutrition_logs')
      .select('serving_size, nutrition')
      .eq('barcode', barcode)
      .maybeSingle();
      
    clearTimeout(timeoutId);
    
    if (error) {
      console.log('[PORTION][DB] Barcode lookup error:', error.message);
      return null;
    }
    
    // Cache the result
    barcodeCache.set(barcode, { data, timestamp: Date.now() });
    return data;
  } catch (error) {
    console.log('[PORTION][DB] Barcode lookup timeout or error:', error);
    return null;
  }
}

function estimateFromCategory(productName: string): PortionCandidate | null {
  const categoryMatch = getCategoryPortion(productName);
  if (!categoryMatch) return null;
  
  return {
    grams: categoryMatch.grams,
    confidence: 0.4,
    source: 'category',
    label: `${categoryMatch.grams}g · ${categoryMatch.category}`,
    details: `Estimated from ${categoryMatch.category} category`
  };
}

async function parseFromDatabase(productData: any, enabled: boolean = true): Promise<PortionCandidate | null> {
  if (!enabled) return null;
  if (!productData) return null;
  
  // First, check local product data
  const servingGrams = productData.serving_size_g || 
                      productData.servingSize || 
                      productData.serving_grams ||
                      productData.portion_grams;
  
  if (typeof servingGrams === 'number' && servingGrams >= 5 && servingGrams <= 500) {
    return {
      grams: Math.round(servingGrams),
      confidence: 0.9,
      source: 'database',
      label: `${Math.round(servingGrams)}g · DB`,
      details: 'From product database'
    };
  }
  
  // If no local data and we have a barcode, try barcode lookup
  const barcode = productData.barcode;
  if (barcode) {
    const barcodeData = await fetchServingFromBarcode(barcode);
    if (barcodeData?.serving_size && typeof barcodeData.serving_size === 'string') {
      // Parse serving size string (e.g., "30g")
      const match = barcodeData.serving_size.match(/(\d+(?:\.\d+)?)\s*g/i);
      if (match) {
        const grams = Math.round(parseFloat(match[1]));
        if (grams >= 5 && grams <= 500) {
          return {
            grams,
            confidence: 0.85,
            source: 'database',
            label: `${grams}g · DB`,
            details: 'From barcode lookup'
          };
        }
      }
    }
  }
  
  return null;
}

function calculateFromRatio(productData: any): PortionCandidate | null {
  if (!productData?.nutrition) return null;
  
  const result = calculateServingFromRatio(productData.nutrition);
  if (!result) return null;
  
  return {
    grams: result.grams,
    confidence: result.confidence,
    source: 'ratio',
    label: `${result.grams}g · calc`,
    details: result.details
  };
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
  
  // Feature flags
  const urlParams = new URLSearchParams(window.location.search);
  const portionOffQP = urlParams.get('portionOff') === '1';
  const barcode_off_lookup_enabled = !portionOffQP; // Default ON unless disabled via URL

  // FORENSIC LOGGING - Resolver Input
  console.debug('[FORENSIC][RESOLVER][INPUT]', {
    hint: undefined, // Would be passed from opts if available
    flags: { portionOffQP, emergencyKill: false },
    meta: { barcode: productData?.barcode || productData?.id },
    norm: {
      id: productData?.id, 
      barcode: productData?.barcode,
      servingGrams: productData?.serving_size_g || productData?.servingSize || productData?.serving_grams,
      hasPer100: !!productData?.nutrition,
      hasPerServing: !!productData?.nutrition
    }
  });
  
  // Generate cache key for inquiry logging
  const barcode = productData?.barcode || productData?.id;
  const productNameForCache = productData?.name || productData?.productName || '';
  const ocrHash = ocrText ? btoa(ocrText.slice(0, 100)).slice(0, 8) : '';
  const cacheKey = `${barcode || productNameForCache.slice(0, 20)}_${ocrHash}`;
  
  // Emergency kill switch - force fallback
  if (portionOffQP) {
    console.info('[PORTION][INQ3][RESOLVE_DONE]', {
      cache: { hit: false, key: cacheKey },
      flags: { portion_resolution_enabled: false, portionOffQP: true, emergencyKill: true },
      inputs: { hasOcr: !!ocrText, ocrLen: ocrText?.length || 0, hasDb: !!productData, hasPer100: !!productData?.nutrition },
      candidates: [{ source: 'fallback', grams: 30, confidence: 0.1, penalties: 'none', reason: 'portionOff=1 override' }],
      chosen: { source: 'fallback', grams: 30 },
      timing: 'emergency_fallback'
    });
    
    return {
      grams: 30,
      label: '30g · est.',
      source: 'fallback',
      confidence: 0.1,
      candidates: [{
        grams: 30,
        confidence: 0.1,
        source: 'fallback',
        label: '30g · est.',
        details: 'Emergency fallback (portionOff=1)'
      }],
      chosenFrom: 'emergency_override'
    };
  }
  
  // Check cache first
  const cached = portionCache.get(productData, ocrText);
  if (cached) {
    mark('resolvePortion:cache_hit');
    console.info('[PORTION][INQ3][RESOLVE_DONE]', {
      cache: { hit: true, key: cacheKey },
      flags: { portion_resolution_enabled: true, portionOffQP: false, emergencyKill: false },
      inputs: { hasOcr: !!ocrText, ocrLen: ocrText?.length || 0, hasDb: !!productData, hasPer100: !!productData?.nutrition },
      candidates: cached.candidates,
      chosen: { source: cached.source, grams: cached.grams },
      timing: 'cached'
    });
    return cached;
  }
  
  const productName = productData?.name || productData?.productName || '';
  const candidates: PortionCandidate[] = [];
  
  // Source 1: Database (local + barcode lookup)
  const dbCandidate = await parseFromDatabase(productData, barcode_off_lookup_enabled);
  if (dbCandidate) {
    console.log('[PORTION][DB]', 'Found DB candidate:', dbCandidate.grams, 'g');
    candidates.push(dbCandidate);
  } else {
    console.log('[PORTION][DB]', 'No DB serving size found:', { 
      serving_size_g: productData?.serving_size_g, 
      servingSize: productData?.servingSize,
      barcode: productData?.barcode,
      enabled: barcode_off_lookup_enabled,
      reason: !productData ? 'no_product_data' : !barcode_off_lookup_enabled ? 'disabled' : 'no_serving_fields' 
    });
  }
  
  // Source 2: OCR parsing
  if (ocrText) {
    const ocrCandidate = parseFromOCR(ocrText, productName);
    if (ocrCandidate) {
      console.log('[PORTION][OCR]', 'Found OCR candidate:', ocrCandidate.grams, 'g');
      candidates.push(ocrCandidate);
    } else {
      console.log('[PORTION][OCR]', 'No OCR serving found - check parseFromOCR logs');
    }
  } else {
    console.log('[PORTION][OCR]', 'No OCR text provided');
  }
  
  // Source 3: Ratio calculation
  const ratioCandidate = calculateFromRatio(productData);
  if (ratioCandidate) {
    console.log('[PORTION][RATIO]', 'Found ratio candidate:', ratioCandidate.grams, 'g');
    candidates.push(ratioCandidate);
  } else {
    console.log('[PORTION][RATIO]', 'No ratio calculation possible:', { 
      nutrition: !!productData?.nutrition,
      reason: !productData?.nutrition ? 'no_nutrition_data' : 'missing_per_serving_fields'
    });
  }
  
  // Source 4: Category estimation
  const categoryCandidate = estimateFromCategory(productName);
  if (categoryCandidate) {
    console.log('[PORTION][CATEGORY]', 'Found category candidate:', categoryCandidate.grams, 'g');
    candidates.push(categoryCandidate);
  } else {
    console.log('[PORTION][CATEGORY]', 'No category match found for:', productName);
  }
  
  // Source 5: Fallback
  candidates.push({
    grams: 30,
    confidence: 0.1,
    source: 'fallback',
    label: '30g · est.',
    details: 'Default estimate'
  });
  
  // Sanitize, score, and rank candidates
  const validCandidates = candidates
    .map(c => sanitizeCandidate(c))
    .filter(Boolean)
    .map(c => ({ ...c!, score: scoreCandidate(c!, productName) }))
    .sort((a, b) => b.score - a.score);
  
  const winner = validCandidates[0];
  
  // Apply category caps as final validation
  const finalGrams = validateAgainstCaps(winner.grams, productName);
  if (finalGrams !== winner.grams) {
    console.log('[PORTION][CAPS]', `Applied cap: ${winner.grams}g -> ${finalGrams}g`);
  }
  
  const result: PortionResult = {
    grams: finalGrams,
    label: winner.label.replace(`${winner.grams}g`, `${finalGrams}g`),
    source: winner.source,
    confidence: winner.score,
    candidates: validCandidates.map(c => ({
      grams: c.grams,
      confidence: c.score,
      source: c.source,
      label: c.label,
      details: c.details
    })),
    chosenFrom: `${winner.source}_priority`
  };
  
  // Cache the result
  portionCache.set(productData, ocrText, result);
  
  // Log telemetry (single per item)
  trace('REPORT:V2:PORTION:RESOLVE', {
    productName,
    selectedSource: winner.source,
    selectedGrams: finalGrams,
    candidateCount: validCandidates.length,
    topScore: winner.score,
    timing: performance.now()
  });
  
  // Detailed end trace for inquiry
  console.info('[PORTION][INQ3][RESOLVE_DONE]', {
    cache: { hit: false, key: cacheKey },
    flags: { portion_resolution_enabled: true, portionOffQP: false, emergencyKill: false },
    inputs: { hasOcr: !!ocrText, ocrLen: ocrText?.length || 0, hasDb: !!productData, hasPer100: !!productData?.nutrition },
    candidates: validCandidates.map(c => ({
      source: c.source,
      grams: c.grams,
      confidence: c.confidence,
      penalties: c.details || 'none',
      reason: c.details || 'no_reason'
    })),
    chosen: { source: winner.source, grams: finalGrams },
    timing: 'computed'
  });
  
  // FORENSIC LOGGING - Resolver Output
  console.debug('[FORENSIC][RESOLVER][OUTPUT]', {
    chosen: { source: winner.source, grams: finalGrams },
    candidates: validCandidates.map(c => ({
      source: c.source,
      grams: c.grams,
      confidence: c.confidence
    }))
  });

  mark('resolvePortion:end');
  
  return result;
}
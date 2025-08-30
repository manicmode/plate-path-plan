/**
 * Safe Portion Detection V2 - Zero Spillover Implementation
 * Hard wall: display-only recompute, no shared state mutation
 */

interface PortionResult {
  grams: number;
  source: 'ocr' | 'db' | 'nutrition_ratio' | 'category_estimate' | 'fallback';
  label: string;
}

interface PortionOutcome {
  source: string;
  hit: boolean;
  grams: number | null;
  reason?: string;
  ms: number;
}

interface PortionTrace {
  flags: {
    enabled: boolean;
    portionOffQP: boolean;
    emergencyKill: boolean;
  };
  sourcesTried: string[];
  outcomes: PortionOutcome[];
  chosen: { source: string; grams: number };
  totalMs: number;
}

// Feature flags and kill switches
function isPortionDetectionEnabled(): boolean {
  const qp = new URLSearchParams(window.location.search);
  if (qp.has('portionOff')) return false;
  
  // Check for emergency kill switch
  if ((window as any).__emergencyPortionsDisabled) return false;
  
  // Check feature flag (default enabled)
  return (window as any).__flags?.portion_detection_enabled !== false;
}

// Emergency kill switch
(window as any).__emergencyDisablePortions = () => {
  (window as any).__emergencyPortionsDisabled = true;
  console.warn('[PORTION] Emergency kill switch activated');
};

// Helper function for debugging
(window as any).__getLastTrace = (tag?: string) => {
  return tag ? (window as any).__lastTraces?.[tag] : (window as any).__lastTraces;
};

// OCR parsing patterns
function parseOCRPortion(ocrText: string, category?: string): { grams: number; source: 'ocr' } | null {
  if (!ocrText) {
    console.info('[PORTION][OCR] No OCR text provided');
    return null;
  }
  
  const text = ocrText.toLowerCase();
  console.info('[PORTION][OCR] Parsing text:', { originalLength: ocrText.length, text: text.substring(0, 100) });
  
  // Pattern 1: Direct grams - (\d+(\.\d+)?)\s*g
  const gramsMatch = text.match(/(\d+(?:\.\d+)?)\s*g(?:\s|$|[^a-z])/);
  if (gramsMatch) {
    const grams = parseFloat(gramsMatch[1]);
    console.info('[PORTION][OCR] Found grams pattern:', { match: gramsMatch[0], grams });
    if (grams >= 5 && grams <= 250) {
      return { grams, source: 'ocr' };
    }
  }
  
  // Pattern 2: Serving size with grams - serving size.*?\((\d+(\.\d+)?)\s*g\)
  const servingSizeMatch = text.match(/serving\s+size.*?\((\d+(?:\.\d+)?)\s*g\)/);
  if (servingSizeMatch) {
    const grams = parseFloat(servingSizeMatch[1]);
    console.info('[PORTION][OCR] Found serving size pattern:', { match: servingSizeMatch[0], grams });
    if (grams >= 5 && grams <= 250) {
      return { grams, source: 'ocr' };
    }
  }
  
  // Pattern 3: Cups to grams conversion - (\d+\/\d+)\s*cup or (\d+(\.\d+)?)\s*cup(s)?
  const fractionCupMatch = text.match(/(\d+)\/(\d+)\s*cups?/);
  if (fractionCupMatch) {
    const fraction = parseFloat(fractionCupMatch[1]) / parseFloat(fractionCupMatch[2]);
    const grams = convertCupsToGrams(fraction, category);
    console.info('[PORTION][OCR] Found fraction cups pattern:', { match: fractionCupMatch[0], fraction, grams });
    if (grams >= 5 && grams <= 250) {
      return { grams, source: 'ocr' };
    }
  }
  
  const decimalCupMatch = text.match(/(\d+(?:\.\d+)?)\s*cups?/);
  if (decimalCupMatch) {
    const cups = parseFloat(decimalCupMatch[1]);
    const grams = convertCupsToGrams(cups, category);
    console.info('[PORTION][OCR] Found decimal cups pattern:', { match: decimalCupMatch[0], cups, grams });
    if (grams >= 5 && grams <= 250) {
      return { grams, source: 'ocr' };
    }
  }
  
  // Pattern 4: ML to grams conversion - (\d+(\.\d+)?)\s*ml
  const mlMatch = text.match(/(\d+(?:\.\d+)?)\s*ml/);
  if (mlMatch) {
    const ml = parseFloat(mlMatch[1]);
    const grams = convertMlToGrams(ml, category);
    console.info('[PORTION][OCR] Found ml pattern:', { match: mlMatch[0], ml, grams });
    if (grams >= 5 && grams <= 250) {
      return { grams, source: 'ocr' };
    }
  }
  
  console.info('[PORTION][OCR] No patterns matched');
  return null;
}

// Category density conversions
function convertCupsToGrams(cups: number, category?: string): number {
  const densities: Record<string, number> = {
    'cereals': 55, // grams per cup
    'grains': 45,
    'nuts': 120,
    'dairy': 240, // for liquid dairy
    'beverages': 240,
    'default': 60
  };
  
  const density = densities[category || 'default'] || densities.default;
  return Math.round(cups * density);
}

function convertMlToGrams(ml: number, category?: string): number {
  // For liquids, 1ml ≈ 1g for water-based items
  // For oil/fat-based items, adjust density
  const densities: Record<string, number> = {
    'oils': 0.92,
    'beverages': 1.0,
    'dairy': 1.03,
    'default': 1.0
  };
  
  const density = densities[category || 'default'] || densities.default;
  return Math.round(ml * density);
}

// Timeout wrapper
async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error('timeout')), ms)
    )
  ]);
}

// Source implementations
async function detectFromOCR(product: any, ocrText?: string): Promise<PortionResult | null> {
  console.info('[PORTION][OCR] Starting OCR detection:', { hasProduct: !!product, hasOcrText: !!ocrText });
  
  try {
    const text = ocrText || product.ocrText || product.ingredients_text || '';
    console.info('[PORTION][OCR] Using text sources:', {
      fromParam: !!ocrText,
      fromProduct: !!(product.ocrText || product.ingredients_text),
      finalTextLength: text.length
    });
    
    const result = parseOCRPortion(text, product.category);
    
    if (result) {
      console.info('[PORTION][OCR] SUCCESS:', result);
      return {
        grams: result.grams,
        source: 'ocr',
        label: `${result.grams}g · OCR`
      };
    }
    
    console.info('[PORTION][OCR] No valid portion found');
    return null;
  } catch (error) {
    console.warn('[PORTION] OCR detection failed:', error);
    return null;
  }
}

async function detectFromDB(product: any): Promise<PortionResult | null> {
  console.info('[PORTION][DB] Starting DB detection:', { product: !!product });
  
  try {
    // Mock DB lookup - in real implementation, check user preferences or product database
    // For now, simulate some products having DB overrides
    const dbOverrides: Record<string, number> = {
      'nuts_mixed': 40,
      'granola_organic': 45,
      'protein_bar': 60,
      'granola': 55,
      'nuts': 40,
      'candy': 40
    };
    
    const productKey = `${product.category}_${product.name}`.toLowerCase().replace(/\s+/g, '_');
    const itemKey = (product.itemName || '').toLowerCase().replace(/\s+/g, '_');
    
    console.info('[PORTION][DB] Checking keys:', { productKey, itemKey, availableKeys: Object.keys(dbOverrides) });
    
    const dbGrams = dbOverrides[productKey] || dbOverrides[itemKey] || 
                   dbOverrides[product.category] || dbOverrides[product.itemName];
    
    if (dbGrams && dbGrams >= 5 && dbGrams <= 250) {
      console.info('[PORTION][DB] SUCCESS:', { key: productKey || itemKey, grams: dbGrams });
      return {
        grams: dbGrams,
        source: 'db',
        label: `${dbGrams}g · DB`
      };
    }
    
    console.info('[PORTION][DB] No matching override found');
    return null;
  } catch (error) {
    console.warn('[PORTION] DB detection failed:', error);
    return null;
  }
}

async function detectFromNutritionRatio(product: any): Promise<PortionResult | null> {
  console.info('[PORTION][RATIO] Starting nutrition ratio detection');
  
  try {
    // Look for per-serving values in nutrition data
    const nutrition = product.nutrients || product.nutriments || product.nutritionData || {};
    
    console.info('[PORTION][RATIO] Available nutrition keys:', Object.keys(nutrition));
    
    // Check if we have both per-100g and per-serving data
    const per100Energy = nutrition.energy_kcal_100g || nutrition['energy-kcal_100g'];
    const perServingEnergy = nutrition.energy_kcal || nutrition['energy-kcal'];
    
    console.info('[PORTION][RATIO] Energy values:', { per100Energy, perServingEnergy });
    
    if (per100Energy && perServingEnergy && per100Energy > 0) {
      const ratio = perServingEnergy / per100Energy;
      const calculatedGrams = Math.round(ratio * 100);
      
      console.info('[PORTION][RATIO] Calculated:', { ratio, calculatedGrams });
      
      if (calculatedGrams >= 5 && calculatedGrams <= 250) {
        console.info('[PORTION][RATIO] SUCCESS:', { grams: calculatedGrams });
        return {
          grams: calculatedGrams,
          source: 'nutrition_ratio',
          label: `${calculatedGrams}g · calc`
        };
      } else {
        console.info('[PORTION][RATIO] Out of bounds:', calculatedGrams);
      }
    }
    
    console.info('[PORTION][RATIO] No valid ratio found');
    return null;
  } catch (error) {
    console.warn('[PORTION] Nutrition ratio detection failed:', error);
    return null;
  }
}

async function detectFromCategory(product: any): Promise<PortionResult | null> {
  console.info('[PORTION][CATEGORY] Starting category detection');
  
  try {
    // Category-based estimates
    const categoryDefaults: Record<string, number> = {
      'cereals': 55,
      'breakfast-cereals': 55,
      'granola': 55,
      'nuts': 30,
      'snacks': 25,
      'candy': 40,
      'chocolate': 40,
      'beverages': 240,
      'dairy': 150,
      'yogurt': 170,
      'protein-bars': 60,
      'cookies': 30,
      'crackers': 30,
      'chips': 28,
      'default': 30
    };
    
    const category = product.category || product.categories_tags?.[0] || 'default';
    const grams = categoryDefaults[category] || categoryDefaults.default;
    
    console.info('[PORTION][CATEGORY] SUCCESS:', { category, grams });
    
    return {
      grams,
      source: 'category_estimate',
      label: `${grams}g · est.`
    };
  } catch (error) {
    console.warn('[PORTION] Category detection failed:', error);
    return {
      grams: 30,
      source: 'fallback',
      label: '30g · est.'
    };
  }
}

// Main detection function
export async function detectPortionSafe(product: any, ocrText?: string, entry: string = 'unknown'): Promise<PortionResult> {
  const startTime = Date.now();
  const outcomes: PortionOutcome[] = [];
  const sourcesTried: string[] = [];
  
  console.info('[PORTION][DETECTOR] Starting detection for entry:', entry, { 
    hasProduct: !!product, 
    hasOcrText: !!ocrText,
    productName: product?.itemName || product?.name || 'unknown'
  });
  
  // Check flags
  const flags = {
    enabled: isPortionDetectionEnabled(),
    portionOffQP: new URLSearchParams(window.location.search).has('portionOff'),
    emergencyKill: !!(window as any).__emergencyPortionsDisabled
  };
  
  console.info('[PORTION][DETECTOR] Flags check:', flags);
  
  if (!flags.enabled) {
    const trace: PortionTrace = {
      flags,
      sourcesTried: ['flags'],
      outcomes: [{ source: 'flags', hit: false, grams: null, reason: 'disabled', ms: 0 }],
      chosen: { source: 'fallback', grams: 30 },
      totalMs: Date.now() - startTime
    };
    
    console.log('[REPORT][V2][PORTION][TRACE]', trace);
    
    // Store trace for debugging
    if (!(window as any).__lastTraces) (window as any).__lastTraces = {};
    (window as any).__lastTraces[entry] = trace;
    
    return {
      grams: 30,
      source: 'fallback',
      label: '30g · est.'
    };
  }
  
  // Detection sources in precedence order
  const sources = [
    { name: 'ocr', fn: () => detectFromOCR(product, ocrText) },
    { name: 'db', fn: () => detectFromDB(product) },
    { name: 'nutrition_ratio', fn: () => detectFromNutritionRatio(product) },
    { name: 'category_estimate', fn: () => detectFromCategory(product) }
  ];
  
  let chosen: PortionResult | null = null;
  
  // Try each source with timeout
  for (const source of sources) {
    sourcesTried.push(source.name);
    const sourceStartTime = Date.now();
    
    console.info(`[PORTION][DETECTOR] Trying source: ${source.name}`);
    
    try {
      const result = await withTimeout(source.fn(), 3000); // 3s timeout per source
      const ms = Date.now() - sourceStartTime;
      
      console.info(`[PORTION][DETECTOR] Source ${source.name} result:`, { result, ms });
      
      if (result && result.grams >= 5 && result.grams <= 250) {
        outcomes.push({ 
          source: source.name, 
          hit: true, 
          grams: result.grams, 
          ms 
        });
        chosen = result;
        console.info(`[PORTION][DETECTOR] Source ${source.name} CHOSEN:`, chosen);
        break; // First valid result wins
      } else {
        outcomes.push({ 
          source: source.name, 
          hit: false, 
          grams: result?.grams || null,
          reason: result?.grams ? 'out_of_bounds' : 'no_data',
          ms 
        });
        console.info(`[PORTION][DETECTOR] Source ${source.name} rejected:`, {
          grams: result?.grams,
          reason: result?.grams ? 'out_of_bounds' : 'no_data'
        });
      }
    } catch (error) {
      const ms = Date.now() - sourceStartTime;
      outcomes.push({ 
        source: source.name, 
        hit: false, 
        grams: null,
        reason: error.message === 'timeout' ? 'timeout' : 'error',
        ms 
      });
      console.warn(`[PORTION][DETECTOR] Source ${source.name} error:`, error);
    }
  }
  
  // Fallback if nothing worked
  if (!chosen) {
    console.info('[PORTION][DETECTOR] No sources succeeded, using fallback');
    chosen = {
      grams: 30,
      source: 'fallback',
      label: '30g · est.'
    };
  }
  
  const totalMs = Date.now() - startTime;
  
  // Emit telemetry
  const trace: PortionTrace = {
    flags,
    sourcesTried,
    outcomes,
    chosen: { source: chosen.source, grams: chosen.grams },
    totalMs
  };
  
  console.log('[REPORT][V2][PORTION][TRACE]', trace);
  
  // Store trace for debugging
  if (!(window as any).__lastTraces) (window as any).__lastTraces = {};
  (window as any).__lastTraces[entry] = trace;
  
  return chosen;
}

// Legacy compatibility functions
export function getPortionInfoSync(cached?: any): any {
  if (cached && typeof cached.grams === 'number' && cached.grams > 0) {
    return {
      grams: cached.grams,
      isEstimated: cached.source === 'fallback' || cached.source === 'category_estimate',
      source: cached.source || 'fallback',
      confidence: cached.source === 'ocr' ? 0.9 : (cached.source === 'db' ? 0.8 : 0.3),
      display: cached.label || `${cached.grams}g`
    };
  }
  return {
    grams: 30,
    isEstimated: true,
    source: 'fallback',
    confidence: 0,
    display: '30g · est.'
  };
}

export function formatPortionDisplay(portionInfo: any): string {
  const info = getPortionInfoSync(portionInfo);
  return info.display || `${info.grams}g · est.`;
}

// Helper for scaling per-100g nutrition for display only
export function scalePer100ForDisplay(per100: any, grams: number): any {
  if (!per100 || !grams) return {};
  
  const factor = grams / 100;
  const scaled: any = {};
  
  // Scale common nutrition fields
  const fields = [
    'energy_kcal', 'energy_kcal_100g', 
    'proteins', 'proteins_100g',
    'carbohydrates', 'carbohydrates_100g',
    'sugars', 'sugars_100g', 
    'fat', 'fat_100g',
    'saturated_fat', 'saturated_fat_100g',
    'fiber', 'fiber_100g',
    'sodium', 'sodium_100g',
    'salt', 'salt_100g'
  ];
  
  for (const field of fields) {
    const value = per100[field];
    if (typeof value === 'number' && value >= 0) {
      // For per-100g fields, scale down; for base fields, they're already per-serving
      const isPerHundred = field.includes('100g');
      scaled[field] = isPerHundred ? Math.round((value * factor) * 10) / 10 : value;
    }
  }
  
  return scaled;
}
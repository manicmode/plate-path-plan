import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Legacy response format that UI expects (keep UI unchanged)
interface BackendResponse {
  productName: string;
  healthScore: number | null;
  healthFlags: Array<{
    type: 'danger' | 'warning' | 'good';
    icon: string;
    title: string;
    description: string;
  }>;
  nutritionSummary: any;
  ingredients: string[];
  recommendations: string[];
  generalSummary?: string;
  barcode?: string;
  fallback?: boolean;
}

// Log product structure for direct consumption by Log UI
interface LogProduct {
  productName: string;
  barcode: string;
  imageUrl?: string;

  nutrition: {
    calories: number;    // kcal per serving (or per 100g mapped to serving if serving exists)
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g: number;
    sugar_g: number;
    sodium_mg: number;
  };

  ingredients: string[]; // flat, cleaned list

  health: {
    score: number; // 0..100
    flags: Array<{
      id: string;                         // 'high_sugar' | 'high_sodium' | 'artificial_colors' | 'preservatives' | 'good_fiber' | ...
      label: string;                      // human label, e.g., 'High Sugar'
      level: 'good' | 'warning' | 'danger';
      emoji?: string;                     // optional emoji
      details?: string;                   // optional short note
    }>;
  };
}

interface RequestContext {
  reqId: string;
  now: Date;
  ocrText: string;
  tokens: string[];
  brandTokens: string[];
  hasCandy: boolean;
  barcodeFound?: string;
  offHit?: boolean;
  plateConf: number;
}

// Read-only health rules (immutable)
const HEALTH_RULES = Object.freeze({
  gmo_risk: Object.freeze([
    'soy', 'corn', 'canola', 'sugar beet', 'cottonseed',
    'soybean oil', 'corn syrup', 'high fructose corn syrup'
  ]),
  
  additives: Object.freeze({
    artificial_colors: Object.freeze(['yellow #5', 'red #40', 'blue #1', 'yellow #6', 'red #3', 'blue #2']),
    preservatives: Object.freeze(['sodium benzoate', 'potassium sorbate', 'bha', 'bht', 'tbhq']),
    sweeteners: Object.freeze(['aspartame', 'sucralose', 'acesulfame potassium', 'saccharin'])
  }),
  
  nutrition_limits: Object.freeze({
    sodium_high: 20,
    sugar_high: 15,
    saturated_fat_high: 20
  })
});

// Import enhanced brand lexicon and normalization
import { ENHANCED_BRAND_LEXICON, extractBrandTokensWithFuzzy } from './brandLexicon.ts';

// Brand normalization utilities - comprehensive system
const BRAND_ALIASES: Record<string, string> = {
  "traderjoes": "Trader Joe's",
  "traderjoe": "Trader Joe's", 
  "tjs": "Trader Joe's",
  "tj": "Trader Joe's",
  "cocacola": "Coca-Cola",
  "coke": "Coca-Cola",
  "pepsi": "Pepsi",
  "pepsicola": "Pepsi",
  "mcdonalds": "McDonald's",
  "kelloggs": "Kellogg's",
  "kellogg": "Kellogg's",
  "generalmills": "General Mills",
  "kraft": "Kraft",
  "kraftheinz": "Kraft Heinz",
  "nestle": "Nestlé",
  "nabisco": "Nabisco",
  "oreo": "Oreo",
  "cheerios": "Cheerios",
  "lays": "Lay's",
  "doritos": "Doritos",
  "cheetos": "Cheetos",
  "planters": "Planters",
  "skippy": "Skippy",
  "jif": "Jif",
  "ritz": "Ritz",
  "goldfish": "Goldfish",
  "benjerrys": "Ben & Jerry's",
  "benjerry": "Ben & Jerry's"
};

function toSlug(s: string): string {
  if (!s) return '';
  
  return s.toLowerCase()
    .replace(/'/g, '') // Remove apostrophes
    .replace(/[^\w\s]/g, '') // Remove punctuation except word chars and spaces
    .replace(/\s+/g, '') // Remove all spaces
    .trim();
}

function joinTokens(tokens: string[]): string[] {
  if (!tokens || tokens.length === 0) return [];
  
  const candidates = new Set<string>();
  
  // Single tokens
  tokens.forEach(token => {
    const cleaned = toSlug(token);
    if (cleaned.length > 1) {
      candidates.add(cleaned);
    }
  });
  
  // Bi-grams and tri-grams
  for (let i = 0; i < tokens.length - 1; i++) {
    // Bi-gram
    const bigram = toSlug(tokens[i] + tokens[i + 1]);
    if (bigram.length > 2) {
      candidates.add(bigram);
    }
    
    // Tri-gram (if available)
    if (i < tokens.length - 2) {
      const trigram = toSlug(tokens[i] + tokens[i + 1] + tokens[i + 2]);
      if (trigram.length > 3) {
        candidates.add(trigram);
      }
    }
  }
  
  return Array.from(candidates);
}

function normalizeBrandComprehensive(input: {
  ocrTokens?: string[];
  logoBrands?: string[];
  llmGuess?: string;
}): { brandGuess?: string; confidence: number } {
  // Priority 1: Logo brands (highest confidence)
  if (input.logoBrands && input.logoBrands.length > 0) {
    for (const logo of input.logoBrands) {
      const slug = toSlug(logo);
      const canonical = BRAND_ALIASES[slug];
      if (canonical) {
        return { brandGuess: canonical, confidence: 0.95 };
      }
    }
    
    // Return first logo brand even if not in aliases
    return { brandGuess: input.logoBrands[0], confidence: 0.85 };
  }
  
  // Priority 2: OCR tokens (medium confidence)
  if (input.ocrTokens && input.ocrTokens.length > 0) {
    const candidates = joinTokens(input.ocrTokens);
    
    for (const candidate of candidates) {
      const canonical = BRAND_ALIASES[candidate];
      if (canonical) {
        return { brandGuess: canonical, confidence: 0.8 };
      }
    }
  }
  
  // Priority 3: LLM guess (lower confidence, needs validation)
  if (input.llmGuess) {
    const slug = toSlug(input.llmGuess);
    const canonical = BRAND_ALIASES[slug];
    if (canonical) {
      return { brandGuess: canonical, confidence: 0.7 };
    }
    
    // Return LLM guess even if not in aliases (low confidence)
    return { brandGuess: input.llmGuess, confidence: 0.5 };
  }
  
  return { confidence: 0 };
}

// Read-only lexicons (immutable)
const STOP_WORDS = Object.freeze(new Set([
  'original', 'natural', 'flavored', 'sweet', 'crunchy', 'family', 'size', 
  'net', 'wt', 'gluten', 'free', 'non', 'gmo', 'keto', 'certified', 'made', 'with',
  'oz', 'lb', 'gram', 'serving', 'per', 'container', 'package', 'box', 'bag'
]));

// Legacy brand lexicon for backward compatibility
const BRAND_LEXICON = ENHANCED_BRAND_LEXICON;

const CANDY_KEYWORDS = Object.freeze(new Set([
  'candy', 'gummy', 'gummies', 'taffy', 'lollipop', 'chewy candy', 'chocolate',
  'sweet', 'treats', 'confection', 'bonbon'
]));

const GENERAL_TIPS = Object.freeze([
  'Focus on whole, unprocessed foods when possible',
  'Check ingredient lists for hidden additives',
  'Consider portion sizes and frequency of consumption'
]);

/**
 * Validate and normalize barcode with type detection
 */
function normalizeBarcode(input: string): { raw: string; type: string; checksumOk: boolean } | null {
  if (!input) return null;
  const raw = input.replace(/\D/g, '');
  if (!/^(\d{8}|\d{12}|\d{13}|\d{14})$/.test(raw)) return null;

  const len = raw.length;
  const type = len === 8 ? 'EAN_8'
             : len === 12 ? 'UPC_A'
             : len === 13 ? 'EAN_13'
             : 'ITF_14';

  const checksumOk =
    type === 'EAN_8' ? validateEAN8(raw) :
    type === 'UPC_A' ? validateUPCA(raw) :
    type === 'EAN_13' ? validateEAN13(raw) :
    true; // ITF-14 often external check

  return { raw, type, checksumOk };
}

/**
 * EAN-8 checksum validation
 */
function validateEAN8(s: string): boolean {
  // weights: 3x on odd indices (0-based), 1x on even → mod 10
  const sum = [...s.slice(0,7)]
    .map((d,i) => (+d) * (i%2===0 ? 3 : 1))
    .reduce((a,b)=>a+b,0);
  const check = (10 - (sum % 10)) % 10;
  return check === +s[7];
}

/**
 * UPC-A checksum validation
 */
function validateUPCA(s: string): boolean {
  const sum = [...s.slice(0,11)]
    .map((d,i) => (+d) * (i%2===0 ? 3 : 1))
    .reduce((a,b)=>a+b,0);
  const check = (10 - (sum % 10)) % 10;
  return check === +s[11];
}

/**
 * EAN-13 checksum validation
 */
function validateEAN13(s: string): boolean {
  const sum = [...s.slice(0,12)]
    .map((d,i) => (+d) * (i%2===0 ? 1 : 3))
    .reduce((a,b)=>a+b,0);
  const check = (10 - (sum % 10)) % 10;
  return check === +s[12];
}

/**
 * OpenFoodFacts lookup by barcode (v2 API first, then v1 fallback)
 */
async function fetchOFF(barcode: string): Promise<any | null> {
  try {
    console.log(`🔍 OpenFoodFacts v2 lookup for barcode: ${barcode}`);
    
    // Try v2 API first
    let response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`);
    let data = await response.json();
    
    if (data.status === 1 && data.product) {
      console.log('✅ OpenFoodFacts v2 hit:', data.product.product_name);
      return { product_found: true, product: data.product };
    }
    
    // Fallback to v1 API
    console.log(`🔄 Trying OpenFoodFacts v1 fallback for barcode: ${barcode}`);
    response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
    data = await response.json();
    
    if (data.status === 1 && data.product) {
      console.log('✅ OpenFoodFacts v1 hit:', data.product.product_name);
      return { product_found: true, product: data.product };
    }
    
    return null;
  } catch (error) {
    console.error('❌ OpenFoodFacts lookup failed:', error);
    return null;
  }
}

/**
 * Map OpenFoodFacts product to BackendResponse
 */
function mapOFFtoBackendResponse(product: any): BackendResponse {
  const ingredients = product.ingredients_text ? 
    product.ingredients_text.split(',').map((ing: string) => ing.trim()) : [];
    
  const flags = generateHealthFlags(ingredients, false);
  const healthScore = calculateHealthScore(flags, false, true);
  
  return {
    productName: `${product.brands || ''} ${product.product_name || ''}`.trim() || "Unknown Product",
    healthScore,
    healthFlags: flags,
    nutritionSummary: generateNutritionData(product.nutriments),
    ingredients,
    recommendations: generateRecommendations(flags)
  };
}

/**
 * Map OpenFoodFacts product to LogProduct for direct Log UI consumption
 */
function mapOFFtoLogProduct(product: any, barcode: string): LogProduct {
  const n = product?.nutriments ?? {};

  // Serving math - prefer serving data, fallback to 100g
  const perServing = product?.nutrition_data_per === 'serving';
  const pick = (key100: string, keyServ: string) =>
    perServing ? n[keyServ] ?? n[key100] : n[key100];

  const kcal = pick('energy-kcal_100g','energy-kcal_serving') ??
               (pick('energy_100g','energy_serving') && 
                 Number(pick('energy_100g','energy_serving')) / 4.184);

  const nutrition = {
    calories: kcal ? Math.round(Number(kcal)) : 0,
    protein_g: num(pick('proteins_100g','proteins_serving')) || 0,
    carbs_g: num(pick('carbohydrates_100g','carbohydrates_serving')) || 0,
    fat_g: num(pick('fat_100g','fat_serving')) || 0,
    fiber_g: num(pick('fiber_100g','fiber_serving')) || 0,
    sugar_g: num(pick('sugars_100g','sugars_serving')) || 0,
      sodium_mg: (toMg(num(pick('sodium_100g','sodium_serving'))) 
                 ?? fromSaltToSodiumMg(num(pick('salt_100g','salt_serving')))) || 0
  };

  // Parse ingredients
  const ingredients = parseIngredients(product);

  // Generate health flags
  const health = generateHealthFlags(ingredients, nutrition);

  const logProduct: LogProduct = {
    productName: product?.product_name || product?.generic_name || 'Unknown product',
    barcode,
    imageUrl: product?.image_front_small_url || product?.image_url,
    nutrition,
    ingredients,
    health
  };

  function num(v: any) { return v == null ? undefined : Number(v); }
  function toMg(g?: number) { return g == null ? undefined : Math.round(g * 1000); }
  function fromSaltToSodiumMg(g?: number) { return g == null ? undefined : Math.round(g * 1000 * 0.393); }

  function parseIngredients(p: any): string[] {
    // Try ingredients array first
    if (Array.isArray(p?.ingredients)) {
      return p.ingredients.map((i: any) => i.text || i.id || String(i)).filter(Boolean);
    }
    
    // Fallback to ingredients_text with various locale attempts
    const textOptions = [
      p?.ingredients_text_en,
      p?.ingredients_text,
      p?.ingredients_text_fr,
      p?.ingredients_text_es
    ].filter(Boolean);

    if (textOptions.length > 0) {
      const text = textOptions[0];
      return text.split(/[·•,;()\[\]]/)
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 0);
    }
    
    return [];
  }

  function generateHealthFlags(ingredients: string[], nutrition: any): { score: number; flags: any[] } {
    const flags: any[] = [];
    const ingredientText = ingredients.join(' ').toLowerCase();

    // High sugar flag (warning) - per serving
    if (nutrition.sugar_g >= 22.5) {
      flags.push({
        id: 'high_sugar',
        label: 'High Sugar',
        level: 'warning',
        emoji: '🍭',
        details: 'High in added sugars; limit portion size.'
      });
    }

    // High sodium flag (warning) - per serving  
    if (nutrition.sodium_mg >= 600) {
      flags.push({
        id: 'high_sodium',
        label: 'High Sodium',
        level: 'warning',
        emoji: '🧂',
        details: 'High sodium content may contribute to high blood pressure.'
      });
    }

    // Good fiber flag
    if (nutrition.fiber_g >= 5) {
      flags.push({
        id: 'good_fiber',
        label: 'Good Fiber',
        level: 'good',
        emoji: '🌾',
        details: 'Good source of dietary fiber.'
      });
    }

    // Artificial colors detection
    const artificialColors = ['red 40', 'yellow 5', 'yellow 6', 'blue 1', 'blue 2'];
    const hasArtificialColors = artificialColors.some(color => 
      ingredientText.includes(color) || ingredientText.includes(color.replace(' ', ''))
    );
    
    if (hasArtificialColors || ingredientText.includes('artificial color')) {
      flags.push({
        id: 'artificial_colors',
        label: 'Artificial Colors',
        level: 'warning',
        emoji: '🎨',
        details: 'Contains artificial colors (e.g., Red 40, Yellow 5/6, Blue 1).'
      });
    }

    // Preservatives detection
    const preservatives = ['bha', 'bht', 'sodium benzoate', 'potassium sorbate', 'tbhq'];
    const hasPreservatives = preservatives.some(pres => ingredientText.includes(pres));
    
    if (hasPreservatives) {
      flags.push({
        id: 'preservatives',
        label: 'Preservatives',
        level: 'warning',
        emoji: '⚗️',
        details: 'Contains preservatives - some linked to allergic reactions.'
      });
    }

    // Calculate health score
    let score = 80; // Base score
    flags.forEach(flag => {
      switch (flag.level) {
        case 'danger':
          score -= 20;
          break;
        case 'warning':
          score -= 10;
          break;
        case 'good':
          score += 5;
          break;
      }
    });

    score = Math.max(0, Math.min(100, score));

    return { score, flags };
  }

  return logProduct;
}

/**
 * Process vision providers with timeout, abort signal support, and logging
 */
async function processVisionProviders(
  imageBase64: string, 
  provider: string, 
  steps: Array<{stage: string; ok: boolean; meta?: any}>,
  abortSignal?: AbortSignal
): Promise<{
  text: string; 
  cleanedTokens: string[]; 
  brandTokens: string[]; 
  hasCandy: boolean;
  fuzzyBrands: Array<{ token: string; brand: string; confidence: number }>;
  ocrConfidence: number;
  logoBrands?: string[];
}> {
  
  const withTimeout = <T>(promise: Promise<T>, ms = 8000): Promise<T> =>
    Promise.race([
      promise,
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('TIMEOUT')), ms)
      )
    ]);
  
  let aggregated = {
    text: '',
    cleanedTokens: [] as string[],
    brandTokens: [] as string[], 
    hasCandy: false,
    fuzzyBrands: [] as Array<{ token: string; brand: string; confidence: number }>,
    ocrConfidence: 0,
    logoBrands: [] as string[]
  };
  
  // Google Vision branch
  if (provider === 'google' || provider === 'hybrid') {
    const googleApiKey = Deno.env.get('GOOGLE_VISION_API_KEY');
    if (!googleApiKey) {
      steps.push({ stage: 'google', ok: false, meta: { code: 'MISSING_KEY' }});
    } else {
      try {
        console.log('[VISION] start: google');
        const result = await withTimeout(extractAndCleanOCR(imageBase64, abortSignal));
        
        // Check if cancelled
        if (abortSignal?.aborted) {
          steps.push({ stage: 'google', ok: false, meta: { code: 'CANCELLED' }});
          return aggregated;
        }
        
        // Check if parsing succeeded and join brand tokens using comprehensive system
        const google_ok = result.text.length > 0 && result.ocrConfidence > 0;
        
        // Apply comprehensive brand normalization to Google results
        const brandNormResult = normalizeBrandComprehensive({
          ocrTokens: result.cleanedTokens,
          logoBrands: result.logoBrands || []
        });
        
        steps.push({ 
          stage: 'ocr', 
          ok: result.text.length > 0, 
          meta: { 
            chars: result.text.length, 
            topTokens: result.cleanedTokens.slice(0, 10),
            brandGuess: brandNormResult.brandGuess,
            brandConfidence: brandNormResult.confidence
          }
        });
        
        steps.push({ 
          stage: 'logo', 
          ok: result.logoBrands?.length > 0 || result.brandTokens.length > 0, 
          meta: { 
            logoBrands: result.logoBrands?.length || 0,
            ocrBrands: result.brandTokens.length 
          }
        });
        
        console.log('[VISION] end: google', { 
          ok: google_ok 
        });
        
        if (google_ok) {
          aggregated = {
            text: result.text,
            cleanedTokens: result.cleanedTokens,
            brandTokens: result.brandTokens,
            hasCandy: result.hasCandy,
            fuzzyBrands: result.fuzzyBrands,
            ocrConfidence: result.ocrConfidence,
            logoBrands: result.logoBrands || [],
            brandGuess: brandNormResult.brandGuess,
            brandConfidence: brandNormResult.confidence
          };
          return aggregated;
        }
        
      } catch (error: any) {
        if (abortSignal?.aborted || error.name === 'AbortError') {
          steps.push({ stage: 'google', ok: false, meta: { code: 'CANCELLED' }});
        } else if (error.message === 'TIMEOUT') {
          steps.push({ stage: 'timeout', ok: false, meta: { provider: 'google', ms: 8000 }});
        } else {
          steps.push({ stage: 'google', ok: false, meta: { error: error.message }});
        }
      }
    }
  }
  
  // OpenAI Vision branch (fallback or only)
  if (provider === 'openai' || provider === 'hybrid') {
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      steps.push({ stage: 'openai', ok: false, meta: { code: 'MISSING_KEY' }});
    } else {
      try {
        console.log('[VISION] start: openai', { model: 'gpt-4o-mini' });
        const result = await withTimeout(extractWithOpenAI(imageBase64, openaiApiKey, abortSignal));
        
        // Check if cancelled
        if (abortSignal?.aborted) {
          steps.push({ stage: 'openai', ok: false, meta: { code: 'CANCELLED' }});
          return aggregated;
        }
        
        // Apply comprehensive brand normalization to OpenAI results
        const brandNormResult = normalizeBrandComprehensive({
          ocrTokens: [],  // OpenAI doesn't provide OCR tokens
          logoBrands: result.logoBrands || [],
          llmGuess: result.brandTokens?.[0] || '' // Use first brand token as LLM guess
        });
        
        // Check if parsing succeeded
        const openai_ok = result.text.length > 0 && result.ocrConfidence > 0;
        
        steps.push({ 
          stage: 'openai', 
          ok: openai_ok, 
          meta: { 
            model: 'gpt-4o-mini', 
            brand: brandNormResult.brandGuess || result.brandTokens[0] || '', 
            confidence: result.ocrConfidence,
            brandConfidence: brandNormResult.confidence
          }
        });
        
        // Add openai_parse step tracking
        if (result.ocrConfidence === 0 && result.brandTokens.length === 0) {
          steps.push({
            stage: 'openai_parse', 
            ok: false, 
            meta: { error: 'json_parse_failed' }
          });
        } else {
          steps.push({
            stage: 'openai_parse', 
            ok: true, 
            meta: { 
              confidence: result.ocrConfidence,
              brandGuess: brandNormResult.brandGuess,
              brandConfidence: brandNormResult.confidence
            }
          });
        }
        
        console.log('[VISION] end: openai', { 
          ok: openai_ok, 
          model: 'gpt-4o-mini',
          brandGuess: brandNormResult.brandGuess
        });
        
        if (openai_ok) {
          aggregated = {
            text: result.text,
            cleanedTokens: result.cleanedTokens,
            brandTokens: brandNormResult.brandGuess ? [brandNormResult.brandGuess] : result.brandTokens,
            hasCandy: result.hasCandy,
            fuzzyBrands: result.fuzzyBrands,
            ocrConfidence: result.ocrConfidence,
            logoBrands: result.logoBrands || [],
            brandGuess: brandNormResult.brandGuess,
            brandConfidence: brandNormResult.confidence
          };
          return aggregated;
        }
        
      } catch (error: any) {
        if (abortSignal?.aborted || error.name === 'AbortError') {
          steps.push({ stage: 'openai', ok: false, meta: { code: 'CANCELLED' }});
        } else if (error.message === 'TIMEOUT') {
          steps.push({ stage: 'timeout', ok: false, meta: { provider: 'openai', ms: 8000 }});
        } else {
          steps.push({ stage: 'openai', ok: false, meta: { error: error.message }});
        }
      }
    }
  }
  
  return aggregated;
}

/**
 * Sanitize JSON response from OpenAI by removing code fences and extracting valid JSON
 */
function sanitizeJsonResponse(content: string): string {
  // Remove code fences and backticks
  let sanitized = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').replace(/`/g, '');
  
  // Extract the first valid JSON object {...}
  const jsonMatch = sanitized.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/);
  
  if (jsonMatch) {
    return jsonMatch[0];
  }
  
  // If no JSON block found, try to find a JSON array [...]
  const arrayMatch = sanitized.match(/\[[^\[\]]*(?:\[[^\[\]]*\][^\[\]]*)*\]/);
  
  if (arrayMatch) {
    return arrayMatch[0];
  }
  
  // Return original if no patterns match
  return sanitized.trim();
}

/**
 * Extract using OpenAI Vision
 */
async function extractWithOpenAI(imageBase64: string, apiKey: string, abortSignal?: AbortSignal): Promise<{
  text: string; 
  cleanedTokens: string[]; 
  brandTokens: string[]; 
  hasCandy: boolean;
  fuzzyBrands: Array<{ token: string; brand: string; confidence: number }>;
  ocrConfidence: number;
  logoBrands?: string[];
  brandGuess?: string;
  brandConfidence?: number;
}> {
  try {
    // CRITICAL HOTFIX: Ensure we send a data URL with prefix
    const imageUrl = `data:image/jpeg;base64,${imageBase64}`;
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: abortSignal,
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        detail: 'low',
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "product_analysis",
            schema: {
              type: "object",
              properties: {
                brand: { type: "string", description: "Brand name detected" },
                product: { type: "string", description: "Product name detected" },
                confidence: { type: "number", minimum: 0, maximum: 1, description: "Confidence in detection" }
              },
              required: ["brand", "product", "confidence"],
              additionalProperties: false
            },
            strict: true
          }
        },
        messages: [{
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Analyze this food product image and identify the brand and product name. Return JSON with brand, product, and confidence (0-1).'
            },
            {
              type: 'image_url', 
              image_url: { url: imageUrl }
            }
          ]
        }],
        max_tokens: 64
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API ${response.status}: ${await response.text()}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    // Extract and normalize brand from response
    if (content) {
      try {
        const parsed = JSON.parse(content);
        const rawBrand = (parsed.brand || '').toLowerCase().trim();
        
        // Apply comprehensive brand normalization
        const brandNormResult = normalizeBrandComprehensive({
          ocrTokens: [],
          logoBrands: [],
          llmGuess: rawBrand
        });
        
        const normalizedBrand = brandNormResult.brandGuess || rawBrand;
        const product = parsed.product || '';
        const confidence = parsed.confidence || 0;
        
        // Combine brand and product as full text
        const text = `${normalizedBrand} ${product}`.trim();
        
        // Process like Google OCR
        const normalized = text.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
        const tokens = normalized.split(/\s+/).filter(token => token.length > 2 && !STOP_WORDS.has(token));
        const brandTokens = normalizedBrand ? [normalizedBrand] : [];
        
        return {
          text,
          cleanedTokens: tokens,
          brandTokens,
          hasCandy: tokens.some(token => CANDY_KEYWORDS.has(token)),
          fuzzyBrands: [],
          ocrConfidence: confidence,
          brandGuess: brandNormResult.brandGuess,
          brandConfidence: brandNormResult.confidence
        };
      } catch (parseError) {
        console.error('❌ OpenAI JSON parsing failed:', parseError);
        // If JSON parse fails, extract any text from the raw response as brand candidates
        const words = content.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
        return {
          text: content,
          cleanedTokens: words,
          brandTokens: words.slice(0, 2), // Take first 2 words as potential brands
          hasCandy: words.some(word => CANDY_KEYWORDS.has(word)),
          fuzzyBrands: [],
          ocrConfidence: 0,
          brandGuess: undefined,
          brandConfidence: 0
        };
      }
    }
    
    throw new Error('No content from OpenAI');
  } catch (error) {
    console.error('❌ OpenAI Vision extraction failed:', error);
    return { 
      text: '', 
      cleanedTokens: [], 
      brandTokens: [], 
      hasCandy: false, 
      fuzzyBrands: [], 
      ocrConfidence: 0,
      brandGuess: undefined,
      brandConfidence: 0
    };
  }
}

/**
 * Extract and clean OCR text (Google Vision) with Logo Detection and language hints
 */
async function extractAndCleanOCR(imageBase64: string, abortSignal?: AbortSignal): Promise<{ 
  text: string; 
  cleanedTokens: string[]; 
  brandTokens: string[]; 
  hasCandy: boolean;
  fuzzyBrands: Array<{ token: string; brand: string; confidence: number }>;
  ocrConfidence: number;
  logoBrands: string[];
}> {
  try {
    const apiKey = Deno.env.get('GOOGLE_VISION_API_KEY');
    if (!apiKey) {
      throw new Error('Google Vision API key not configured');
    }

    // Check if aborted
    if (abortSignal?.aborted) {
      throw new Error('Request aborted');
    }

    // CRITICAL HOTFIX: Single annotate call with TEXT_DETECTION + LOGO_DETECTION + language hints
    const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: abortSignal,
      body: JSON.stringify({
        requests: [{
          image: { content: imageBase64 }, // Pass raw base64, no double encoding
          features: [
            { type: 'TEXT_DETECTION', maxResults: 1 },
            { type: 'LOGO_DETECTION', maxResults: 5 }
          ],
          imageContext: {
            languageHints: ['en', 'en-US'] // Add language hints for better OCR
          }
        }]
      })
    });

    const result = await response.json();
    const rawText = result.responses?.[0]?.textAnnotations?.[0]?.description || '';
    const logos = result.responses?.[0]?.logoAnnotations || [];
    
    // Extract logo brands
    const logoBrands = logos.map((logo: any) => logo.description?.toLowerCase()).filter(Boolean);
    
    // Calculate OCR confidence from response
    const ocrConfidence = result.responses?.[0]?.textAnnotations?.[0]?.confidence || 0.5;
    
    // Normalize: lowercase, strip punctuation, collapse whitespace
    const normalized = rawText
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Remove stop-words and packaging tokens
    const tokens = normalized.split(/\s+/)
      .filter(token => token.length > 2 && !STOP_WORDS.has(token));
    
    // Extract exact brand matches (legacy)
    const exactBrandTokens = tokens.filter(token => BRAND_LEXICON.has(token));
    
    // Extract fuzzy brand matches
    const fuzzyBrands = extractBrandTokensWithFuzzy(tokens);
    
    // Combine exact, fuzzy, and logo brands
    const allBrandTokens = [...exactBrandTokens];
    
    // Add logo brands if they're trusted (in lexicon or appear in OCR)
    logoBrands.forEach(logoBrand => {
      if (BRAND_LEXICON.has(logoBrand) || normalized.includes(logoBrand)) {
        if (!allBrandTokens.includes(logoBrand)) {
          allBrandTokens.push(logoBrand);
        }
      }
    });
    
    // Add high-confidence fuzzy matches
    fuzzyBrands.forEach(match => {
      if (match.confidence >= 0.6 && !allBrandTokens.includes(match.token)) {
        allBrandTokens.push(match.token);
      }
    });
    
    // Enhanced candy detection
    const hasCandy = tokens.some(token => CANDY_KEYWORDS.has(token)) ||
                    fuzzyBrands.some(match => match.brand.includes('candy') || match.brand.includes('chocolate'));
    
    console.log('📝 OCR+Logo processed:', { 
      rawLength: rawText.length, 
      tokens: tokens.length, 
      brandTokens: allBrandTokens, 
      logoBrands: logoBrands.length,
      fuzzyMatches: fuzzyBrands.length,
      hasCandy,
      ocrConfidence
    });
    
    return { 
      text: rawText,
      cleanedTokens: tokens, 
      brandTokens: allBrandTokens, 
      hasCandy,
      fuzzyBrands,
      ocrConfidence,
      logoBrands
    };
  } catch (error) {
    console.error('❌ OCR+Logo extraction failed:', error);
    return { 
      text: '', 
      cleanedTokens: [], 
      brandTokens: [], 
      hasCandy: false,
      fuzzyBrands: [],
      ocrConfidence: 0,
      logoBrands: []
    };
  }
}

/**
 * A) Trust the right evidence - improved evidence fusion
 */
function evaluateLogoEvidence(
  logoBrand: string, 
  ocrLines: string[], 
  brandLexicon: Set<string>
): boolean {
  if (!logoBrand) return false;
  
  const normalizedLogo = logoBrand.toLowerCase().trim();
  const ocrText = ocrLines.join(' ').toLowerCase();
  
  // Only trust logo if it's in our brand lexicon OR appears in OCR text
  return brandLexicon.has(normalizedLogo) || ocrText.includes(normalizedLogo);
}

/**
 * B) Extract the right product phrase from OCR (line-based)
 */
function bestFrontLine(lines: string[]): string {
  const STOPWORDS = /^(organic|natural|non[- ]?gmo|raw|protein|gluten[- ]?free|usda|net|wt|oz|lb|grams?)$/i;
  
  function scoreLine(line: string): number {
    const len = line.length;
    if (len < 10 || len > 40) return 0;
    
    const words = line.toLowerCase().split(/\s+/);
    const capitalRatio = (line.match(/[A-Z]/g) || []).length / len;
    const stopwordRatio = words.filter(w => STOPWORDS.test(w)).length / words.length;
    
    return (capitalRatio * 0.4) + ((40 - Math.abs(25 - len)) / 40 * 0.4) + (1 - stopwordRatio) * 0.2;
  }
  
  return lines
    .map((line) => ({ line, score: scoreLine(line) }))
    .sort((a, b) => b.score - a.score)[0]?.line || '';
}

function normalizeForSearch(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s']/g, ' ')  // Keep apostrophes for "joe's"
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * C) Build N-grams from phrase for search queries
 */
function buildNGrams(phrase: string, options: { min: number; max: number; dropStopwords: boolean }): string[] {
  const words = phrase.split(/\s+/).filter(w => w.length > 0);
  if (options.dropStopwords) {
    const filtered = words.filter(w => !STOP_WORDS.has(w));
    if (filtered.length > 0) words.splice(0, words.length, ...filtered);
  }
  
  const ngrams: string[] = [];
  for (let n = options.min; n <= Math.min(options.max, words.length); n++) {
    for (let i = 0; i <= words.length - n; i++) {
      ngrams.push(words.slice(i, i + n).join(' '));
    }
  }
  
  return ngrams.sort((a, b) => b.length - a.length); // Prefer longer phrases
}

/**
 * D) Fuzzy string matching for ranking
 */
function fuzzyScore(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();
  
  // Exact match
  if (s1 === s2) return 1.0;
  
  // Substring match
  if (s1.includes(s2) || s2.includes(s1)) {
    return Math.max(s1.length, s2.length) / (s1.length + s2.length);
  }
  
  // Word overlap
  const words1 = new Set(s1.split(/\s+/));
  const words2 = new Set(s2.split(/\s+/));
  const intersection = [...words1].filter(w => words2.has(w)).length;
  const union = new Set([...words1, ...words2]).size;
  
  return intersection / union;
}

/**
 * C) Query cascade for OpenFoodFacts with comprehensive search
 */
async function searchWithQueryCascade(
  brand: string,
  phrase: string,
  hasCandy: boolean,
  steps: Array<{stage: string; ok: boolean; meta?: any}>
): Promise<{ results: any[]; queries: Array<{q: string; hits: number}> }> {
  
  // Build N-grams from phrase
  const ngrams = buildNGrams(phrase, { min: 2, max: 4, dropStopwords: true });
  
  // Build query cascade (ordered by priority)
  const queries = [
    brand && ngrams[0] ? `${brand} ${ngrams[0]}` : '',
    brand && ngrams[1] ? `${brand} ${ngrams[1]}` : '',
    brand,
    ngrams[0],
    ngrams[1]
  ].filter(q => q && q.trim().length > 0);
  
  // Deduplicate queries
  const uniqueQueries = [...new Set(queries)];
  
  const queryResults: Array<{q: string; hits: number; products?: any[]}> = [];
  const allResults: any[] = [];
  
  for (const query of uniqueQueries) {
    try {
      console.log(`🔍 Cascade query: "${query}"`);
      
      const searchParams = new URLSearchParams({
        search_terms: query,
        search_simple: '1',
        action: 'process',
        json: '1',
        page_size: '20',
        fields: 'code,product_name,brands,nutriments,ingredients_text,image_front_small_url,image_url'
      });
      
      if (hasCandy) {
        searchParams.set('categories', 'candy,gummies,sweets');
      }
      
      const response = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?${searchParams}`);
      const data = await response.json();
      
      const products = data.products || [];
      queryResults.push({ q: query, hits: products.length, products });
      
      if (products.length > 0) {
        allResults.push(...products);
        // Stop if we have sufficient results
        if (allResults.length >= 5) break;
      }
      
    } catch (error) {
      console.error(`❌ Query "${query}" failed:`, error);
      queryResults.push({ q: query, hits: 0 });
    }
  }
  
  // Log attempted queries for debugging
  steps.push({ 
    stage: 'queries', 
    ok: true, 
    meta: { 
      tried: queryResults.map(r => ({ q: r.q, hits: r.hits }))
    }
  });
  
  return { 
    results: allResults, 
    queries: queryResults.map(r => ({ q: r.q, hits: r.hits }))
  };
}

/**
 * Extract barcode from OCR text using regex patterns
 */
function extractBarcodeFromOCR(text: string): string | null {
  // Look for 8, 12, 13, or 14 digit sequences
  const barcodePattern = /\b(\d{8}|\d{12}|\d{13}|\d{14})\b/g;
  const matches = text.match(barcodePattern);
  
  if (matches) {
    // Return first valid barcode found
    for (const match of matches) {
      const norm = normalizeBarcode(match);
      if (norm && norm.checksumOk) {
        return match;
      }
    }
  }
  
  return null;
}


/**
 * Enhanced health scan with Fix Pack 2 improvements
 */
async function processHealthScanWithCandidates(
  imageBase64: string, 
  reqId: string, 
  provider: string = 'hybrid', 
  steps: Array<{stage: string; ok: boolean; meta?: any}> = []
): Promise<any> {
  const ctx: RequestContext = {
    reqId,
    now: new Date(),
    ocrText: '',
    tokens: [],
    brandTokens: [],
    hasCandy: false,
    plateConf: 0
  };

  // A) Enhanced evidence fusion 
  const visionResult = await processVisionProviders(imageBase64, provider, steps);
  const ocrResult = visionResult; // processVisionProviders now returns full OCR result
  
  // Extract OCR lines for better phrase detection
  const ocrLines = ocrResult.text.split('\n').filter(line => line.trim().length > 0);
  
  // B) Extract the right product phrase from OCR (line-based)
  const keyLine = bestFrontLine(ocrLines);
  const phrase = normalizeForSearch(keyLine);
  
  ctx.ocrText = ocrResult.text;
  ctx.tokens = ocrResult.cleanedTokens;
  ctx.brandTokens = ocrResult.brandTokens;
  ctx.hasCandy = ocrResult.hasCandy;
  
  // A) Evaluate logo evidence (trust the right evidence)
  const logoBrand = ''; // Would come from logo detection if available
  const logoOk = evaluateLogoEvidence(logoBrand, ocrLines, BRAND_LEXICON);
  
  // Enhanced brand selection
  const bestBrand = pickBestBrand(
    ctx.brandTokens[0] || '', 
    logoOk ? logoBrand : '', 
    ocrResult.fuzzyBrands
  );
  
  // Debug logging
  const isDev = Deno.env.get('DENO_ENV') !== 'production';
  if (isDev) {
    console.log(`[ANALYZER DEBUG] [${reqId}]:`, {
      ocrTopTokens: ctx.tokens.slice(0, 10),
      exactBrands: ctx.brandTokens,
      fuzzyBrands: ocrResult.fuzzyBrands,
      ocrConfidence: ocrResult.ocrConfidence,
      hasCandy: ctx.hasCandy,
      textLength: ocrResult.text.length,
      keyLine: keyLine,
      bestBrand: bestBrand,
      logoOk: logoOk
    });
  }
  
  console.log(`📝 OCR analysis [${reqId}]:`, { 
    tokens: ctx.tokens.length, 
    brandTokens: ctx.brandTokens.length, 
    fuzzyBrands: ocrResult.fuzzyBrands?.length || 0,
    hasCandy: ctx.hasCandy,
    keyLine: keyLine.substring(0, 50) + (keyLine.length > 50 ? '...' : '')
  });

  // C) Query cascade for comprehensive search
  if (bestBrand || phrase) {
    const { results, queries } = await searchWithQueryCascade(bestBrand, phrase, ctx.hasCandy, steps);
    
    // D) Rank candidates robustly
    if (results.length > 0) {
      const ranked = results
        .map((product: any) => ({
          ...product,
          score: 0.6 * fuzzyScore(product.brands || '', bestBrand) +
                 0.4 * fuzzyScore(product.product_name || '', phrase)
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
      
      // If top candidate has high confidence, return single product
      if (ranked[0]?.score >= 0.8) {
        console.log(`✅ Single product found [${reqId}]: ${ranked[0].product_name}`);
        const logProduct = mapOFFtoLogProduct(ranked[0], ranked[0].code || '');
        
        if (isDev) {
          console.log(`[ANALYZER DEBUG] Decision: single_product`, {
            productName: logProduct.productName,
            confidence: 'high',
            score: ranked[0].score
          });
        }
        
        return {
          kind: 'single_product',
          product: logProduct,
          productName: logProduct.productName,
          healthScore: logProduct.health?.score || null,
          nutritionSummary: logProduct.nutrition,
          fallback: false,
          provider_used: provider,
          steps
        };
      }
      
      // Return branded candidates
      console.log(`✅ Branded candidates found [${reqId}]: ${ranked.length}`);
      
      if (isDev) {
        console.log(`[ANALYZER DEBUG] Decision: branded_candidates`, {
          candidatesCount: ranked.length,
          topScore: ranked[0]?.score || 0
        });
      }
      
      const candidateList = ranked.map((product: any) => ({
        id: product.code || crypto.randomUUID(),
        name: `${product.brands || ''} ${product.product_name || ''}`.trim() || 'Unknown Product',
        brand: product.brands || '',
        image: product.image_front_small_url || product.image_url || '',
        confidence: Math.min(0.95, Math.max(0.5, product.score))
      }));

      return {
        kind: 'branded_candidates',
        productName: 'Multiple products detected',
        healthScore: null,
        healthFlags: [],
        nutritionSummary: null,
        ingredients: [],
        recommendations: ['Please select the correct product from the list below.'],
        generalSummary: `Found ${candidateList.length} possible matches.`,
        candidates: candidateList,
        fallback: false,
        provider_used: provider,
        steps
      };
    }
  }

  // Enhanced evidence → decision logic: if ANY brand signal exists, return branded_candidates
  const hasAnyBrandSignal = 
    bestBrand || 
    ctx.brandTokens.length > 0 || 
    ocrResult.fuzzyBrands?.some(f => f.confidence >= 0.35) ||
    ocrResult.logoBrands?.length > 0;

  if (hasAnyBrandSignal) {
    if (isDev) {
      console.log(`[ANALYZER DEBUG] Decision: branded_candidates (evidence)`, {
        candidatesCount: 0,
        evidence: { 
          bestBrand, 
          brandTokens: ctx.brandTokens.length,
          fuzzyBrands: ocrResult.fuzzyBrands?.filter(f => f.confidence >= 0.35).length || 0,
          logoBrands: ocrResult.logoBrands?.length || 0
        }
      });
    }
    
    return {
      kind: 'branded_candidates',
      productName: 'Product detected but needs confirmation',
      healthScore: null,
      healthFlags: [],
      nutritionSummary: null,
      ingredients: [],
      recommendations: ['Please search manually with the suggested terms below.'],
      generalSummary: 'We detected some product information but need your help to identify it.',
      candidates: [],
      suggest: { brand: bestBrand, phrase: phrase },
      fallback: false,
      provider_used: provider,
      steps
    };
  }

  // Check if this looks like a meal/plate
  ctx.plateConf = calculatePlateConfidence(ctx.tokens);
  
  if (ctx.plateConf >= 0.3) {
    if (isDev) {
      console.log(`[ANALYZER DEBUG] Decision: meal`, {
        plateConfidence: ctx.plateConf,
        evidence: 'food_keywords'
      });
    }
    
    return {
      kind: 'meal',
      productName: 'Meal detected',
      healthScore: null,
      healthFlags: [],
      nutritionSummary: null,
      ingredients: [],
      recommendations: ['This looks like a meal. Use the meal analysis feature.'],
      generalSummary: 'Detected what appears to be a prepared meal or multiple food items.',
      fallback: false
    };
  }

  // Only return 'none' for truly empty images
  if (isDev) {
    console.log(`[ANALYZER DEBUG] Decision: none`, {
      ocrLength: ctx.ocrText.length,
      tokens: ctx.tokens.length,
      evidence: 'insufficient'
    });
  }
  
  return {
    kind: 'none',
    productName: 'Unknown product',
    healthScore: null,
    healthFlags: [],
    nutritionSummary: {},
    ingredients: [],
    recommendations: [
      'Try scanning the barcode on the back of the package.',
      'Or type the exact brand & product name (e.g., "Trader Joe\'s Vanilla Almond Granola").'
    ],
    generalSummary: 'We could not confidently identify this item from the photo.',
    fallback: true
  };
}

/**
 * Helper function to pick the best brand from available evidence
 */
function pickBestBrand(
  exactBrand: string,
  logoBrand: string, 
  fuzzyBrands: Array<{ token: string; brand: string; confidence: number }>
): string {
  // Prefer exact brand match
  if (exactBrand) return exactBrand;
  
  // Then logo brand if validated
  if (logoBrand) return logoBrand;
  
  // Finally, best fuzzy match with high confidence
  const bestFuzzy = fuzzyBrands
    ?.filter(f => f.confidence >= 0.7)
    .sort((a, b) => b.confidence - a.confidence)[0];
    
  return bestFuzzy?.brand || '';
}

/**
 * Calculate plate confidence (mock implementation)
 */
function calculatePlateConfidence(tokens: string[]): number {
  const foodKeywords = ['chicken', 'rice', 'vegetables', 'salad', 'pasta', 'bread', 'meat'];
  const matches = tokens.filter(token => foodKeywords.includes(token)).length;
  return Math.min(0.9, matches * 0.3);
}

/**
 * Generate health flags from ingredients
 */
function generateHealthFlags(ingredients: string[], hasCandy: boolean): any[] {
  const flags: any[] = [];
  const ingredientText = ingredients.join(' ').toLowerCase();

  // Candy-specific flags (only when hasCandy is true)
  if (hasCandy) {
    flags.push({
      type: 'warning',
      icon: '🍭',
      title: 'Added Sugars High',
      description: 'High in added sugars; limit portion size.'
    });
    
    // Only add colors flag if ingredients suggest colors
    if (ingredientText.includes('color') || ingredientText.includes('red') || ingredientText.includes('yellow')) {
      flags.push({
        type: 'warning',
        icon: '🎨',
        title: 'Artificial Colors',
        description: 'Contains artificial colors (e.g., Red 40, Yellow 5/6, Blue 1).'
      });
    }
  }

  // Check for dangerous ingredients
  HEALTH_RULES.additives.artificial_colors.forEach(color => {
    if (ingredientText.includes(color)) {
      flags.push({
        type: 'danger',
        icon: '🎨',
        title: 'Artificial Colors',
        description: `Contains ${color} - linked to hyperactivity in children`
      });
    }
  });

  // Check for preservatives
  HEALTH_RULES.additives.preservatives.forEach(preservative => {
    if (ingredientText.includes(preservative)) {
      flags.push({
        type: 'warning',
        icon: '⚗️',
        title: 'Preservatives',
        description: `Contains ${preservative} - some linked to allergic reactions`
      });
    }
  });

  // Check for artificial sweeteners
  HEALTH_RULES.additives.sweeteners.forEach(sweetener => {
    if (ingredientText.includes(sweetener)) {
      flags.push({
        type: 'danger',
        icon: '🧪',
        title: 'Artificial Sweeteners',
        description: `Contains ${sweetener} - may disrupt gut microbiome`
      });
    }
  });

  return flags;
}

/**
 * Calculate health score with confidence gating
 */
function calculateHealthScore(flags: any[], hasCandy: boolean, hasStrongEvidence: boolean): number | null {
  if (!hasStrongEvidence) {
    return null; // No score without confidence
  }
  
  let score = hasCandy ? 3.0 : 7.0; // Lower base for candy
  
  flags.forEach(flag => {
    switch (flag.type) {
      case 'danger':
        score -= 2.0;
        break;
      case 'warning':
        score -= 1.0;
        break;
      case 'good':
        score += 1.0;
        break;
    }
  });
  
  return Math.max(0, Math.min(10, score));
}

function generateNutritionData(nutriments: any): any {
  if (!nutriments) return null;
  
  const nutritionData: any = {};
  
  if (nutriments.energy_kcal_100g) nutritionData.calories = Math.round(nutriments.energy_kcal_100g);
  if (nutriments.fat_100g) nutritionData.fat = parseFloat(nutriments.fat_100g.toFixed(1));
  if (nutriments.carbohydrates_100g) nutritionData.carbs = parseFloat(nutriments.carbohydrates_100g.toFixed(1));
  if (nutriments.proteins_100g) nutritionData.protein = parseFloat(nutriments.proteins_100g.toFixed(1));
  if (nutriments.sodium_100g) nutritionData.sodium = parseFloat((nutriments.sodium_100g / 1000).toFixed(3));
  if (nutriments.fiber_100g) nutritionData.fiber = parseFloat(nutriments.fiber_100g.toFixed(1));
  if (nutriments.sugars_100g) nutritionData.sugar = parseFloat(nutriments.sugars_100g.toFixed(1));
  
  return Object.keys(nutritionData).length > 0 ? nutritionData : null;
}

function generateHealthSummary(flags: any[], score: number | null): string {
  if (score === null) {
    return "Unable to provide health assessment - insufficient product information";
  }
  
  const dangerFlags = flags.filter(f => f.type === 'danger').length;
  const warningFlags = flags.filter(f => f.type === 'warning').length;
  
  if (dangerFlags > 0) {
    return `Product contains ${dangerFlags} concerning ingredient${dangerFlags > 1 ? 's' : ''} that may pose health risks.`;
  } else if (warningFlags > 0) {
    return `Product has ${warningFlags} ingredient${warningFlags > 1 ? 's' : ''} worth noting for dietary awareness.`;
  } else {
    return "No major concerning ingredients identified in this product.";
  }
}

function generateRecommendations(flags: any[]): string[] {
  const recommendations: string[] = [];
  
  if (flags.some(f => f.type === 'danger')) {
    recommendations.push('Consider limiting consumption frequency');
    recommendations.push('Look for alternatives with cleaner ingredient lists');
  } else if (flags.some(f => f.type === 'warning')) {
    recommendations.push('Consume in moderation as part of a balanced diet');
    recommendations.push('Be mindful of portion sizes');
  } else {
    recommendations.push('This product appears to have a relatively clean ingredient profile');
    recommendations.push('Continue to read labels and make informed choices');
  }
  
  return recommendations;
}

/**
 * Process health scan with barcode-first logic and confidence gating
 */
async function processHealthScan(imageBase64: string, detectedBarcode?: string | null): Promise<BackendResponse> {
  const ctx: RequestContext = {
    reqId: crypto.randomUUID().substring(0, 8),
    now: new Date(),
    ocrText: '',
    tokens: [],
    brandTokens: [],
    hasCandy: false,
    plateConf: 0
  };
  
  console.log(`🚀 Processing health scan [${ctx.reqId}]`);
  
  let barcodeHit = false;
  let nameHit = false;
  let offProduct: any = null;
  
  // Step 1: Barcode first (highest priority) - use client-detected barcode
  const barcodeNorm = normalizeBarcode(detectedBarcode);
  if (barcodeNorm) {
    ctx.barcodeFound = barcodeNorm.raw;
    const offResult = await fetchOFF(barcodeNorm.raw);
    if (offResult?.product_found) {
      offProduct = offResult.product;
      barcodeHit = true;
      ctx.offHit = true;
      
      console.log(`✅ Barcode success [${ctx.reqId}]`, { 
        barcode: barcodeNorm.raw, 
        product: offProduct.product_name 
      });
      
      return mapOFFtoBackendResponse(offProduct);
    }
  }
  
  // Step 2: OCR cleanup
  const ocrResult = await extractAndCleanOCR(imageBase64);
  ctx.ocrText = ocrResult.text;
  ctx.tokens = ocrResult.cleanedTokens;
  ctx.brandTokens = ocrResult.brandTokens;
  ctx.hasCandy = ocrResult.hasCandy;
  
  // Step 3: Brand-gated name search (only with brand evidence)
  if (ctx.brandTokens.length > 0 || ocrResult.fuzzyBrands?.some(m => m.confidence >= 0.6)) {
    offProduct = await searchByBrandAndName(ctx.brandTokens, ctx.hasCandy, ocrResult.fuzzyBrands);
    if (offProduct) {
      nameHit = true;
      ctx.offHit = true;
      
      console.log(`✅ Name search success [${ctx.reqId}]`, { 
        brand: ctx.brandTokens, 
        product: offProduct.product_name 
      });
      
      return mapOFFtoBackendResponse(offProduct);
    }
  }
  
  // Step 4: Plate confidence calculation
  ctx.plateConf = calculatePlateConfidence(ctx.tokens);
  
  // Step 5: Confidence gating
  const hasStrongEvidence = barcodeHit || nameHit || ctx.plateConf >= 0.85;
  
  if (!hasStrongEvidence) {
    console.log(`❌ Low confidence [${ctx.reqId}]`, { 
      barcodeHit, nameHit, plateConf: ctx.plateConf, 
      evidence: 'insufficient' 
    });
    
    return {
      productName: 'Unknown product',
      healthScore: null,
      healthFlags: [],
      nutritionSummary: {},
      ingredients: [],
      recommendations: [
        'Try scanning the barcode on the back of the package.',
        'Or type the exact brand & product name (e.g., "Trader Joe\'s Vanilla Almond Granola").'
      ],
      generalSummary: 'We could not confidently identify this item from the photo.',
      fallback: true
    };
  }
  
  // Step 6: Generate result with evidence
  const flags = generateHealthFlags([], ctx.hasCandy);
  const healthScore = calculateHealthScore(flags, ctx.hasCandy, hasStrongEvidence);
  
  // Final logging
  console.log(JSON.stringify({
    reqId: ctx.reqId,
    phase: 'done', 
    barcodeFound: !!ctx.barcodeFound,
    offHit: ctx.offHit || false,
    brand: ctx.brandTokens.join(',') || 'none',
    plateConf: ctx.plateConf,
    scored: healthScore !== null,
    productName: 'Detected Food',
    latencyMs: Date.now() - ctx.now.getTime()
  }));
  
  return {
    productName: "Detected Food",
    healthScore,
    healthFlags: flags,
    nutritionSummary: null,
    ingredients: [],
    recommendations: generateRecommendations(flags),
    generalSummary: generateHealthSummary(flags, healthScore)
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const reqId = crypto.randomUUID().substring(0, 8);
  const t0 = Date.now();
  const steps: Array<{stage: string, ok: boolean, meta?: any}> = [];
  
  // Timeout helper
  const withTimeout = <T>(promise: Promise<T>, ms = 8000): Promise<T> =>
    Promise.race([
      promise,
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('TIMEOUT')), ms)
      )
    ]);

  try {
    const body = await req.json();
    const { provider: requestProvider } = body;
    
    // Provider toggle 
    const provider = requestProvider ?? Deno.env.get('ANALYZER_PROVIDER') ?? 'hybrid';
    console.log(`🚀 Processing health scan [${reqId}] with provider: ${provider}`);
    
    // Camera echo step with provider info
    steps.push({
      stage: 'camera_echo', 
      ok: true, 
      meta: {
        reqId, 
        mode: body.mode,
        provider,
        dataLen: (body.imageBase64 || '').length
      }
    });

    // Handle barcode mode for Log scanner
    if (body.mode === 'barcode' && body.barcode) {
      const norm = normalizeBarcode(body.barcode);
      if (!norm) {
        return new Response(JSON.stringify({ 
          ok: false, 
          reason: 'invalid_barcode' 
        }), { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      console.log(`🔍 Processing barcode [${reqId}]: ${norm.raw} (${norm.type})`);
      
      const offResult = await fetchOFF(norm.raw).catch(e => ({ 
        error: true, 
        status: 500, 
        message: String(e) 
      }));
      
      if (offResult?.error) {
        console.log(`❌ OFF error [${reqId}]:`, offResult.message);
        steps.push({stage: 'resolver_off', ok: false, meta: {code: 'off_error', msg: offResult.message}});
        return new Response(JSON.stringify({ 
          ok: false, 
          reason: 'off_error', 
          status: offResult.status,
          steps
        }), { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }
      
      if (!offResult?.product_found) {
        console.log(`❌ OFF miss [${reqId}]: ${norm.type} not found`);
        steps.push({stage: 'resolver_off', ok: false, meta: {reason: 'off_miss'}});
        return new Response(JSON.stringify({ 
          ok: false, 
          reason: 'off_miss',
          steps
        }), { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      // Transform OpenFoodFacts product to LogProduct
      const logProduct = mapOFFtoLogProduct(offResult.product, norm.raw);
      steps.push({stage: 'resolver_off', ok: true, meta: {productName: logProduct.productName}});
      console.log('✅ OFF hit [' + reqId + ']: ' + logProduct.productName);
        return new Response(
          JSON.stringify({ ok: true, product: logProduct, provider_used: provider, steps }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
    
    // Step 1: Original barcode-first logic for Health Scan
    if (body.detectedBarcode) {
      const norm = normalizeBarcode(body.detectedBarcode);
      
      if (norm) {
        console.log(`🔍 Processing barcode [${reqId}]: ${norm.raw} (${norm.type})`);
        
        // Try OpenFoodFacts lookup
        const offResult = await fetchOFF(norm.raw);
        if (offResult?.product_found) {
          steps.push({stage: 'resolver_off', ok: true, meta: {productName: offResult.product.product_name}});
          console.log(JSON.stringify({
            reqId, 
            phase: 'barcode-first', 
            detectedBarcode: norm.raw, 
            validBarcode: true, 
            offHit: true, 
            productName: offResult.product.product_name,
            scored: true,
            brandConf: null,
            plateConf: null,
            latencyMs: Date.now() - t0
          }));
          
          return new Response(
            JSON.stringify(mapOFFtoBackendResponse(offResult.product)),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          // Valid barcode but no OFF match
          steps.push({stage: 'resolver_off', ok: false, meta: {reason: 'barcode_not_found'}});
          console.log(JSON.stringify({
            reqId, 
            phase: 'barcode-first', 
            detectedBarcode: norm.raw, 
            validBarcode: true, 
            offHit: false, 
            productName: 'unknown',
            scored: false,
            brandConf: null,
            plateConf: null,
            latencyMs: Date.now() - t0
          }));
          
          return new Response(
            JSON.stringify({
              productName: 'Unknown product',
              healthScore: null,
              healthFlags: [],
              nutritionSummary: null,
              ingredients: [],
              recommendations: [
                'Try scanning the barcode on the back of the package.',
                'Or type the exact brand & product name (e.g., "Trader Joe\'s Vanilla Almond Granola").'
              ],
              generalSummary: 'Barcode detected but no product information found.',
              fallback: true
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }
    
    // Step 2: Proceed with image analysis if no barcode or barcode failed
    if (!body.imageBase64) {
      throw new Error('No image data provided');
    }

    // Step 2: Check if image has barcode first (provider-controlled OCR)
    console.debug('[ANALYZE IMG]', { bytes: (body.imageBase64 || '').length });
    const { text: ocrText } = await processVisionProviders(body.imageBase64, provider, steps);
    const barcodeInImage = extractBarcodeFromOCR(ocrText);
    
    if (barcodeInImage) {
      const norm = normalizeBarcode(barcodeInImage);
      if (norm) {
        console.log(`🔍 Found barcode in image [${reqId}]: ${norm.raw}`);
        
        const offResult = await fetchOFF(norm.raw);
        if (offResult?.product_found) {
          console.log(`✅ Barcode-on-still hit [${reqId}]: ${offResult.product.product_name}`);
          
          steps.push({stage: 'resolver_off', ok: true, meta: {productName: offResult.product.product_name, source: 'image_barcode'}});
          const logProduct = mapOFFtoLogProduct(offResult.product, norm.raw);
          const response = {
            kind: 'single_product',
            product: logProduct,
            productName: logProduct.productName,
            healthScore: logProduct.health?.score || null,
            nutritionSummary: logProduct.nutrition,
            fallback: false
          };
          
          return new Response(JSON.stringify(response), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }
    }

    // Step 3: Process image for candidates or single product with provider control
    const result = await processHealthScanWithCandidates(body.imageBase64, reqId, provider, steps);
    
    // Maintain compatibility while preserving new kind system
    const enhancedResult = {
      ...result,
      // Use the kind from the processor, fallback to legacy logic
      kind: result.kind || (
        result.candidates && result.candidates.length > 1 ? 'branded_candidates' : 
        result.product ? 'single_product' : 'none'
      ),
      provider_used: provider,
      steps
    };
    
    console.log(JSON.stringify({
      reqId, 
      phase: 'done', 
      kind: enhancedResult.kind,
      candidatesCount: result.candidates?.length || 0,
      productName: result.productName || 'unknown',
      latencyMs: Date.now() - t0
    }));
    
    return new Response(
      JSON.stringify(enhancedResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('💥 Enhanced-health-scanner error:', error);
    
    // Handle timeout specifically
    if (error.message === 'TIMEOUT') {
      steps.push({stage: 'timeout', ok: false, meta: {ms: 8000, provider}});
    } else {
      steps.push({stage: 'fatal_error', ok: false, meta: {code: 'unknown_error', msg: error.message}});
    }
    
    const errorResponse: BackendResponse = {
      productName: "Error",
      healthScore: null,
      healthFlags: [{
        type: 'danger' as const,
        icon: '❌',
        title: 'Processing Error',
        description: `Failed to analyze: ${error.message}`
      }],
      nutritionSummary: null,
      ingredients: [],
      recommendations: GENERAL_TIPS.slice(),
      generalSummary: "Unable to process request due to internal error",
      fallback: true
    };
    
    return new Response(JSON.stringify({...errorResponse, provider_used: provider || 'hybrid', steps}), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

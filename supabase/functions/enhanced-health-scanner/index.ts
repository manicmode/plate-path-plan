import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

// New stable response schema - never 500s
type HealthScanResponse = {
  ok: boolean;
  source?: 'barcode' | 'ocr';
  reason?: string;                  // e.g. 'no_hits', 'low_score', 'invalid_image'
  product?: {
    code?: string;
    name?: string;
    brand?: string;
    image?: string | null;
    ingredientsText?: string | null;
    nutriments?: {
      calories?: number|null;
      protein_g?: number|null;
      carbs_g?: number|null;
      fat_g?: number|null;
      sugar_g?: number|null;
      fiber_g?: number|null;
      sodium_mg?: number|null;
    };
  };
  health?: {
    score?: number;                 // 0–100
    flags?: Array<{ kind: 'danger'|'warn'|'info'; label: string }>;
  };
  debug?: {
    ocrTokens?: string[];
    offQuery?: string;
    offHits?: number;
    bestScore?: number;
  };
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

// Read-only lexicons (immutable)
const STOP_WORDS = Object.freeze(new Set([
  'original', 'natural', 'flavored', 'sweet', 'crunchy', 'family', 'size', 
  'net', 'wt', 'gluten', 'free', 'non', 'gmo', 'keto', 'certified', 'made', 'with'
]));

const BRAND_LEXICON = Object.freeze(new Set([
  'skittles', 'mars', 'trader', "joe's", "trader joe's", 'nutrail', 
  'nature\'s path', 'cascadian farm', 'haribo', 'trolli', 'kirkland'
]));

const CANDY_KEYWORDS = Object.freeze(new Set([
  'candy', 'gummy', 'gummies', 'taffy', 'lollipop', 'chewy candy'
]));

const GENERAL_TIPS = Object.freeze([
  'Focus on whole, unprocessed foods when possible',
  'Check ingredient lists for hidden additives',
  'Consider portion sizes and frequency of consumption'
]);

function createErrorResponse(reason: string, message: string): Response {
  const errorResponse: HealthScanResponse = {
    ok: false,
    reason,
    debug: {}
  };
  
  console.log(`[HSF] final: { ok: false, reason: '${reason}' }`);
  
  return new Response(JSON.stringify(errorResponse), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

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

function validateEAN8(s: string): boolean {
  const sum = [...s.slice(0,7)]
    .map((d,i) => (+d) * (i%2===0 ? 3 : 1))
    .reduce((a,b)=>a+b,0);
  const check = (10 - (sum % 10)) % 10;
  return check === +s[7];
}

function validateUPCA(s: string): boolean {
  const sum = [...s.slice(0,11)]
    .map((d,i) => (+d) * (i%2===0 ? 3 : 1))
    .reduce((a,b)=>a+b,0);
  const check = (10 - (sum % 10)) % 10;
  return check === +s[11];
}

function validateEAN13(s: string): boolean {
  const sum = [...s.slice(0,12)]
    .map((d,i) => (+d) * (i%2===0 ? 1 : 3))
    .reduce((a,b)=>a+b,0);
  const check = (10 - (sum % 10)) % 10;
  return check === +s[12];
}

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

async function searchOFFByQuery(query: string): Promise<any[]> {
  try {
    const encodedQuery = encodeURIComponent(query);
    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_simple=1&json=1&fields=code,product_name,brands,images,ingredients_text_en,nutriments&page_size=10&search_terms=${encodedQuery}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    return data.products || [];
  } catch (error) {
    console.error('❌ OFF search failed:', error);
    return [];
  }
}

async function extractTextWithOCR(imageBase64: string): Promise<string[]> {
  try {
    const apiKey = Deno.env.get('GOOGLE_VISION_API_KEY');
    if (!apiKey) {
      console.warn('Google Vision API key not configured');
      return [];
    }

    const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{
          image: { content: imageBase64 },
          features: [{ type: 'TEXT_DETECTION', maxResults: 10 }]
        }]
      })
    });

    const result = await response.json();
    const text = result.responses?.[0]?.textAnnotations?.[0]?.description || '';
    
    // Extract tokens (letters/digits only)
    const tokens = text
      .toLowerCase()
      .split(/[^\w']+/)
      .filter(token => token.length >= 2 && /[a-z]/.test(token))
      .slice(0, 20); // Limit to first 20 tokens
    
    return tokens;
  } catch (error) {
    console.error('OCR extraction failed:', error);
    return [];
  }
}

function jaroWinklerSimilarity(s1: string, s2: string): number {
  if (s1 === s2) return 1.0;
  
  const maxLen = Math.max(s1.length, s2.length);
  const matchWindow = Math.floor(maxLen / 2) - 1;
  
  if (matchWindow < 0) return 0;
  
  const s1Matches = new Array(s1.length).fill(false);
  const s2Matches = new Array(s2.length).fill(false);
  
  let matches = 0;
  
  // Find matches
  for (let i = 0; i < s1.length; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, s2.length);
    
    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue;
      
      s1Matches[i] = s2Matches[j] = true;
      matches++;
      break;
    }
  }
  
  if (matches === 0) return 0;
  
  // Calculate transpositions
  let transpositions = 0;
  let k = 0;
  
  for (let i = 0; i < s1.length; i++) {
    if (!s1Matches[i]) continue;
    
    while (!s2Matches[k]) k++;
    
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }
  
  const jaro = (matches / s1.length + matches / s2.length + (matches - transpositions / 2) / matches) / 3;
  
  // Winkler prefix bonus
  let prefix = 0;
  for (let i = 0; i < Math.min(s1.length, s2.length, 4); i++) {
    if (s1[i] === s2[i]) prefix++;
    else break;
  }
  
  return jaro + (0.1 * prefix * (1 - jaro));
}

function getBrandTokens(tokens: string[]): string[] {
  return tokens.filter(token => 
    BRAND_LEXICON.has(token) || 
    (token.length >= 3 && /^[A-Z]/.test(token) && !STOP_WORDS.has(token.toLowerCase()))
  );
}

function toMg(grams: number | null): number | null {
  return grams !== null ? Math.round(grams * 1000) : null;
}

function fromSaltToSodiumMg(saltGrams: number | null): number | null {
  return saltGrams !== null ? Math.round(saltGrams * 393.4) : null; // sodium = salt * 0.3934, then to mg
}

function safeNum(value: any): number | null {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function mapOFFProduct(product: any, code?: string): HealthScanResponse {
  const pick = (...keys: string[]) => {
    for (const key of keys) {
      if (product.nutriments && product.nutriments[key] != null) {
        return product.nutriments[key];
      }
    }
    return null;
  };

  const calories = safeNum(pick('energy-kcal_100g', 'energy-kcal_serving', 'energy_100g')) || 
                   Math.round((safeNum(pick('energy_100g', 'energy_serving')) || 0) / 4.184);

  const sodium_mg = toMg(safeNum(pick('sodium_100g', 'sodium_serving'))) ??
                    fromSaltToSodiumMg(safeNum(pick('salt_100g', 'salt_serving'))) ?? 0;

  const productData: HealthScanResponse = {
    ok: true,
    source: code ? 'barcode' : 'ocr',
    product: {
      code: code || product.code || undefined,
      name: product.product_name || 'Unknown Product',
      brand: product.brands || undefined,
      image: product.images?.front?.url || product.image_url || null,
      ingredientsText: product.ingredients_text_en || product.ingredients_text || null,
      nutriments: {
        calories: calories || null,
        protein_g: safeNum(pick('proteins_100g', 'proteins_serving')),
        carbs_g: safeNum(pick('carbohydrates_100g', 'carbohydrates_serving')),
        fat_g: safeNum(pick('fat_100g', 'fat_serving')),
        sugar_g: safeNum(pick('sugars_100g', 'sugars_serving')),
        fiber_g: safeNum(pick('fiber_100g', 'fiber_serving')),
        sodium_mg: sodium_mg
      }
    },
    health: {
      score: calculateHealthScore(product),
      flags: generateHealthFlags(product)
    }
  };

  return productData;
}

function calculateHealthScore(product: any): number {
  let score = 70; // Base score

  const nutrients = product.nutriments || {};
  
  // Deduct for high sodium
  const sodium = nutrients.sodium_100g || 0;
  if (sodium > 1.5) score -= 20; // High sodium
  else if (sodium > 0.6) score -= 10; // Medium sodium

  // Deduct for high sugar
  const sugar = nutrients.sugars_100g || 0;
  if (sugar > 15) score -= 15; // High sugar
  else if (sugar > 10) score -= 8; // Medium sugar

  // Deduct for high saturated fat
  const satFat = nutrients['saturated-fat_100g'] || 0;
  if (satFat > 5) score -= 10; // High saturated fat

  // Add for fiber
  const fiber = nutrients.fiber_100g || 0;
  if (fiber > 5) score += 10; // Good fiber
  else if (fiber > 3) score += 5; // Some fiber

  return Math.max(0, Math.min(100, score));
}

function generateHealthFlags(product: any): Array<{ kind: 'danger'|'warn'|'info'; label: string }> {
  const flags = [];
  const nutrients = product.nutriments || {};
  
  // Check sodium
  const sodium = nutrients.sodium_100g || 0;
  if (sodium > 1.5) {
    flags.push({ kind: 'danger' as const, label: 'High Sodium' });
  } else if (sodium > 0.6) {
    flags.push({ kind: 'warn' as const, label: 'Moderate Sodium' });
  }

  // Check sugar
  const sugar = nutrients.sugars_100g || 0;
  if (sugar > 15) {
    flags.push({ kind: 'danger' as const, label: 'High Sugar' });
  } else if (sugar > 10) {
    flags.push({ kind: 'warn' as const, label: 'Moderate Sugar' });
  }

  // Check fiber (positive)
  const fiber = nutrients.fiber_100g || 0;
  if (fiber > 5) {
    flags.push({ kind: 'info' as const, label: 'Good Fiber Source' });
  }

  return flags;
}

async function tryOCRRecognition(imageBase64: string, reqId: string): Promise<HealthScanResponse> {
  try {
    // Extract OCR tokens
    const ocrTokens = await extractTextWithOCR(imageBase64);
    console.log(`[HSF] ocr_tokens:`, ocrTokens.slice(0, 8));
    
    if (ocrTokens.length === 0) {
      return { ok: false, reason: 'no_text', debug: { ocrTokens } };
    }

    // Build query with brand tokens and top tokens
    const brandTokens = getBrandTokens(ocrTokens);
    const topTokens = ocrTokens.slice(0, 6).filter(token => !STOP_WORDS.has(token));
    const query = [...brandTokens, ...topTokens].join(' ').trim();
    
    console.log(`[HSF] off_query: "${query}"`);
    
    if (!query) {
      return { ok: false, reason: 'no_query', debug: { ocrTokens } };
    }

    // Search OFF
    const searchResults = await searchOFFByQuery(query);
    console.log(`[HSF] off_hits: ${searchResults.length}`);
    
    if (searchResults.length === 0) {
      return { 
        ok: false, 
        reason: 'no_hits',
        debug: { ocrTokens, offQuery: query, offHits: 0 }
      };
    }

    // Score results
    let bestProduct = null;
    let bestScore = 0;

    for (const product of searchResults) {
      let score = 0;
      
      // Brand overlap bonus
      const productBrands = (product.brands || '').toLowerCase().split(/[,\s]+/);
      const brandOverlap = brandTokens.some(token => 
        productBrands.some(brand => brand.includes(token.toLowerCase()))
      );
      if (brandOverlap) score += 60;

      // Name similarity bonus  
      const productName = (product.product_name || '').toLowerCase();
      const ocrString = ocrTokens.join(' ').toLowerCase();
      const similarity = jaroWinklerSimilarity(productName, ocrString);
      score += similarity * 40;

      if (score > bestScore && (product.product_name || '').length >= 3) {
        bestScore = score;
        bestProduct = product;
      }
    }

    console.log(`[HSF] best_score: ${Math.round(bestScore)}`);

    if (bestScore >= 55 && bestProduct) {
      const result = mapOFFProduct(bestProduct);
      result.debug = {
        ocrTokens,
        offQuery: query,
        offHits: searchResults.length,
        bestScore: Math.round(bestScore)
      };
      return result;
    }

    return {
      ok: false,
      reason: 'low_score',
      debug: {
        ocrTokens,
        offQuery: query,
        offHits: searchResults.length,
        bestScore: Math.round(bestScore)
      }
    };

  } catch (error) {
    console.error('OCR recognition failed:', error);
    return { ok: false, reason: 'ocr_error', debug: {} };
  }
}

// Legacy function for backward compatibility
async function processHealthScan(imageBase64: string, detectedBarcode?: string | null): Promise<BackendResponse> {
  return {
    productName: "Unknown product",
    healthScore: null,
    healthFlags: [],
    nutritionSummary: null,
    ingredients: [],
    recommendations: [
      'Try scanning the barcode on the back of the package.',
      'Or type the exact brand & product name (e.g., "Trader Joe\'s Vanilla Almond Granola").'
    ],
    generalSummary: 'We could not confidently identify this item from the photo.',
    fallback: true
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch (e) {
      console.error('Invalid JSON body:', e);
      return createErrorResponse('invalid_body', 'Invalid JSON in request body');
    }

    const reqId = crypto.randomUUID().substring(0, 8);
    const t0 = Date.now();
    
    console.log(`🚀 Processing health scan [${reqId}]`);

    // Handle barcode mode for Log scanner (keep existing logic)
    if (body.mode === 'barcode' && body.barcode) {
      const norm = normalizeBarcode(body.barcode);
      if (!norm) {
        return createErrorResponse('invalid_barcode', 'Invalid barcode format');
      }

      console.log(`🔍 Processing barcode [${reqId}]: ${norm.raw} (${norm.type})`);
      
      const offResult = await fetchOFF(norm.raw).catch(e => null);
      
      if (!offResult?.product_found) {
        console.log(`❌ OFF miss [${reqId}]: ${norm.type} not found`);
        return createErrorResponse('off_miss', 'Product not found in database');
      }

      const result = mapOFFProduct(offResult.product, norm.raw);
      console.log('✅ OFF hit [' + reqId + ']: ' + result.product?.name);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Handle new photo mode with barcode first, then OCR fallback
    if (body.detectedBarcode) {
      console.log('[HS] still_barcode_result: checking detected barcode...');
      const norm = normalizeBarcode(body.detectedBarcode);
      
      if (norm) {
        console.log(`[HS] still_barcode_result: { raw: "${norm.raw}", type: "${norm.type}", checksumOk: ${norm.checksumOk} }`);
        
        const offResult = await fetchOFF(norm.raw).catch(e => null);
        if (offResult?.product_found) {
          const result = mapOFFProduct(offResult.product, norm.raw);
          console.log(`[HSF] final: { ok: true, source: 'barcode', reason: 'barcode_match' }`);
          return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      } else {
        console.log(`[HS] still_barcode_result: { reason: 'invalid_format' }`);
      }
    } else {
      console.log(`[HS] still_barcode_result: { reason: 'no_barcode' }`);
    }

    // Step 2: Handle new photo mode with OCR fallback
    const imageB64 = body.image_b64 || body.imageBase64;
    if (!imageB64) {
      console.log(`❌ No image data [${reqId}]`);
      return createErrorResponse('no_image', 'No image data provided');
    }

    console.log('[HS] still_pass_start');
    
    // Try OCR-based product recognition
    const ocrResult = await tryOCRRecognition(imageB64, reqId);
    
    if (ocrResult.ok && ocrResult.product) {
      console.log(`[HSF] final: { ok: true, source: '${ocrResult.source}', reason: '${ocrResult.reason}' }`);
      return new Response(JSON.stringify(ocrResult), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Return OCR failure result
    console.log(`[HSF] final: { ok: false, source: 'ocr', reason: '${ocrResult.reason}' }`);
    return new Response(JSON.stringify(ocrResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('💥 Enhanced-health-scanner error:', error);
    return createErrorResponse('internal_error', 'Internal processing error');
  }
});

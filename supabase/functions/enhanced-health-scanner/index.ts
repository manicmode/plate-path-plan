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

// Import enhanced brand lexicon
import { ENHANCED_BRAND_LEXICON, extractBrandTokensWithFuzzy } from './brandLexicon.ts';

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
 * Extract and clean OCR text
 */
async function extractAndCleanOCR(imageBase64: string): Promise<{ 
  text: string; 
  cleanedTokens: string[]; 
  brandTokens: string[]; 
  hasCandy: boolean;
  fuzzyBrands: Array<{ token: string; brand: string; confidence: number }>;
  ocrConfidence: number;
}> {
  try {
    const apiKey = Deno.env.get('GOOGLE_VISION_API_KEY');
    if (!apiKey) {
      throw new Error('Google Vision API key not configured');
    }

    const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{
          image: { content: imageBase64 },
          features: [{ type: 'TEXT_DETECTION', maxResults: 1 }]
        }]
      })
    });

    const result = await response.json();
    const rawText = result.responses?.[0]?.textAnnotations?.[0]?.description || '';
    
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
      .filter(token => token.length > 2 && !STOP_WORDS.has(token)); // Increased min length
    
    // Extract exact brand matches (legacy)
    const exactBrandTokens = tokens.filter(token => BRAND_LEXICON.has(token));
    
    // Extract fuzzy brand matches (C) Add fuzzy rescue
    const fuzzyBrands = extractBrandTokensWithFuzzy(tokens);
    
    // Combine exact and fuzzy matches for brandTokens
    const allBrandTokens = [...exactBrandTokens];
    fuzzyBrands.forEach(match => {
      if (match.confidence >= 0.6 && !allBrandTokens.includes(match.token)) {
        allBrandTokens.push(match.token);
      }
    });
    
    // Enhanced candy detection
    const hasCandy = tokens.some(token => CANDY_KEYWORDS.has(token)) ||
                    fuzzyBrands.some(match => match.brand.includes('candy') || match.brand.includes('chocolate'));
    
    console.log('📝 OCR processed:', { 
      rawLength: rawText.length, 
      tokens: tokens.length, 
      brandTokens: allBrandTokens, 
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
      ocrConfidence
    };
  } catch (error) {
    console.error('❌ OCR extraction failed:', error);
    return { 
      text: '', 
      cleanedTokens: [], 
      brandTokens: [], 
      hasCandy: false,
      fuzzyBrands: [],
      ocrConfidence: 0
    };
  }
}

/**
 * Brand-gated name search with relaxed requirements
 */
async function searchByBrandAndName(
  brandTokens: string[], 
  hasCandy: boolean, 
  fuzzyBrands?: Array<{ token: string; brand: string; confidence: number }>
): Promise<any | null> {
  // B) Relax brand gating - allow search with fuzzy matches
  const hasBrandEvidence = brandTokens.length > 0 || 
                          (fuzzyBrands && fuzzyBrands.some(m => m.confidence >= 0.6));
                          
  if (!hasBrandEvidence) {
    console.log('❌ No brand evidence (exact or fuzzy) - skipping name search');
    return null;
  }
  
  try {
    const searchQuery = brandTokens.join(' ');
    console.log(`🔍 Brand-gated search: ${searchQuery}`);
    
    const searchParams = new URLSearchParams({
      search_terms: searchQuery,
      search_simple: '1',
      action: 'process',
      json: '1',
      page_size: '3'
    });
    
    if (hasCandy) {
      searchParams.set('categories', 'candy,gummies,sweets');
    }
    
    const response = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?${searchParams}`);
    const data = await response.json();
    
    if (data.products && data.products.length > 0) {
      const filteredProducts = hasCandy ? 
        data.products.filter((product: any) => {
          const categories = (product.categories || '').toLowerCase();
          return !categories.includes('beverage') && !categories.includes('drink');
        }) : data.products;
        
      if (filteredProducts.length > 0) {
        console.log('✅ Brand search hit:', filteredProducts[0].product_name);
        return filteredProducts[0];
      }
    }
    
    return null;
  } catch (error) {
    console.error('❌ Brand search failed:', error);
    return null;
  }
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
 * Search for multiple branded product candidates
 */
async function searchMultipleCandidates(brandTokens: string[], hasCandy: boolean): Promise<any[]> {
  if (brandTokens.length === 0) return [];
  
  try {
    const searchQuery = brandTokens.join(' ');
    console.log(`🔍 Multi-candidate search: ${searchQuery}`);
    
    const searchParams = new URLSearchParams({
      search_terms: searchQuery,
      search_simple: '1',
      action: 'process',
      json: '1',
      page_size: '8'  // Get more for filtering
    });
    
    if (hasCandy) {
      searchParams.set('categories', 'candy,gummies,sweets');
    }
    
    const response = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?${searchParams}`);
    const data = await response.json();
    
    if (data.products && data.products.length > 0) {
      // Filter and limit to 5 candidates
      let candidates = data.products.slice(0, 5);
      
      if (hasCandy) {
        candidates = candidates.filter((product: any) => {
          const categories = (product.categories || '').toLowerCase();
          return !categories.includes('beverage') && !categories.includes('drink');
        });
      }
      
      console.log(`✅ Found ${candidates.length} candidates`);
      return candidates.slice(0, 5);
    }
    
    return [];
  } catch (error) {
    console.error('❌ Multi-candidate search failed:', error);
    return [];
  }
}

/**
 * Enhanced health scan with candidate support
 */
async function processHealthScanWithCandidates(imageBase64: string, reqId: string): Promise<any> {
  const ctx: RequestContext = {
    reqId,
    now: new Date(),
    ocrText: '',
    tokens: [],
    brandTokens: [],
    hasCandy: false,
    plateConf: 0
  };

  // Extract OCR and analyze
  const ocrResult = await extractAndCleanOCR(imageBase64);
  ctx.ocrText = ocrResult.text;
  ctx.tokens = ocrResult.cleanedTokens;
  ctx.brandTokens = ocrResult.brandTokens;
  ctx.hasCandy = ocrResult.hasCandy;
  
  // B) Add [ANALYZER DEBUG] logs in DEV
  const isDev = Deno.env.get('DENO_ENV') !== 'production';
  if (isDev) {
    console.log(`[ANALYZER DEBUG] [${reqId}]:`, {
      ocrTopTokens: ctx.tokens.slice(0, 10),
      exactBrands: ctx.brandTokens,
      fuzzyBrands: ocrResult.fuzzyBrands,
      ocrConfidence: ocrResult.ocrConfidence,
      hasCandy: ctx.hasCandy,
      textLength: ocrResult.text.length
    });
  }
  
  console.log(`📝 OCR analysis [${reqId}]:`, { 
    tokens: ctx.tokens.length, 
    brandTokens: ctx.brandTokens.length, 
    fuzzyBrands: ocrResult.fuzzyBrands?.length || 0,
    hasCandy: ctx.hasCandy 
  });

  // Try single product search first with enhanced brand matching
  const singleProduct = await searchByBrandAndName(ctx.brandTokens, ctx.hasCandy, ocrResult.fuzzyBrands);
  
  if (singleProduct) {
    console.log(`✅ Single product found [${reqId}]: ${singleProduct.product_name}`);
    const logProduct = mapOFFtoLogProduct(singleProduct, singleProduct.code || '');
    
    if (isDev) {
      console.log(`[ANALYZER DEBUG] Decision: single_product`, {
        productName: logProduct.productName,
        confidence: 'high'
      });
    }
    
    return {
      kind: 'single_product',
      product: logProduct,
      productName: logProduct.productName,
      healthScore: logProduct.health?.score || null,
      nutritionSummary: logProduct.nutrition,
      fallback: false
    };
  }

  // Try multiple candidates if single search fails
  const candidates = await searchMultipleCandidates(ctx.brandTokens, ctx.hasCandy);
  
  // B) Return candidates instead of none when we have some evidence
  const hasWeakEvidence = ctx.brandTokens.length > 0 || 
                         ocrResult.fuzzyBrands.some(m => m.confidence >= 0.35) ||
                         ctx.tokens.length > 3; // Some OCR text detected

  if (candidates.length > 0 && hasWeakEvidence) {
    console.log(`✅ Branded candidates found [${reqId}]: ${candidates.length}`);
    
    if (isDev) {
      console.log(`[ANALYZER DEBUG] Decision: branded_candidates`, {
        candidatesCount: candidates.length,
        evidence: 'weak_but_present'
      });
    }
    
    // Map candidates to simplified format for UI
    const candidateList = candidates.slice(0, 5).map((product: any) => ({
      id: product.code || crypto.randomUUID(),
      name: `${product.brands || ''} ${product.product_name || ''}`.trim() || 'Unknown Product',
      brand: product.brands || '',
      image: product.image_front_small_url || product.image_url || '',
      confidence: Math.max(0.5, Math.random() * 0.4 + 0.6) // Mock confidence 0.6-1.0
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
      fallback: false
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

  try {
    const body = await req.json();
    const reqId = crypto.randomUUID().substring(0, 8);
    const t0 = Date.now();
    
    steps.push({stage: 'camera_echo', ok: true, meta: {reqId, mode: body.mode}});
    console.log(`🚀 Processing health scan [${reqId}]`);

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
        JSON.stringify({ ok: true, product: logProduct, steps }),
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

    // Step 2: Check if image has barcode first (local detection)
    const { text: ocrText } = await extractAndCleanOCR(body.imageBase64);
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

    // Step 3: Process image for candidates or single product
    const result = await processHealthScanWithCandidates(body.imageBase64, reqId);
    
    // Maintain compatibility while preserving new kind system
    const enhancedResult = {
      ...result,
      // Use the kind from the processor, fallback to legacy logic
      kind: result.kind || (
        result.candidates && result.candidates.length > 1 ? 'branded_candidates' : 
        result.product ? 'single_product' : 'none'
      ),
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
    steps.push({stage: 'fatal_error', ok: false, meta: {code: 'unknown_error', msg: error.message}});
    
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
    
    return new Response(JSON.stringify({...errorResponse, steps}), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

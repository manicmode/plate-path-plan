import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HealthFlag {
  type: 'warning' | 'danger' | 'good';
  icon: string;
  title: string;
  description: string;
}

interface HealthReport {
  productName: string;
  ingredients: string[];
  healthFlags: HealthFlag[];
  healthScore: number | null;
  nutritionData: any;
  summary: string;
  recommendations: string[];
  fallback?: boolean;
}

interface ProcessedInput {
  type: 'barcode' | 'image' | 'voice' | 'text';
  content: string;
  imageData?: string;
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

// Read-only health rules configuration (immutable)
const HEALTH_RULES = Object.freeze({
  gmo_risk: Object.freeze([
    'soy', 'corn', 'canola', 'sugar beet', 'cottonseed',
    'soybean oil', 'corn syrup', 'high fructose corn syrup',
    'canola oil', 'cottonseed oil'
  ]),
  
  additives: Object.freeze({
    artificial_colors: Object.freeze(['yellow #5', 'red #40', 'blue #1', 'yellow #6', 'red #3', 'blue #2']),
    preservatives: Object.freeze(['sodium benzoate', 'potassium sorbate', 'bha', 'bht', 'tbhq']),
    sweeteners: Object.freeze(['aspartame', 'sucralose', 'acesulfame potassium', 'saccharin']),
    flavor_enhancers: Object.freeze(['monosodium glutamate', 'msg', 'autolyzed yeast extract']),
    emulsifiers: Object.freeze(['carrageenan', 'polysorbate 80', 'sodium stearoyl lactylate'])
  }),
  
  allergens: Object.freeze([
    'milk', 'eggs', 'fish', 'shellfish', 'tree nuts', 
    'peanuts', 'wheat', 'soybeans', 'sesame'
  ]),
  
  nutrition_limits: Object.freeze({
    sodium_high: 20,
    sugar_high: 15,
    saturated_fat_high: 20,
    trans_fat_danger: 0.5
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

/**
 * ZXing-style barcode detection from binary image data
 */
async function detectBarcodeFromBinary(imageBase64: string): Promise<{ barcode?: string; confidence: number }> {
  try {
    console.log('🔍 Starting ZXing barcode detection...');
    
    // Use existing barcode-image-detector function
    const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/barcode-image-detector`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
      },
      body: JSON.stringify({ imageBase64 })
    });
    
    const data = await response.json();
    if (data.barcode && /^\d{8,14}$/.test(data.barcode)) {
      console.log('✅ ZXing barcode detected:', data.barcode);
      return { barcode: data.barcode, confidence: 0.95 };
    }
    return { confidence: 0 };
  } catch (error) {
    console.warn('❌ ZXing barcode detection failed:', error);
    return { confidence: 0 };
  }
}

/**
 * Extract and clean OCR text
 */
async function extractAndCleanOCR(imageBase64: string): Promise<{ text: string; cleanedTokens: string[]; brandTokens: string[]; hasCandy: boolean }> {
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
    const rawText = result.responses[0]?.textAnnotations?.[0]?.description || '';
    
    // Normalize: lowercase, strip punctuation, collapse whitespace
    const normalized = rawText
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Remove stop-words and packaging tokens
    const tokens = normalized.split(/\s+/)
      .filter(token => token.length > 0 && !STOP_WORDS.has(token));
    
    // Extract brand evidence
    const brandTokens = tokens.filter(token => BRAND_LEXICON.has(token));
    
    // Candy detection (only from current OCR tokens)
    const hasCandy = tokens.some(token => CANDY_KEYWORDS.has(token));
    
    console.log('📝 OCR processed:', { 
      rawLength: rawText.length, 
      tokens: tokens.length, 
      brandTokens, 
      hasCandy 
    });
    
    return { 
      text: rawText,
      cleanedTokens: tokens, 
      brandTokens, 
      hasCandy 
    };
  } catch (error) {
    console.error('❌ OCR extraction failed:', error);
    return { text: '', cleanedTokens: [], brandTokens: [], hasCandy: false };
  }
}

/**
 * OpenFoodFacts lookup by barcode
 */
async function lookupByBarcode(barcode: string): Promise<any | null> {
  try {
    console.log(`🔍 OpenFoodFacts lookup for barcode: ${barcode}`);
    const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
    const data = await response.json();
    
    if (data.status === 1 && data.product) {
      console.log('✅ OpenFoodFacts hit:', data.product.product_name);
      return data.product;
    }
    return null;
  } catch (error) {
    console.error('❌ OpenFoodFacts lookup failed:', error);
    return null;
  }
}

/**
 * Brand-gated name search (only with strong brand evidence)
 */
async function searchByBrandAndName(brandTokens: string[], hasCandy: boolean): Promise<any | null> {
  if (brandTokens.length === 0) {
    console.log('❌ No brand evidence - skipping name search');
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
      // Filter out beverages if candy detected
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
function generateHealthFlags(ingredients: string[], hasCandy: boolean): HealthFlag[] {
  const flags: HealthFlag[] = [];
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
function calculateHealthScore(flags: HealthFlag[], hasCandy: boolean, hasStrongEvidence: boolean): number | null {
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

/**
 * Process input with barcode-first logic and confidence gating
 */
async function processInput(input: ProcessedInput): Promise<HealthReport> {
  const ctx: RequestContext = {
    reqId: crypto.randomUUID().substring(0, 8),
    now: new Date(),
    ocrText: '',
    tokens: [],
    brandTokens: [],
    hasCandy: false,
    plateConf: 0
  };
  
  console.log(`🚀 Processing ${input.type} input [${ctx.reqId}]`);
  
  let barcodeHit = false;
  let nameHit = false;
  let offProduct: any = null;
  
  // Step 1: Barcode first (highest priority)
  if (input.type === 'barcode' || input.type === 'image') {
    const barcode = input.content.match(/\b\d{8,14}\b/)?.[0] || 
                   (input.type === 'image' && input.imageData ? 
                    (await detectBarcodeFromBinary(input.imageData)).barcode : null);
    
    if (barcode) {
      ctx.barcodeFound = barcode;
      offProduct = await lookupByBarcode(barcode);
      if (offProduct) {
        barcodeHit = true;
        ctx.offHit = true;
        
        const ingredients = offProduct.ingredients_text ? 
          offProduct.ingredients_text.split(',').map((ing: string) => ing.trim()) : [];
          
        const flags = generateHealthFlags(ingredients, false);
        const healthScore = calculateHealthScore(flags, false, true);
        
        console.log(`✅ Barcode success [${ctx.reqId}]`, { barcode, product: offProduct.product_name });
        
        return {
          productName: offProduct.product_name || "Unknown Product",
          ingredients,
          healthFlags: flags,
          healthScore,
          nutritionData: generateNutritionData(offProduct.nutriments),
          summary: generateHealthSummary(flags, healthScore),
          recommendations: generateRecommendations(flags)
        };
      }
    }
  }
  
  // Step 2: OCR cleanup for image inputs
  if (input.type === 'image' && input.imageData) {
    const ocrResult = await extractAndCleanOCR(input.imageData);
    ctx.ocrText = ocrResult.text;
    ctx.tokens = ocrResult.cleanedTokens;
    ctx.brandTokens = ocrResult.brandTokens;
    ctx.hasCandy = ocrResult.hasCandy;
    
    // Brand-gated name search (only with brand evidence)
    if (ctx.brandTokens.length > 0) {
      offProduct = await searchByBrandAndName(ctx.brandTokens, ctx.hasCandy);
      if (offProduct) {
        nameHit = true;
        ctx.offHit = true;
        
        const ingredients = offProduct.ingredients_text ? 
          offProduct.ingredients_text.split(',').map((ing: string) => ing.trim()) : [];
          
        const flags = generateHealthFlags(ingredients, ctx.hasCandy);
        const healthScore = calculateHealthScore(flags, ctx.hasCandy, true);
        
        console.log(`✅ Name search success [${ctx.reqId}]`, { brand: ctx.brandTokens, product: offProduct.product_name });
        
        return {
          productName: offProduct.product_name || "Unknown Product",
          ingredients,
          healthFlags: flags,
          healthScore,
          nutritionData: generateNutritionData(offProduct.nutriments),
          summary: generateHealthSummary(flags, healthScore),
          recommendations: generateRecommendations(flags)
        };
      }
    }
  }
  
  // Step 3: Text input processing
  if (input.type === 'text' || input.type === 'voice') {
    const normalized = input.content.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    const tokens = normalized.split(/\s+/)
      .filter(token => token.length > 0 && !STOP_WORDS.has(token));
    
    ctx.tokens = tokens;
    ctx.brandTokens = tokens.filter(token => BRAND_LEXICON.has(token));
    ctx.hasCandy = tokens.some(token => CANDY_KEYWORDS.has(token));
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
      ingredients: [],
      healthFlags: [],
      healthScore: null,
      nutritionData: null,
      summary: "We couldn't confidently identify this product",
      recommendations: GENERAL_TIPS.slice(),
      fallback: true
    };
  }
  
  // Step 6: Generate result with evidence
  const flags = generateHealthFlags([], ctx.hasCandy);
  const healthScore = calculateHealthScore(flags, ctx.hasCandy, hasStrongEvidence);
  
  // Final logging
  console.log(`📊 Final result [${ctx.reqId}]`, {
    barcodeFound: !!ctx.barcodeFound,
    offHit: ctx.offHit || false,
    brand: ctx.brandTokens.join(',') || 'none',
    plateConf: ctx.plateConf,
    scored: healthScore !== null,
    productName: input.content || 'Unknown',
    latencyMs: Date.now() - ctx.now.getTime()
  });
  
  return {
    productName: input.content || "Detected Food",
    ingredients: [],
    healthFlags: flags,
    healthScore,
    nutritionData: null,
    summary: generateHealthSummary(flags, healthScore),
    recommendations: generateRecommendations(flags)
  };
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

function generateHealthSummary(flags: HealthFlag[], score: number | null): string {
  if (score === null) {
    return "Unable to provide health assessment - insufficient product information";
  }
  
  const dangerFlags = flags.filter(f => f.type === 'danger').length;
  const warningFlags = flags.filter(f => f.type === 'warning').length;

  if (dangerFlags > 2) {
    return "This product contains multiple concerning ingredients that may impact your health.";
  } else if (dangerFlags > 0) {
    return "This product contains some concerning ingredients. Consume in moderation.";
  } else if (warningFlags > 3) {
    return "This product has several ingredients that warrant caution.";
  } else {
    return "This product is relatively neutral from a health perspective.";
  }
}

function generateRecommendations(flags: HealthFlag[]): string[] {
  const recommendations = [];
  
  if (flags.some(f => f.title.includes("Added Sugars"))) {
    recommendations.push("Consider limiting portion size due to high sugar content");
  }
  
  if (flags.some(f => f.title.includes("Artificial Colors"))) {
    recommendations.push("Look for products without artificial colors when possible");
  }
  
  if (flags.some(f => f.title.includes("Preservatives"))) {
    recommendations.push("Choose fresh or minimally processed alternatives when available");
  }
  
  if (recommendations.length === 0) {
    return GENERAL_TIPS.slice();
  }
  
  return recommendations;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    const { type, content, imageData, inputType, data, userId } = requestBody;
    
    const processType = inputType || type;
    const processContent = data || content;
    
    if (!processType || !processContent) {
      throw new Error(`Missing required fields. type=${processType}, content=${!!processContent}`);
    }

    const input: ProcessedInput = {
      type: processType,
      content: processContent,
      imageData: imageData
    };

    const healthReport = await processInput(input);
    
    return new Response(JSON.stringify(healthReport), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('💥 Health-check-processor error:', error);
    
    const errorResponse = {
      productName: "Error",
      ingredients: [],
      healthFlags: [{
        type: 'danger' as const,
        icon: '❌',
        title: 'Processing Error',
        description: `Failed to analyze: ${error.message}`
      }],
      healthScore: null,
      nutritionData: null,
      summary: "Unable to process request due to internal error",
      recommendations: GENERAL_TIPS.slice(),
      fallback: true
    };
    
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
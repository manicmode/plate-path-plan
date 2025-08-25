import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Legacy response format that UI expects (keep UI unchanged)
interface BackendResponse {
  productName: string;
  healthScore: number;
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
}

// Enhanced interfaces for internal processing
interface ScanResult {
  success: boolean;
  mode: 'ping' | 'scan';
  confidence: number;
  product?: ProductResult;
  plateItems?: PlateItem[];
  insights: HealthInsight[];
  nextAction: NextAction;
  metadata: ScanMetadata;
}

interface ProductResult {
  name: string;
  brand?: string;
  barcode?: string;
  category: string;
  ingredients: string[];
  nutrition: NutritionData;
  allergens: string[];
  flags: HealthFlag[];
}

interface PlateItem {
  name: string;
  portion: string;
  confidence: number;
  category: 'protein' | 'carb' | 'vegetable' | 'fruit' | 'dairy' | 'snack' | 'other';
  confirmed: boolean;
  alternatives?: string[];
}

interface HealthInsight {
  type: 'positive' | 'negative' | 'neutral' | 'warning';
  title: string;
  description: string;
  icon: string;
  priority: number; // 1-10, higher = more important
}

interface NextAction {
  action: 'confirm' | 'retake' | 'manual_search' | 'good_to_go' | 'avoid';
  title: string;
  description: string;
  buttons: ActionButton[];
}

interface ActionButton {
  label: string;
  action: string;
  variant: 'primary' | 'secondary' | 'danger';
}

interface ScanMetadata {
  processingTime: number;
  detectorsUsed: string[];
  imageAnalysis?: ImageAnalysis;
  productMatches?: ProductMatch[];
}

interface ImageAnalysis {
  barcodeDetected: boolean;
  logosDetected: string[];
  textExtracted: string;
  plateFoodDetected: boolean;
  confidence: number;
}

interface ProductMatch {
  source: 'barcode' | 'fuzzy' | 'logo';
  confidence: number;
  product: any;
}

interface NutritionData {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  saturated_fat?: number;
}

interface HealthFlag {
  type: 'danger' | 'warning' | 'good';
  icon: string;
  title: string;
  description: string;
  category: string;
  priority: number;
}

// Enhanced health rules configuration
const HEALTH_RULES = {
  // GMO-risk ingredients
  gmo_risk: [
    'soy', 'corn', 'canola', 'sugar beet', 'cottonseed',
    'soybean oil', 'corn syrup', 'high fructose corn syrup',
    'canola oil', 'cottonseed oil'
  ],
  
  // Problematic additives
  additives: {
    artificial_colors: ['yellow #5', 'red #40', 'blue #1', 'yellow #6', 'red #3', 'blue #2'],
    preservatives: ['sodium benzoate', 'potassium sorbate', 'bha', 'bht', 'tbhq'],
    sweeteners: ['aspartame', 'sucralose', 'acesulfame potassium', 'saccharin'],
    flavor_enhancers: ['monosodium glutamate', 'msg', 'autolyzed yeast extract'],
    emulsifiers: ['carrageenan', 'polysorbate 80', 'sodium stearoyl lactylate']
  },
  
  // Allergens (FDA top 9)
  allergens: [
    'milk', 'eggs', 'fish', 'shellfish', 'tree nuts', 
    'peanuts', 'wheat', 'soybeans', 'sesame'
  ],
  
  // Nutrition thresholds (% Daily Value)
  nutrition_limits: {
    sodium_high: 20, // >20% DV per serving
    sugar_high: 15,  // >15g per serving
    saturated_fat_high: 20, // >20% DV per serving
    trans_fat_danger: 0.5 // Any amount >0.5g
  }
};

// Logo detection patterns
const KNOWN_LOGOS = [
  'coca-cola', 'pepsi', 'nestle', 'unilever', 'kraft', 'general mills',
  'kelloggs', 'nabisco', 'heinz', 'campbells', 'starbucks', 'mcdonalds'
];

/**
 * Enhanced barcode detection using ZXing-style pattern matching
 */
async function detectBarcode(imageBase64: string): Promise<{ barcode?: string; confidence: number }> {
  try {
    console.log('🔍 Starting enhanced barcode detection...');
    
    // Try multiple barcode detection methods in parallel
    const detectionResults = await Promise.allSettled([
      detectBarcodeFromImage(imageBase64),
      detectBarcodeFromText(imageBase64),
      detectBarcodeFromMeta(imageBase64)
    ]);
    
    // Find the best result
    const barcodes = detectionResults
      .filter(result => result.status === 'fulfilled' && result.value.barcode)
      .map(result => result.status === 'fulfilled' ? result.value : null)
      .filter(Boolean)
      .sort((a, b) => (b?.confidence || 0) - (a?.confidence || 0));
    
    const bestResult = barcodes[0];
    console.log('📊 Barcode detection result:', bestResult);
    
    return bestResult || { confidence: 0 };
  } catch (error) {
    console.error('❌ Barcode detection failed:', error);
    return { confidence: 0 };
  }
}

async function detectBarcodeFromImage(imageBase64: string): Promise<{ barcode?: string; confidence: number }> {
  // Use existing barcode-image-detector function
  try {
    const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/barcode-image-detector`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
      },
      body: JSON.stringify({ imageBase64 })
    });
    
    const data = await response.json();
    if (data.barcode) {
      return { barcode: data.barcode, confidence: 0.9 };
    }
    return { confidence: 0 };
  } catch (error) {
    console.warn('Barcode image detection failed:', error);
    return { confidence: 0 };
  }
}

async function detectBarcodeFromText(imageBase64: string): Promise<{ barcode?: string; confidence: number }> {
  // Extract text and look for barcode patterns
  try {
    const textResult = await extractTextWithVision(imageBase64);
    const barcodeMatch = textResult.text.match(/\b(\d{8}|\d{12}|\d{13}|\d{14})\b/);
    
    if (barcodeMatch) {
      return { barcode: barcodeMatch[1], confidence: 0.7 };
    }
    return { confidence: 0 };
  } catch (error) {
    console.warn('Text-based barcode detection failed:', error);
    return { confidence: 0 };
  }
}

async function detectBarcodeFromMeta(imageBase64: string): Promise<{ barcode?: string; confidence: number }> {
  // Check if barcode is embedded in metadata or filename
  // This is a placeholder for more sophisticated detection
  return { confidence: 0 };
}

/**
 * Enhanced logo detection
 */
async function detectLogos(imageBase64: string): Promise<{ logos: string[]; confidence: number }> {
  try {
    console.log('🏷️ Starting logo detection...');
    
    const visionResult = await analyzeImageWithVision(imageBase64);
    const detectedLogos = visionResult.logos.filter(logo => 
      KNOWN_LOGOS.some(known => 
        logo.description.toLowerCase().includes(known.toLowerCase())
      )
    );
    
    const logoNames = detectedLogos.map(logo => logo.description);
    console.log('🏷️ Detected logos:', logoNames);
    
    return {
      logos: logoNames,
      confidence: detectedLogos.length > 0 ? 0.8 : 0
    };
  } catch (error) {
    console.error('❌ Logo detection failed:', error);
    return { logos: [], confidence: 0 };
  }
}

/**
 * Enhanced OCR text extraction
 */
async function extractTextWithVision(imageBase64: string): Promise<{ text: string; confidence: number }> {
  try {
    console.log('📝 Starting OCR text extraction...');
    
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
    const textAnnotation = result.responses[0]?.textAnnotations?.[0];
    
    if (textAnnotation) {
      console.log('📝 OCR extracted text preview:', textAnnotation.description.substring(0, 100));
      return {
        text: textAnnotation.description,
        confidence: textAnnotation.confidence || 0.8
      };
    }
    
    return { text: '', confidence: 0 };
  } catch (error) {
    console.error('❌ OCR extraction failed:', error);
    return { text: '', confidence: 0 };
  }
}

/**
 * Plate/meal classifier
 */
async function classifyPlateFood(imageBase64: string): Promise<{ plateItems: PlateItem[]; confidence: number }> {
  try {
    console.log('🍽️ Starting plate food classification...');
    
    const visionResult = await analyzeImageWithVision(imageBase64);
    const foodLabels = visionResult.labels.filter(label => {
      const foodKeywords = ['food', 'dish', 'meal', 'vegetable', 'fruit', 'meat', 'bread', 'rice', 'pasta'];
      return foodKeywords.some(keyword => label.toLowerCase().includes(keyword));
    });
    
    if (foodLabels.length === 0) {
      return { plateItems: [], confidence: 0 };
    }
    
    // Use GPT to analyze and categorize detected food items
    const gptPrompt = `Analyze these detected food items from an image: ${foodLabels.join(', ')}.
    Return a JSON array of food items with this structure:
    [
      {
        "name": "food item name",
        "portion": "estimated portion size",
        "confidence": 0.8,
        "category": "protein|carb|vegetable|fruit|dairy|snack|other",
        "alternatives": ["similar food 1", "similar food 2"]
      }
    ]
    Focus on common, recognizable foods.`;
    
    const gptResult = await analyzeWithGPT(gptPrompt);
    const plateItems = Array.isArray(gptResult) ? gptResult.map(item => ({
      ...item,
      confirmed: false
    })) : [];
    
    console.log('🍽️ Classified plate items:', plateItems.length);
    return {
      plateItems,
      confidence: plateItems.length > 0 ? 0.7 : 0
    };
  } catch (error) {
    console.error('❌ Plate classification failed:', error);
    return { plateItems: [], confidence: 0 };
  }
}

/**
 * Enhanced product matching with evidence-based gating
 */
async function matchProduct(barcode?: string, brand?: string, productName?: string, textInfo?: any): Promise<ProductMatch[]> {
  const matches: ProductMatch[] = [];
  
  try {
    // Load brand aliases for normalization
    const brandAliasData = await import('./brandAliases.json');
    const brandAliases = brandAliasData.default?.brand_aliases || {};
    
    // Extract enhanced text info if provided
    const brandTokens = textInfo?.brandTokens || [];
    const hasCandy = textInfo?.hasCandy || false;
    
    // 2) Evidence scoring for product selection gating
    let evidence = 0;
    if (barcode) evidence += 1.0;
    if (brand && brandTokens.some(token => 
        brand.toLowerCase().includes(token) || 
        brandAliases[token] === brand.toLowerCase()
      )) evidence += 0.6;
    if (brandTokens.length > 0) evidence += 0.6;
    if (hasCandy) evidence += 0.2;
    
    const REQUIRE_STRONG_BRAND = 0.9;
    const canChooseSpecific = evidence >= REQUIRE_STRONG_BRAND;
    
    console.log('🎯 Evidence scoring:', { 
      barcode: !!barcode, 
      brandTokens, 
      hasCandy, 
      evidence, 
      canChooseSpecific 
    });
    
    // Try barcode match first (highest confidence)
    if (barcode) {
      console.log('🔍 Attempting barcode product match:', barcode);
      const barcodeProduct = await fetchFromOpenFoodFacts(`/api/v0/product/${barcode}.json`);
      
      if (barcodeProduct?.status === 1) {
        matches.push({
          source: 'barcode',
          confidence: 0.95,
          product: barcodeProduct.product
        });
      }
    }
    
    // Only attempt fuzzy/logo matching if we have strong evidence
    if (canChooseSpecific && matches.length === 0) {
      // Try fuzzy matching with brand tokens only
      if (brandTokens.length > 0) {
        const searchQuery = brandTokens.join(' ');
        console.log('🔍 Attempting brand token product match:', searchQuery);
        
        // Add category filter if candy detected
        const filters: any = {};
        if (hasCandy) {
          filters.categories = 'candy,gummies,sweets';
        }
        
        const searchResults = await searchOpenFoodFacts(searchQuery, filters);
        
        if (searchResults?.products?.length > 0) {
          // Filter out beverage results if hasCandy is true
          const filteredProducts = hasCandy ? 
            searchResults.products.filter((product: any) => {
              const categories = (product.categories || '').toLowerCase();
              return !categories.includes('beverage') && 
                     !categories.includes('drink') && 
                     !categories.includes('soda');
            }) : searchResults.products;
            
          if (filteredProducts.length > 0) {
            matches.push({
              source: 'fuzzy',
              confidence: 0.7,
              product: filteredProducts[0]
            });
          }
        }
      }
      
      // Logo-based matching with brand validation
      if (brand && brandTokens.includes(brand.toLowerCase()) && matches.length === 0) {
        console.log('🔍 Attempting logo-based product match:', brand);
        const logoResults = await searchOpenFoodFacts(brand, { brands: brand });
        
        if (logoResults?.products?.length > 0) {
          matches.push({
            source: 'logo',
            confidence: 0.6,
            product: logoResults.products[0]
          });
        }
      }
    }
    
    // If hasCandy but no specific product match, create generic candy result
    if (hasCandy && matches.length === 0) {
      console.log('📝 Creating generic candy result');
      matches.push({
        source: 'fuzzy',
        confidence: 0.5,
        product: {
          product_name: productName ? `${productName} (candy)` : 'Candy/Gummies',
          categories: 'candy,sweets',
          ingredients_text: '', // Will be filled by heuristics
          nutriments: {}, // Will be filled by heuristics
          _isGenericCandy: true
        }
      });
    }
    
    console.log('🎯 Product matching results:', matches.length, 'matches found');
    return matches;
  } catch (error) {
    console.error('❌ Product matching failed:', error);
    return matches;
  }
}

async function fetchFromOpenFoodFacts(endpoint: string): Promise<any> {
  const response = await fetch(`https://world.openfoodfacts.org${endpoint}`);
  return response.json();
}

async function searchOpenFoodFacts(query: string, filters?: any): Promise<any> {
  const searchParams = new URLSearchParams({
    search_terms: query,
    search_simple: '1',
    action: 'process',
    json: '1',
    page_size: '5',
    ...filters
  });
  
  const response = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?${searchParams}`);
  return response.json();
}

/**
 * Enhanced health flagging based on rules
 */
function analyzeHealthFlags(product: ProductResult | null, plateItems: PlateItem[]): HealthFlag[] {
  const flags: HealthFlag[] = [];
  
  // Analyze packaged product
  if (product) {
    flags.push(...analyzeProductFlags(product));
  }
  
  // Analyze plate items
  if (plateItems.length > 0) {
    flags.push(...analyzePlateFlags(plateItems));
  }
  
  return flags.sort((a, b) => b.priority - a.priority);
}

function analyzeProductFlags(product: ProductResult): HealthFlag[] {
  const flags: HealthFlag[] = [];
  const ingredients = product.ingredients.join(' ').toLowerCase();
  const isCandy = product.category.toLowerCase().includes('candy') || 
                  product.category.toLowerCase().includes('gummies') ||
                  product.category.toLowerCase().includes('sweets') ||
                  (product as any)._isGenericCandy;
  
  // 3) Candy-specific heuristics - always flag high sugar for candy
  if (isCandy) {
    flags.push({
      type: 'warning',
      icon: '🍭',
      title: 'Added Sugars High',
      description: 'High in added sugars; limit portion size',
      category: 'nutrition',
      priority: 8
    });
    
    // Check for artificial colors common in candy
    const candyColors = ['red 40', 'yellow 5', 'yellow 6', 'blue 1', 'red 3', 'blue 2'];
    const foundColors = candyColors.filter(color => 
      ingredients.includes(color) || ingredients.includes(color.replace(' ', '#'))
    );
    
    if (foundColors.length > 0 || ingredients.includes('artificial') || ingredients.includes('color')) {
      flags.push({
        type: 'warning',
        icon: '🎨',
        title: 'Artificial Colors',
        description: `Contains artificial colors (e.g., ${foundColors.join(', ') || 'Red 40, Yellow 5/6, Blue 1'})`,
        category: 'additives',
        priority: 6
      });
    }
  }
  
  // Check GMO risk
  const gmoIngredients = HEALTH_RULES.gmo_risk.filter(risk => 
    ingredients.includes(risk.toLowerCase())
  );
  if (gmoIngredients.length > 0) {
    flags.push({
      type: 'warning',
      icon: '🧬',
      title: 'GMO Risk Ingredients',
      description: `Contains ${gmoIngredients.join(', ')} which may be genetically modified`,
      category: 'ingredients',
      priority: 6
    });
  }
  
  // Check problematic additives
  Object.entries(HEALTH_RULES.additives).forEach(([category, additives]) => {
    const found = additives.filter(additive => 
      ingredients.includes(additive.toLowerCase())
    );
    if (found.length > 0) {
      flags.push({
        type: category.includes('artificial') ? 'danger' : 'warning',
        icon: category.includes('color') ? '🎨' : '⚗️',
        title: `${category.replace('_', ' ').toUpperCase()}`,
        description: `Contains ${found.join(', ')}`,
        category: 'additives',
        priority: category.includes('artificial') ? 8 : 6
      });
    }
  });
  
  // Check nutrition flags
  if (product.nutrition) {
    flags.push(...analyzeNutritionFlags(product.nutrition));
  }
  
  // Check allergens
  const detectedAllergens = HEALTH_RULES.allergens.filter(allergen =>
    product.allergens.some(productAllergen => 
      productAllergen.toLowerCase().includes(allergen.toLowerCase())
    )
  );
  if (detectedAllergens.length > 0) {
    flags.push({
      type: 'warning',
      icon: '⚠️',
      title: 'Allergen Alert',
      description: `Contains: ${detectedAllergens.join(', ')}`,
      category: 'allergens',
      priority: 9
    });
  }
  
  return flags;
}

function analyzeNutritionFlags(nutrition: NutritionData): HealthFlag[] {
  const flags: HealthFlag[] = [];
  
  // High sodium
  if (nutrition.sodium && nutrition.sodium > HEALTH_RULES.nutrition_limits.sodium_high) {
    flags.push({
      type: 'warning',
      icon: '🧂',
      title: 'High Sodium',
      description: `${nutrition.sodium}mg sodium - over 20% daily value`,
      category: 'nutrition',
      priority: 7
    });
  }
  
  // High sugar
  if (nutrition.sugar && nutrition.sugar > HEALTH_RULES.nutrition_limits.sugar_high) {
    flags.push({
      type: 'warning',
      icon: '🍭',
      title: 'High Sugar',
      description: `${nutrition.sugar}g sugar per serving`,
      category: 'nutrition',
      priority: 7
    });
  }
  
  // Trans fat danger
  if (nutrition.saturated_fat && nutrition.saturated_fat > HEALTH_RULES.nutrition_limits.saturated_fat_high) {
    flags.push({
      type: 'danger',
      icon: '🚫',
      title: 'High Saturated Fat',
      description: `${nutrition.saturated_fat}g saturated fat - over 20% daily value`,
      category: 'nutrition',
      priority: 8
    });
  }
  
  return flags;
}

function analyzePlateFlags(plateItems: PlateItem[]): HealthFlag[] {
  const flags: HealthFlag[] = [];
  
  // Analyze plate composition
  const categories = plateItems.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  // Check for balanced meal
  const hasProtein = categories.protein > 0;
  const hasVegetables = categories.vegetable > 0;
  const hasCarbs = categories.carb > 0;
  
  if (hasProtein && hasVegetables && hasCarbs) {
    flags.push({
      type: 'good',
      icon: '✅',
      title: 'Balanced Meal',
      description: 'Good mix of protein, vegetables, and carbohydrates',
      category: 'composition',
      priority: 5
    });
  } else if (!hasVegetables) {
    flags.push({
      type: 'warning',
      icon: '🥬',
      title: 'Low Vegetable Content',
      description: 'Consider adding more vegetables for balanced nutrition',
      category: 'composition',
      priority: 6
    });
  }
  
  return flags;
}

/**
 * Generate insights (always at least 2)
 */
function generateInsights(product: ProductResult | null, plateItems: PlateItem[], flags: HealthFlag[]): HealthInsight[] {
  const insights: HealthInsight[] = [];
  
  // Priority insights from flags
  flags.slice(0, 3).forEach((flag, index) => {
    insights.push({
      type: flag.type === 'danger' ? 'negative' : flag.type === 'good' ? 'positive' : 'warning',
      title: flag.title,
      description: flag.description,
      icon: flag.icon,
      priority: 10 - index
    });
  });
  
  // Nutritional insights
  if (product?.nutrition) {
    const nutrition = product.nutrition;
    
    if (nutrition.protein && nutrition.protein > 10) {
      insights.push({
        type: 'positive',
        title: 'Good Protein Source',
        description: `Provides ${nutrition.protein}g of protein per serving`,
        icon: '💪',
        priority: 7
      });
    }
    
    if (nutrition.fiber && nutrition.fiber > 3) {
      insights.push({
        type: 'positive',
        title: 'High Fiber',
        description: `Contains ${nutrition.fiber}g of fiber - supports digestive health`,
        icon: '🌾',
        priority: 6
      });
    }
  }
  
  // Plate composition insights
  if (plateItems.length > 0) {
    const vegCount = plateItems.filter(item => item.category === 'vegetable').length;
    if (vegCount >= 2) {
      insights.push({
        type: 'positive',
        title: 'Vegetable Rich',
        description: `Contains ${vegCount} different vegetables - excellent for vitamins and minerals`,
        icon: '🥗',
        priority: 7
      });
    }
  }
  
  // Default insights if we have less than 2
  if (insights.length < 2) {
    insights.push({
      type: 'neutral',
      title: 'Nutritional Analysis',
      description: product ? 
        'Product information analyzed for health impacts' : 
        'Food items identified and categorized for nutritional assessment',
      icon: '🔬',
      priority: 5
    });
    
    insights.push({
      type: 'neutral',
      title: 'Health Recommendations',
      description: 'Consider overall dietary balance and moderation in consumption',
      icon: '⚖️',
      priority: 4
    });
  }
  
  return insights.sort((a, b) => b.priority - a.priority).slice(0, 5);
}

/**
 * Generate next action
 */
function generateNextAction(product: ProductResult | null, plateItems: PlateItem[], flags: HealthFlag[]): NextAction {
  const dangerFlags = flags.filter(f => f.type === 'danger').length;
  const warningFlags = flags.filter(f => f.type === 'warning').length;
  
  // Plate items need confirmation
  if (plateItems.length > 0 && plateItems.some(item => !item.confirmed)) {
    return {
      action: 'confirm',
      title: 'Confirm Food Items',
      description: 'Please confirm the identified food items for accurate analysis',
      buttons: [
        { label: 'Confirm All', action: 'confirm_all', variant: 'primary' },
        { label: 'Edit Items', action: 'edit_items', variant: 'secondary' },
        { label: 'Retake Photo', action: 'retake', variant: 'secondary' }
      ]
    };
  }
  
  // High risk product
  if (dangerFlags > 2) {
    return {
      action: 'avoid',
      title: 'Consider Avoiding',
      description: 'This product contains multiple concerning ingredients',
      buttons: [
        { label: 'Find Alternatives', action: 'find_alternatives', variant: 'primary' },
        { label: 'Learn More', action: 'learn_more', variant: 'secondary' },
        { label: 'Scan Another', action: 'scan_another', variant: 'secondary' }
      ]
    };
  }
  
  // Moderate risk or no clear identification
  if (warningFlags > 1 || (!product && plateItems.length === 0)) {
    return {
      action: 'manual_search',
      title: 'Need More Information',
      description: 'Try a manual search or retake the photo for better results',
      buttons: [
        { label: 'Manual Search', action: 'manual_search', variant: 'primary' },
        { label: 'Retake Photo', action: 'retake', variant: 'secondary' },
        { label: 'Skip Analysis', action: 'skip', variant: 'secondary' }
      ]
    };
  }
  
  // Good to go
  return {
    action: 'good_to_go',
    title: 'Analysis Complete',
    description: 'Review the health insights and enjoy mindfully',
    buttons: [
      { label: 'View Details', action: 'view_details', variant: 'primary' },
      { label: 'Scan Another', action: 'scan_another', variant: 'secondary' },
      { label: 'Save to Log', action: 'save_log', variant: 'secondary' }
    ]
  };
}

/**
 * Vision API wrapper with enhanced features
 */
async function analyzeImageWithVision(imageBase64: string): Promise<{ labels: any[]; logos: any[]; text: string }> {
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
          features: [
            { type: 'LABEL_DETECTION', maxResults: 15 },
            { type: 'LOGO_DETECTION', maxResults: 10 },
            { type: 'TEXT_DETECTION', maxResults: 1 }
          ]
        }]
      })
    });

    const result = await response.json();
    const response0 = result.responses[0] || {};
    
    return {
      labels: (response0.labelAnnotations || []).map((label: any) => label.description),
      logos: (response0.logoAnnotations || []),
      text: response0.textAnnotations?.[0]?.description || ''
    };
  } catch (error) {
    console.error('Vision API error:', error);
    return { labels: [], logos: [], text: '' };
  }
}

/**
 * GPT analysis wrapper
 */
async function analyzeWithGPT(prompt: string): Promise<any> {
  try {
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a nutrition expert. Return valid JSON only.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
      }),
    });

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('Empty GPT response');
    }
    
    // Clean and parse JSON
    let cleanContent = content.trim();
    if (cleanContent.startsWith('```json')) {
      cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanContent.startsWith('```')) {
      cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    return JSON.parse(cleanContent);
  } catch (error) {
    console.error('GPT analysis error:', error);
    throw error;
  }
}

/**
 * Main processing pipeline
 */
async function processScanRequest(imageBase64: string, mode: string = 'scan'): Promise<ScanResult> {
  const startTime = Date.now();
  const detectorsUsed: string[] = [];
  
  console.log(`🚀 Starting ${mode} mode processing...`);
  
  // Ping mode - just echo image metadata
  if (mode === 'ping') {
    const metadata = {
      size: Math.round((imageBase64.length * 3) / 4), // Estimate binary size
      format: 'base64',
      timestamp: new Date().toISOString()
    };
    
    return {
      success: true,
      mode: 'ping',
      confidence: 1.0,
      insights: [{
        type: 'neutral',
        title: 'Ping Successful',
        description: `Image received: ${metadata.size} bytes`,
        icon: '🏓',
        priority: 10
      }],
      nextAction: {
        action: 'good_to_go',
        title: 'Transport Working',
        description: 'Image upload and processing pipeline is operational',
        buttons: [{ label: 'Continue', action: 'continue', variant: 'primary' }]
      },
      metadata: {
        processingTime: Date.now() - startTime,
        detectorsUsed: ['ping'],
        imageAnalysis: {
          barcodeDetected: false,
          logosDetected: [],
          textExtracted: '',
          plateFoodDetected: false,
          confidence: 1.0
        }
      }
    };
  }
  
  // Scan mode - run parallel detectors
  const [barcodeResult, logoResult, textResult, plateResult] = await Promise.allSettled([
    detectBarcode(imageBase64),
    detectLogos(imageBase64),
    extractTextWithVision(imageBase64),
    classifyPlateFood(imageBase64)
  ]);
  
  // Extract results
  const barcode = barcodeResult.status === 'fulfilled' ? barcodeResult.value : { confidence: 0 };
  const logos = logoResult.status === 'fulfilled' ? logoResult.value : { logos: [], confidence: 0 };
  const text = textResult.status === 'fulfilled' ? textResult.value : { text: '', confidence: 0 };
  const plate = plateResult.status === 'fulfilled' ? plateResult.value : { plateItems: [], confidence: 0 };
  
  detectorsUsed.push('barcode', 'logo', 'ocr', 'plate');
  
  console.log('🔍 Detection results:', {
    barcode: !!barcode.barcode,
    logos: logos.logos.length,
    textLength: text.text.length,
    plateItems: plate.plateItems.length
  });
  
  // Enhanced product matching with text analysis
  let product: ProductResult | null = null;
  const productMatches: ProductMatch[] = [];
  
  if (barcode.barcode || logos.logos.length > 0 || text.text) {
    // Extract enhanced text info for evidence-based matching
    const textInfo = extractProductInfoFromText(text.text);
    
    const matches = await matchProduct(
      barcode.barcode, 
      logos.logos[0], 
      textInfo.productName,
      textInfo
    );
    productMatches.push(...matches);
    
    if (matches.length > 0) {
      const bestMatch = matches[0];
      product = transformToProductResult(bestMatch.product, barcode.barcode, textInfo);
    }
  }
  
  // Health analysis
  const healthFlags = analyzeHealthFlags(product, plate.plateItems);
  const insights = generateInsights(product, plate.plateItems, healthFlags);
  const nextAction = generateNextAction(product, plate.plateItems, healthFlags);
  
  // Calculate overall confidence
  const confidence = Math.max(
    barcode.confidence,
    logos.confidence,
    text.confidence * 0.5, // Text is less reliable
    plate.confidence
  );
  
  const result: ScanResult = {
    success: true,
    mode: 'scan',
    confidence,
    product,
    plateItems: plate.plateItems,
    insights,
    nextAction,
    metadata: {
      processingTime: Date.now() - startTime,
      detectorsUsed,
      imageAnalysis: {
        barcodeDetected: !!barcode.barcode,
        logosDetected: logos.logos,
        textExtracted: text.text.substring(0, 100),
        plateFoodDetected: plate.plateItems.length > 0,
        confidence
      },
      productMatches
    }
  };
  
  // 6) Enhanced logging for debugging misclassifications
  const textInfo = text.text ? extractProductInfoFromText(text.text) : { brandTokens: [], hasCandy: false, cleanedText: '' };
  const blockedCategories = textInfo.hasCandy ? ['beverage', 'drink', 'soda'] : [];
  const selectedProduct = product ? {
    source: productMatches[0]?.source || 'unknown',
    brand: product.brand || 'none',
    name: product.name,
    score: 0 // Will be calculated in legacy response
  } : null;
  
  console.log('🎯 Classification debug info:', {
    reqId: Date.now().toString(36),
    ocrPreview: textInfo.cleanedText.slice(0, 120),
    brandTokens: textInfo.brandTokens,
    hasCandy: textInfo.hasCandy,
    selected: selectedProduct,
    blockedCategories
  });
  
  console.log('✅ Scan processing complete:', {
    processingTime: result.metadata.processingTime,
    confidence: result.confidence,
    insightsCount: result.insights.length,
    hasProduct: !!result.product,
    plateItemsCount: result.plateItems?.length || 0
  });
  
  return result;
}

// Enhanced OCR cleanup and brand/category extraction
function extractProductInfoFromText(text: string): {
  productName?: string;
  brandTokens: string[];
  hasCandy: boolean;
  cleanedText: string;
} {
  if (!text) return { brandTokens: [], hasCandy: false, cleanedText: '' };
  
  // 1) OCR cleanup - strip noisy headers and generic words
  const cleaned = text
    .replace(/nutrition facts?[:\s]*/gi, '')
    .replace(/ingredients?[:\s]*/gi, '')
    .replace(/\b(net\s*wt|serving|calories?|fat|carb|protein)\b.*$/gi, '')
    .replace(/[•·]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .toLowerCase()
    .trim();

  // 2) Tokenize and filter stop words
  const STOP_WORDS = new Set([
    'original', 'classic', 'natural', 'organic', 'zero', 'diet', 
    'brand', 'new', 'soft', 'candy', 'gummies', 'the', 'and', 'or'
  ]);
  
  const tokens = Array.from(new Set(
    cleaned.split(/[^a-z0-9]+/g)
      .filter(token => token.length > 2 && !STOP_WORDS.has(token))
  ));

  // 3) Category detection
  const CATEGORY_HINTS = new Set(['gummy', 'gummies', 'candy', 'soft', 'chewy', 'sweet']);
  const hasCandy = tokens.some(token => CATEGORY_HINTS.has(token)) || 
                   text.toLowerCase().includes('gummies') || 
                   text.toLowerCase().includes('candy');

  // 4) Brand detection with lexicon
  const BRAND_LEXICON = new Set([
    'skittles', 'mars', 'wrigley', 'haribo', 'trolli', 'starburst',
    'coca', 'coke', 'coca-cola', 'pepsi', 'sprite', 'fanta',
    'kirkland', 'trader', 'joes', 'whole', 'foods',
    'kelloggs', 'general', 'mills', 'post', 'quaker'
  ]);
  
  const brandTokens = tokens.filter(token => BRAND_LEXICON.has(token));

  // 5) Extract product name more carefully 
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  const productLine = lines.find(line => {
    const cleanLine = line.toLowerCase();
    // Skip if it's a nutritional info line or generic word
    if (cleanLine.includes('nutrition') || cleanLine.includes('ingredients') || 
        cleanLine.includes('calories') || cleanLine.includes('serving') ||
        STOP_WORDS.has(cleanLine)) {
      return false;
    }
    
    return line.length > 3 && line.length < 50 && 
           /^[A-Z]/.test(line) && 
           !/^\d/.test(line) &&
           !line.includes('©') &&
           !line.includes('®');
  });
  
  return {
    productName: productLine,
    brandTokens,
    hasCandy,
    cleanedText: cleaned
  };
}

// Legacy wrapper for backward compatibility
function extractProductNameFromText(text: string): string | undefined {
  const info = extractProductInfoFromText(text);
  return info.productName;
}

function transformToProductResult(offProduct: any, barcode?: string, textInfo?: any): ProductResult {
  const isGenericCandy = offProduct._isGenericCandy;
  const hasCandy = textInfo?.hasCandy || false;
  
  return {
    name: offProduct.product_name || (hasCandy ? 'Gummies/Candy' : 'Unknown Product'),
    brand: offProduct.brands || undefined,
    barcode,
    category: offProduct.categories || (hasCandy ? 'candy,sweets' : 'unknown'),
    ingredients: offProduct.ingredients_text ? 
      offProduct.ingredients_text.split(',').map((ing: string) => ing.trim()) : [],
    nutrition: {
      calories: offProduct.nutriments?.energy_kcal_100g,
      protein: offProduct.nutriments?.proteins_100g,
      carbs: offProduct.nutriments?.carbohydrates_100g,
      fat: offProduct.nutriments?.fat_100g,
      fiber: offProduct.nutriments?.fiber_100g,
      sugar: offProduct.nutriments?.sugars_100g,
      sodium: offProduct.nutriments?.sodium_100g,
      saturated_fat: offProduct.nutriments?.saturated_fat_100g
    },
    allergens: offProduct.allergens_tags || [],
    flags: [],
    ...(isGenericCandy && { _isGenericCandy: true })
  } as ProductResult;
}

/**
 * CRITICAL: Legacy response mapper 
 * Converts rich ScanResult to BackendResponse format that UI expects
 * This keeps the UI unchanged while providing enhanced analysis
 */
function toLegacyBackendResponse(scan: ScanResult): BackendResponse {
  // Extract product name from various sources
  const name = scan.product?.name ||
    (scan.plateItems && scan.plateItems.length > 0 ? 
      scan.plateItems.map(item => item.name).join(', ') : 
      'Food item');

  // Convert health flags to legacy format
  const healthFlags = (scan.product?.flags || []).map(flag => ({
    type: flag.type,
    icon: '⚠️', // Default icon - UI will override with proper icons
    title: flag.title,
    description: flag.description
  }));

  // Extract nutrition data if available
  const nutritionSummary = scan.product?.nutrition || {};

  // Extract ingredients
  const ingredients = scan.product?.ingredients || [];

  // Convert insights to recommendations (what UI shows as suggestions)
  const recommendations = scan.insights.map(insight => insight.description);

  // 3) Enhanced health score calculation with candy penalty
  const isCandy = scan.product?.category?.toLowerCase().includes('candy') || 
                  scan.product?.category?.toLowerCase().includes('gummies') ||
                  scan.product?.category?.toLowerCase().includes('sweets') ||
                  (scan.product as any)?._isGenericCandy;
  
  const baseScore = isCandy ? 4.0 : 8.0; // Lower baseline for candy
  const sugarPenalty = isCandy ? 2.0 : 0; // Heuristic penalty for candy
  const dangerPenalty = (scan.product?.flags || []).filter(f => f.type === 'danger').length * 3;
  const warningPenalty = (scan.product?.flags || []).filter(f => f.type === 'warning').length * 1.5;
  const additivePenalty = (scan.product?.flags || []).filter(f => 
    f.title.toLowerCase().includes('color') || 
    f.title.toLowerCase().includes('dye') ||
    f.title.toLowerCase().includes('artificial')
  ).length * 1.0;
  
  const healthScore = Math.max(0, Math.min(10, baseScore - sugarPenalty - dangerPenalty - warningPenalty - additivePenalty));

  // Set general summary for plate items
  const generalSummary = scan.plateItems && scan.plateItems.length > 0 ? 
    `Detected ${scan.plateItems.length} food items on plate` : 
    undefined;

  // Extract barcode if detected
  const barcode = scan.product?.barcode;

  return {
    productName: name,
    healthScore: Math.round(healthScore * 10) / 10, // Round to 1 decimal
    healthFlags,
    nutritionSummary,
    ingredients,
    recommendations: recommendations.length >= 2 ? recommendations : [
      'Product analyzed for health factors',
      'Consider overall dietary balance and moderation'
    ],
    generalSummary,
    barcode
  };
}
// Main serve function
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Enhanced Health Scanner function called');
    
    const body = await req.json();
    console.log('📦 Request body:', {
      mode: body.mode,
      dataLength: body.imageBase64?.length || 0
    });
    
    const { imageBase64, mode = 'scan', format = 'legacy' } = body;
    
    if (!imageBase64) {
      throw new Error('Missing imageBase64 parameter');
    }
    
    // Clean base64 data
    const cleanImageData = imageBase64.replace(/^data:image\/[^;]+;base64,/, '');
    
    const scanResult = await processScanRequest(cleanImageData, mode);
    
    // Return legacy format by default (what UI expects)
    // Use ?format=scan for debugging raw ScanResult
    const response = format === 'scan' ? scanResult : toLegacyBackendResponse(scanResult);
    
    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('💥 Enhanced Health Scanner error:', error);
    
    // Return legacy error format that UI can handle
    const errorResponse: BackendResponse = {
      productName: 'Processing Error',
      healthScore: 0,
      healthFlags: [{
        type: 'danger',
        icon: '❌',
        title: 'Analysis Failed',
        description: `Error: ${error.message}`
      }],
      nutritionSummary: {},
      ingredients: [],
      recommendations: [
        'Image processing failed - please try again',
        'Consider retaking the photo or using manual entry'
      ]
    };
    
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
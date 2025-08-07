import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProductSearchRequest {
  productName: string;
  ocrText?: string;
  barcode?: string;
}

interface NutritionData {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
}

interface BrandedProductMatch {
  found: boolean;
  confidence: number;
  productId?: string;
  productName?: string;
  brandName?: string;
  nutrition?: NutritionData;
  source: 'usda' | 'openfoodfacts' | 'barcode' | 'category_fallback' | 'gpt-fallback' | 'failed';
  nutritionSource: 'usda' | 'openfoodfacts' | 'gpt-fallback' | 'category' | 'failed';
  confidenceLabel: string;
  isLowConfidence: boolean;
  category?: string;
  warningMessage?: string;
  debugInfo: {
    searchQuery: string;
    candidatesFound: number;
    matchMethod: string;
    searchVariations?: string[];
    fallbackReason?: string;
    confidenceBreakdown?: Record<string, number>;
  };
  lookupTrace?: {
    tried: string[];
    matchedBrand?: string;
    finalSource: string;
    confidence: number;
  };
}

// Filler words to ignore in matching
const FILLER_WORDS = new Set([
  'with', 'a', 'an', 'the', 'extra', 'large', 'small', 'medium', 'regular', 
  'original', 'classic', 'traditional', 'fresh', 'hot', 'cold', 'new', 'special'
]);

// Category-based nutrition fallbacks
const CATEGORY_FALLBACKS: Record<string, NutritionData> = {
  'burger': { calories: 760, protein: 30, carbs: 50, fat: 45, fiber: 3, sugar: 6, sodium: 1200 },
  'cheeseburger': { calories: 840, protein: 35, carbs: 52, fat: 52, fiber: 3, sugar: 7, sodium: 1400 },
  'pizza': { calories: 280, protein: 12, carbs: 30, fat: 12, fiber: 2, sugar: 4, sodium: 640 },
  'cookie': { calories: 130, protein: 2, carbs: 18, fat: 6, fiber: 1, sugar: 12, sodium: 95 },
  'shake': { calories: 400, protein: 10, carbs: 50, fat: 15, fiber: 0, sugar: 45, sodium: 200 },
  'fries': { calories: 365, protein: 4, carbs: 63, fat: 17, fiber: 4, sugar: 0.3, sodium: 246 },
  'sandwich': { calories: 450, protein: 25, carbs: 40, fat: 22, fiber: 3, sugar: 5, sodium: 900 },
  'salad': { calories: 180, protein: 8, carbs: 15, fat: 12, fiber: 6, sugar: 8, sodium: 320 },
  'soup': { calories: 120, protein: 6, carbs: 18, fat: 3, fiber: 3, sugar: 4, sodium: 800 },
  'pasta': { calories: 350, protein: 12, carbs: 65, fat: 8, fiber: 3, sugar: 3, sodium: 400 },
  'chicken': { calories: 540, protein: 38, carbs: 25, fat: 31, fiber: 1, sugar: 2, sodium: 1100 },
  'fish': { calories: 280, protein: 32, carbs: 8, fat: 14, fiber: 0, sugar: 1, sodium: 520 },
  'taco': { calories: 320, protein: 15, carbs: 28, fat: 17, fiber: 4, sugar: 2, sodium: 640 },
  'burrito': { calories: 580, protein: 22, carbs: 68, fat: 22, fiber: 8, sugar: 4, sodium: 1200 },
  'wrap': { calories: 420, protein: 18, carbs: 45, fat: 18, fiber: 5, sugar: 3, sodium: 860 },
  'donut': { calories: 260, protein: 4, carbs: 31, fat: 14, fiber: 1, sugar: 12, sodium: 300 },
  'muffin': { calories: 280, protein: 5, carbs: 42, fat: 11, fiber: 2, sugar: 18, sodium: 240 },
  'cereal': { calories: 150, protein: 4, carbs: 32, fat: 2, fiber: 4, sugar: 12, sodium: 180 },
  'yogurt': { calories: 100, protein: 6, carbs: 16, fat: 0, fiber: 0, sugar: 14, sodium: 65 },
  'smoothie': { calories: 220, protein: 8, carbs: 45, fat: 2, fiber: 5, sugar: 38, sodium: 85 }
};

// Enhanced food categorization
function detectFoodCategory(foodName: string): string | null {
  const normalized = foodName.toLowerCase();
  
  // Specific brand items first
  if (normalized.includes('whopper') || normalized.includes('big mac') || normalized.includes('quarter pounder')) {
    return 'burger';
  }
  
  // General category detection
  const categoryKeywords = {
    'burger': ['burger', 'patty', 'beef sandwich'],
    'cheeseburger': ['cheeseburger', 'cheese burger', 'burger with cheese'],
    'pizza': ['pizza', 'slice', 'pie'],
    'fries': ['fries', 'french fries', 'potato fries', 'chips'],
    'shake': ['shake', 'milkshake', 'smoothie shake'],
    'sandwich': ['sandwich', 'sub', 'hoagie', 'panini'],
    'salad': ['salad', 'greens', 'lettuce'],
    'soup': ['soup', 'broth', 'bisque', 'chowder'],
    'pasta': ['pasta', 'spaghetti', 'noodles', 'macaroni'],
    'chicken': ['chicken', 'poultry', 'wings', 'nuggets'],
    'fish': ['fish', 'salmon', 'tuna', 'cod', 'seafood'],
    'taco': ['taco', 'soft taco', 'hard taco'],
    'burrito': ['burrito', 'wrap burrito'],
    'wrap': ['wrap', 'tortilla wrap'],
    'donut': ['donut', 'doughnut', 'glazed'],
    'muffin': ['muffin', 'cupcake'],
    'cookie': ['cookie', 'biscuit'],
    'cereal': ['cereal', 'granola', 'oats'],
    'yogurt': ['yogurt', 'yoghurt'],
    'smoothie': ['smoothie', 'blend']
  };
  
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(keyword => normalized.includes(keyword))) {
      return category;
    }
  }
  
  return null;
}

// Generate search variations for better matching
function generateSearchVariations(productName: string, ocrText?: string): string[] {
  const variations: string[] = [productName];
  const normalized = productName.toLowerCase().trim();
  
  // Add OCR text variation
  if (ocrText) {
    variations.push(`${productName} ${ocrText}`);
    variations.push(ocrText);
  }
  
  // Word order variations
  const words = normalized.split(/\s+/).filter(word => !FILLER_WORDS.has(word));
  if (words.length > 1) {
    variations.push(words.reverse().join(' ')); // Reverse order
    variations.push(words.slice(1).concat(words[0]).join(' ')); // Move first to end
  }
  
  // Brand context additions for known items
  if (normalized.includes('whopper')) {
    variations.push('burger king whopper');
    variations.push('whopper burger king');
  }
  if (normalized.includes('big mac')) {
    variations.push('mcdonalds big mac');
    variations.push('big mac mcdonalds');
  }
  if (normalized.includes('quarter pounder')) {
    variations.push('mcdonalds quarter pounder');
    variations.push('quarter pounder mcdonalds');
  }
  
  // Remove duplicates while preserving order
  return [...new Set(variations)];
}

// Enhanced similarity calculation
function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix = [];
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[str2.length][str1.length];
}

// Multi-pass fuzzy matching with confidence breakdown
function calculateAdvancedSimilarity(queryName: string, productName: string, brandName: string = ''): {
  score: number;
  confidence: number;
  breakdown: Record<string, number>;
} {
  const normalizeText = (text: string) => text.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
  
  const queryNorm = normalizeText(queryName);
  const productNorm = normalizeText(productName);
  const brandNorm = normalizeText(brandName);
  
  const breakdown: Record<string, number> = {};
  let totalScore = 0;
  let weights = 0;
  
  // 1. Exact match
  if (queryNorm === productNorm) {
    return { score: 1.0, confidence: 100, breakdown: { exact_match: 100 } };
  }
  
  // 2. Word matching with filler word filtering
  const queryWords = queryNorm.split(' ').filter(w => w.length > 2 && !FILLER_WORDS.has(w));
  const productWords = productNorm.split(' ').filter(w => w.length > 2 && !FILLER_WORDS.has(w));
  
  let wordMatchScore = 0;
  let wordMatches = 0;
  
  for (const queryWord of queryWords) {
    let bestMatch = 0;
    for (const productWord of productWords) {
      const similarity = calculateSimilarity(queryWord, productWord);
      bestMatch = Math.max(bestMatch, similarity);
    }
    if (bestMatch > 0.7) {
      wordMatches++;
      wordMatchScore += bestMatch;
    }
  }
  
  if (queryWords.length > 0) {
    const wordScore = (wordMatchScore / queryWords.length) * (wordMatches / queryWords.length);
    breakdown.word_matching = Math.round(wordScore * 100);
    totalScore += wordScore * 0.6;
    weights += 0.6;
  }
  
  // 3. Overall string similarity
  const overallSimilarity = calculateSimilarity(queryNorm, productNorm);
  breakdown.string_similarity = Math.round(overallSimilarity * 100);
  totalScore += overallSimilarity * 0.3;
  weights += 0.3;
  
  // 4. Brand boost
  if (brandNorm && queryNorm.includes(brandNorm)) {
    breakdown.brand_match = 15;
    totalScore += 0.15;
    weights += 0.1;
  }
  
  const finalScore = Math.min(totalScore / Math.max(weights, 1), 1.0);
  const confidence = Math.round(finalScore * 100);
  
  return { score: finalScore, confidence, breakdown };
}

// Extract nutrition from USDA or Open Food Facts
function extractNutritionUSDA(product: any): NutritionData | null {
  if (!product.foodNutrients) return null;
  
  const nutrients: Record<string, number> = {};
  for (const nutrient of product.foodNutrients) {
    const name = nutrient.nutrientName?.toLowerCase();
    const value = nutrient.value || 0;
    
    if (name?.includes('energy') || name?.includes('calorie')) nutrients.calories = value;
    if (name?.includes('protein')) nutrients.protein = value;
    if (name?.includes('carbohydrate')) nutrients.carbs = value;
    if (name?.includes('total lipid') || name?.includes('fat')) nutrients.fat = value;
    if (name?.includes('fiber')) nutrients.fiber = value;
    if (name?.includes('sugars')) nutrients.sugar = value;
    if (name?.includes('sodium')) nutrients.sodium = value;
  }
  
  return {
    calories: Math.round(nutrients.calories || 0),
    protein: Math.round((nutrients.protein || 0) * 10) / 10,
    carbs: Math.round((nutrients.carbs || 0) * 10) / 10,
    fat: Math.round((nutrients.fat || 0) * 10) / 10,
    fiber: Math.round((nutrients.fiber || 0) * 10) / 10,
    sugar: Math.round((nutrients.sugar || 0) * 10) / 10,
    sodium: Math.round(nutrients.sodium || 0)
  };
}

function extractNutritionOFF(product: any): NutritionData | null {
  const nutriments = product.nutriments;
  if (!nutriments) return null;

  const servingSizeMultiplier = 1.0; // Use per 100g values directly

  return {
    calories: Math.round((nutriments.energy_kcal_100g || nutriments['energy-kcal_100g'] || 0) * servingSizeMultiplier),
    protein: Math.round(((nutriments.proteins_100g || nutriments['proteins_100g'] || 0) * servingSizeMultiplier) * 10) / 10,
    carbs: Math.round(((nutriments.carbohydrates_100g || nutriments['carbohydrates_100g'] || 0) * servingSizeMultiplier) * 10) / 10,
    fat: Math.round(((nutriments.fat_100g || nutriments['fat_100g'] || 0) * servingSizeMultiplier) * 10) / 10,
    fiber: Math.round(((nutriments.fiber_100g || nutriments['fiber_100g'] || 0) * servingSizeMultiplier) * 10) / 10,
    sugar: Math.round(((nutriments.sugars_100g || nutriments['sugars_100g'] || 0) * servingSizeMultiplier) * 10) / 10,
    sodium: Math.round((nutriments.sodium_100g || nutriments['sodium_100g'] || 0) * servingSizeMultiplier * 1000)
  };
}

// Generate confidence label based on confidence score and source
function generateConfidenceLabel(confidence: number, source: string): string {
  if (source === 'usda' || source === 'openfoodfacts') {
    return `Official source: ${source.toUpperCase()}`;
  }
  
  if (confidence < 50) {
    return '⚠️ Estimate – official data not found';
  } else if (confidence < 80) {
    return 'AI estimate based on branded items';
  } else {
    return 'AI nutrition estimate – looks accurate 👍';
  }
}

// Extract brand name from product name or explicit brand field
function extractBrandName(productName: string, brandField?: string): string | undefined {
  if (brandField) return brandField;
  
  const normalized = productName.toLowerCase();
  const brandKeywords = {
    'mcdonalds': ['mcdonald', 'mcd', 'big mac', 'quarter pounder'],
    'burger king': ['burger king', 'bk', 'whopper'],
    'subway': ['subway'],
    'starbucks': ['starbucks'],
    'kfc': ['kfc', 'kentucky fried'],
    'taco bell': ['taco bell'],
    'pizza hut': ['pizza hut'],
    'dominos': ['dominos'],
    'wendys': ['wendys'],
    'chipotle': ['chipotle']
  };
  
  for (const [brand, keywords] of Object.entries(brandKeywords)) {
    if (keywords.some(keyword => normalized.includes(keyword))) {
      return brand;
    }
  }
  
  return undefined;
}

// GPT fallback for nutrition estimation
async function estimateNutritionWithGPT(productName: string): Promise<NutritionData | null> {
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openAIApiKey) {
    console.log('⚠️ OpenAI API key not available, skipping GPT fallback');
    return null;
  }

  try {
    console.log('🧠 Attempting GPT nutrition estimation for:', productName);
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a nutrition expert. Estimate nutritional information for foods. Return only valid JSON with calories, protein, carbs, fat, fiber, sugar, sodium (all numbers). Be realistic and conservative with estimates.'
          },
          {
            role: 'user',
            content: `Estimate nutrition info for: "${productName}". Return JSON only with: {"calories": number, "protein": number, "carbs": number, "fat": number, "fiber": number, "sugar": number, "sodium": number}`
          }
        ],
        temperature: 0.3,
        max_tokens: 200
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const content = data.choices[0].message.content;
      
      try {
        const nutrition = JSON.parse(content);
        
        // Validate the response has required fields and reasonable values
        if (nutrition.calories > 0 && nutrition.calories < 5000 && 
            typeof nutrition.protein === 'number' && 
            typeof nutrition.carbs === 'number' && 
            typeof nutrition.fat === 'number') {
          
          console.log('✅ GPT nutrition estimation successful:', nutrition);
          return {
            calories: Math.round(nutrition.calories),
            protein: Math.round(nutrition.protein * 10) / 10,
            carbs: Math.round(nutrition.carbs * 10) / 10,
            fat: Math.round(nutrition.fat * 10) / 10,
            fiber: Math.round((nutrition.fiber || 0) * 10) / 10,
            sugar: Math.round((nutrition.sugar || 0) * 10) / 10,
            sodium: Math.round(nutrition.sodium || 0)
          };
        }
      } catch (parseError) {
        console.log('❌ Failed to parse GPT response:', content);
      }
    }
  } catch (error) {
    console.log('❌ GPT nutrition estimation failed:', error.message);
  }
  
  return null;
}

// Log failed lookups for training
async function logFailedLookup(supabase: any, userId: string, foodName: string, confidence: number, reason: string) {
  try {
    await supabase.from('failed_food_lookups').insert({
      user_id: userId,
      food_name: foodName,
      confidence: confidence,
      failure_reason: reason,
      created_at: new Date().toISOString()
    });
    console.log(`📝 Logged failed lookup: ${foodName} (${confidence}% confidence)`);
  } catch (error) {
    console.log(`❌ Failed to log lookup failure: ${error.message}`);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { productName, ocrText, barcode }: ProductSearchRequest = await req.json();
    
    console.log('🔍 Starting comprehensive branded product search:', { productName, hasOCR: !!ocrText, hasBarcode: !!barcode });

    const lookupTrace: string[] = [];
    let result: BrandedProductMatch = {
      found: false,
      confidence: 0,
      source: 'failed',
      nutritionSource: 'failed',
      confidenceLabel: '',
      isLowConfidence: true,
      debugInfo: {
        searchQuery: productName,
        candidatesFound: 0,
        matchMethod: 'none'
      }
    };

    // STEP 1: Barcode lookup (highest priority)
    if (barcode?.trim()) {
      console.log('🏷️ BARCODE LOOKUP:', barcode);
      lookupTrace.push('barcode');
      
      try {
        const barcodeResponse = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`);
        
        if (barcodeResponse.ok) {
          const barcodeData = await barcodeResponse.json();
          
          if (barcodeData.status === 1 && barcodeData.product) {
            const nutrition = extractNutritionOFF(barcodeData.product);
            
            if (nutrition && nutrition.calories > 0) {
              const finalConfidence = 99;
              result = {
                found: true,
                confidence: finalConfidence,
                productId: barcode,
                productName: barcodeData.product.product_name || productName,
                brandName: barcodeData.product.brands,
                nutrition,
                source: 'barcode',
                nutritionSource: 'openfoodfacts',
                confidenceLabel: generateConfidenceLabel(finalConfidence, 'openfoodfacts'),
                isLowConfidence: false,
                debugInfo: {
                  searchQuery: barcode,
                  candidatesFound: 1,
                  matchMethod: 'barcode_exact_match'
                },
                lookupTrace: {
                  tried: lookupTrace,
                  finalSource: 'barcode',
                  confidence: finalConfidence
                }
              };
              
              console.log('✅ BARCODE SUCCESS:', result.productName);
              return new Response(JSON.stringify(result), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              });
            }
          }
        }
      } catch (error) {
        console.log('❌ Barcode lookup failed:', error.message);
      }
    }

    // STEP 2: Generate search variations
    const searchVariations = generateSearchVariations(productName, ocrText);
    console.log('🔄 Search variations:', searchVariations);

    let bestMatch: any = null;
    let bestScore = 0;
    let bestConfidence = 0;
    let bestSource = '';
    let totalCandidates = 0;

    // STEP 3: Try USDA FoodData Central (highest priority for official data)
    lookupTrace.push('usda');
    const usdaApiKey = Deno.env.get('USDA_API_KEY');
    if (usdaApiKey) {
      console.log('🇺🇸 Searching USDA FoodData Central...');
      
      for (const variation of searchVariations.slice(0, 3)) {
        try {
          const usdaUrl = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${usdaApiKey}&query=${encodeURIComponent(variation)}&dataType=Branded&pageSize=15`;
          const usdaResponse = await fetch(usdaUrl);
          
          if (usdaResponse.ok) {
            const usdaData = await usdaResponse.json();
            totalCandidates += usdaData.foods?.length || 0;
            
            for (const food of usdaData.foods || []) {
              const matchResult = calculateAdvancedSimilarity(productName, food.description || '', food.brandName || '');
              
              if (matchResult.confidence > bestConfidence) {
                const nutrition = extractNutritionUSDA(food);
                if (nutrition && nutrition.calories > 0) {
                  bestMatch = food;
                  bestScore = matchResult.score;
                  bestConfidence = matchResult.confidence;
                  bestSource = 'usda';
                  result.debugInfo.confidenceBreakdown = matchResult.breakdown;
                }
              }
            }
          }
        } catch (error) {
          console.log(`❌ USDA search failed for "${variation}":`, error.message);
        }
      }
    }

    // STEP 4: Try Open Food Facts (backup source)
    lookupTrace.push('openfoodfacts');
    console.log('🌍 Searching Open Food Facts...');
    
    for (const variation of searchVariations.slice(0, 4)) {
      try {
        // Enhanced OFF search with better brand filtering
        const detectedBrand = extractBrandName(productName);
        let offUrl = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(variation)}&search_simple=1&action=process&json=1&page_size=15`;
        
        // Add brand filter if detected
        if (detectedBrand) {
          offUrl += `&brands=${encodeURIComponent(detectedBrand)}`;
        }
        
        const offResponse = await fetch(offUrl);
        
        if (offResponse.ok) {
          const offData = await offResponse.json();
          totalCandidates += offData.products?.length || 0;
          
          for (const product of offData.products || []) {
            if (!product.product_name) continue;
            
            const matchResult = calculateAdvancedSimilarity(productName, product.product_name, product.brands || '');
            
            if (matchResult.confidence > bestConfidence) {
              const nutrition = extractNutritionOFF(product);
              if (nutrition && nutrition.calories > 0) {
                bestMatch = product;
                bestScore = matchResult.score;
                bestConfidence = matchResult.confidence;
                bestSource = 'openfoodfacts';
                result.debugInfo.confidenceBreakdown = matchResult.breakdown;
              }
            }
          }
        }
      } catch (error) {
        console.log(`❌ Open Food Facts search failed for "${variation}":`, error.message);
      }
    }

    result.debugInfo.candidatesFound = totalCandidates;
    result.debugInfo.searchVariations = searchVariations;

    // STEP 5: Apply confidence thresholds for official sources
    if (bestMatch && bestConfidence >= 70) {
      console.log(`✅ HIGH CONFIDENCE MATCH (${bestConfidence}%):`, bestMatch.product_name || bestMatch.description);
      
      const nutrition = bestSource === 'usda' ? extractNutritionUSDA(bestMatch) : extractNutritionOFF(bestMatch);
      const detectedBrand = extractBrandName(productName, bestMatch.brands || bestMatch.brandName);
      
      result = {
        found: true,
        confidence: bestConfidence,
        productId: bestMatch.code || bestMatch.fdcId?.toString(),
        productName: bestMatch.product_name || bestMatch.description,
        brandName: bestMatch.brands || bestMatch.brandName,
        nutrition: nutrition!,
        source: bestSource as any,
        nutritionSource: bestSource as any,
        confidenceLabel: generateConfidenceLabel(bestConfidence, bestSource),
        isLowConfidence: false,
        debugInfo: {
          ...result.debugInfo,
          matchMethod: `${bestSource}_high_confidence_${bestConfidence}%`
        },
        lookupTrace: {
          tried: lookupTrace,
          matchedBrand: detectedBrand,
          finalSource: bestSource,
          confidence: bestConfidence
        }
      };
      
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // STEP 6: Medium confidence - try GPT fallback first, then category fallback
    if (bestMatch && bestConfidence >= 20 && bestConfidence < 70) {
      console.log(`⚠️ MEDIUM CONFIDENCE (${bestConfidence}%) - Trying GPT fallback first`);
      
      const detectedBrand = extractBrandName(productName, bestMatch.brands || bestMatch.brandName);
      const category = detectFoodCategory(productName);
      
      // Don't use GPT fallback if we have exact brand match and clear category
      if (detectedBrand && category && !detectedBrand.toLowerCase().includes('generic')) {
        console.log(`🚫 Skipping GPT fallback - exact brand "${detectedBrand}" with category "${category}" detected`);
      } else {
        // Try GPT fallback
        lookupTrace.push('gpt');
        const gptNutrition = await estimateNutritionWithGPT(productName);
        
        if (gptNutrition && gptNutrition.calories > 0) {
          // Boost confidence for GPT if brand + category match is strong
          let adjustedConfidence = bestConfidence;
          if (detectedBrand && category) {
            adjustedConfidence = Math.min(82, bestConfidence + 25); // Boost to 80+ range
          }
          
          result = {
            found: true,
            confidence: adjustedConfidence,
            productId: bestMatch.code || bestMatch.fdcId?.toString(),
            productName: bestMatch.product_name || bestMatch.description || productName,
            brandName: bestMatch.brands || bestMatch.brandName || detectedBrand,
            nutrition: gptNutrition,
            source: 'gpt-fallback',
            nutritionSource: 'gpt-fallback',
            confidenceLabel: generateConfidenceLabel(adjustedConfidence, 'gpt-fallback'),
            isLowConfidence: adjustedConfidence < 50,
            category,
            warningMessage: adjustedConfidence < 50 ? "⚠️ Estimate – official data not found" : undefined,
            debugInfo: {
              ...result.debugInfo,
              matchMethod: `gpt_fallback_${adjustedConfidence}%`
            },
            lookupTrace: {
              tried: lookupTrace,
              matchedBrand: detectedBrand,
              finalSource: 'gpt-fallback',
              confidence: adjustedConfidence
            }
          };
          
          return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }
      
      // Fall back to category if GPT failed or was skipped
      if (category && CATEGORY_FALLBACKS[category]) {
        result = {
          found: true,
          confidence: bestConfidence,
          productId: bestMatch.code || bestMatch.fdcId?.toString(),
          productName: bestMatch.product_name || bestMatch.description,
          brandName: bestMatch.brands || bestMatch.brandName || detectedBrand,
          nutrition: CATEGORY_FALLBACKS[category],
          source: 'category_fallback',
          nutritionSource: 'category',
          confidenceLabel: 'AI estimate based on branded items',
          isLowConfidence: bestConfidence < 50,
          category,
          warningMessage: "We used a smart estimate based on food category. You can edit or continue.",
          debugInfo: {
            ...result.debugInfo,
            matchMethod: `category_fallback_${category}_${bestConfidence}%`
          },
          lookupTrace: {
            tried: lookupTrace,
            matchedBrand: detectedBrand,
            finalSource: 'category_fallback',
            confidence: bestConfidence
          }
        };
        
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // STEP 7: Pure GPT fallback (no matches found)
    lookupTrace.push('gpt');
    const gptNutrition = await estimateNutritionWithGPT(productName);
    
    if (gptNutrition && gptNutrition.calories > 0) {
      const detectedBrand = extractBrandName(productName);
      const category = detectFoodCategory(productName);
      let gptConfidence = 45; // Default GPT confidence
      
      // Boost confidence if we detect brand + category
      if (detectedBrand && category) {
        gptConfidence = 75; // Higher confidence for branded items with clear category
      } else if (category) {
        gptConfidence = 60; // Medium confidence for categorized items
      }
      
      result = {
        found: true,
        confidence: gptConfidence,
        productName: productName,
        brandName: detectedBrand,
        nutrition: gptNutrition,
        source: 'gpt-fallback',
        nutritionSource: 'gpt-fallback',
        confidenceLabel: generateConfidenceLabel(gptConfidence, 'gpt-fallback'),
        isLowConfidence: gptConfidence < 50,
        category,
        warningMessage: gptConfidence < 50 ? "⚠️ Estimate – official data not found" : undefined,
        debugInfo: {
          ...result.debugInfo,
          matchMethod: `pure_gpt_fallback_${gptConfidence}%`
        },
        lookupTrace: {
          tried: lookupTrace,
          matchedBrand: detectedBrand,
          finalSource: 'gpt-fallback',
          confidence: gptConfidence
        }
      };
      
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // STEP 8: Pure category fallback (last resort)
    const category = detectFoodCategory(productName);
    if (category && CATEGORY_FALLBACKS[category]) {
      console.log(`🎯 CATEGORY FALLBACK: Detected "${category}" for "${productName}"`);
      
      result = {
        found: true,
        confidence: 50,
        productName: productName,
        nutrition: CATEGORY_FALLBACKS[category],
        source: 'category_fallback',
        nutritionSource: 'category',
        confidenceLabel: 'AI estimate based on branded items',
        isLowConfidence: false,
        category,
        warningMessage: "We used a smart estimate based on food category. You can edit or continue.",
        debugInfo: {
          ...result.debugInfo,
          matchMethod: `pure_category_fallback_${category}`
        },
        lookupTrace: {
          tried: lookupTrace,
          finalSource: 'category_fallback',
          confidence: 50
        }
      };
      
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // STEP 9: Log failure and reject
    console.log(`❌ LOOKUP FAILED: No suitable matches found (best: ${bestConfidence}%)`);
    
    await logFailedLookup(supabase, user.id, productName, bestConfidence, 'no_suitable_matches');
    
    result = {
      found: false,
      confidence: bestConfidence,
      source: 'failed',
      nutritionSource: 'failed',
      confidenceLabel: '⚠️ Estimate – official data not found',
      isLowConfidence: true,
      debugInfo: {
        ...result.debugInfo,
        matchMethod: 'failed_all_methods',
        fallbackReason: `insufficient_confidence_${bestConfidence}%`
      },
      lookupTrace: {
        tried: lookupTrace,
        finalSource: 'failed',
        confidence: bestConfidence
      }
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Error in match-branded-product function:', error);
    return new Response(
      JSON.stringify({ 
        error: true,
        message: `Branded product matching failed: ${error.message}`
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
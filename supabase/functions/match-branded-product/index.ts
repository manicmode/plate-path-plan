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
  source: 'barcode' | 'fuzzy_match' | 'fallback';
  debugInfo: {
    searchQuery: string;
    candidatesFound: number;
    matchMethod: string;
    fallbackReason?: string;
  };
}

// Enhanced fuzzy matching with multi-term analysis
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

// Enhanced multi-term fuzzy matching for complex product names
function calculateEnhancedSimilarity(queryName: string, productName: string, ocrText: string = '', brandName: string = ''): {
  score: number;
  matchType: 'exact' | 'fuzzy_high' | 'fuzzy_medium' | 'fuzzy_low';
  details: string[];
} {
  const normalizeText = (text: string) => text.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
  
  const queryNorm = normalizeText(queryName);
  const productNorm = normalizeText(productName);
  const ocrNorm = normalizeText(ocrText);
  const brandNorm = normalizeText(brandName);
  
  const details: string[] = [];
  let totalScore = 0;
  let weights = 0;
  
  // 1. Exact match check
  if (queryNorm === productNorm) {
    return { score: 1.0, matchType: 'exact', details: ['exact_name_match'] };
  }
  
  // 2. Word-by-word matching for complex names like "Nutrail Honey Nut Granola"
  const queryWords = queryNorm.split(' ').filter(w => w.length > 2);
  const productWords = productNorm.split(' ').filter(w => w.length > 2);
  const ocrWords = ocrNorm.split(' ').filter(w => w.length > 2);
  
  let wordMatchScore = 0;
  let wordMatches = 0;
  
  for (const queryWord of queryWords) {
    let bestWordMatch = 0;
    let matchedWord = '';
    
    // Check against product words
    for (const productWord of productWords) {
      const similarity = calculateSimilarity(queryWord, productWord);
      if (similarity > bestWordMatch) {
        bestWordMatch = similarity;
        matchedWord = productWord;
      }
    }
    
    // Also check against OCR words for package text
    for (const ocrWord of ocrWords) {
      const similarity = calculateSimilarity(queryWord, ocrWord);
      if (similarity > bestWordMatch) {
        bestWordMatch = similarity;
        matchedWord = ocrWord;
      }
    }
    
    if (bestWordMatch > 0.7) {
      wordMatches++;
      wordMatchScore += bestWordMatch;
      details.push(`word_match: ${queryWord} -> ${matchedWord} (${Math.round(bestWordMatch * 100)}%)`);
    }
  }
  
  if (queryWords.length > 0) {
    const avgWordScore = wordMatchScore / queryWords.length;
    const wordCoverage = wordMatches / queryWords.length;
    const wordScore = avgWordScore * wordCoverage;
    totalScore += wordScore * 0.6; // 60% weight for word matching
    weights += 0.6;
    details.push(`word_coverage: ${wordMatches}/${queryWords.length} (${Math.round(wordCoverage * 100)}%)`);
  }
  
  // 3. Overall string similarity
  const overallSimilarity = calculateSimilarity(queryNorm, productNorm);
  totalScore += overallSimilarity * 0.3; // 30% weight
  weights += 0.3;
  details.push(`overall_similarity: ${Math.round(overallSimilarity * 100)}%`);
  
  // 4. Brand matching boost
  if (brandNorm && (queryNorm.includes(brandNorm) || ocrNorm.includes(brandNorm))) {
    const brandBoost = 0.15;
    totalScore += brandBoost;
    weights += 0.1;
    details.push(`brand_boost: +${Math.round(brandBoost * 100)}%`);
  }
  
  // 5. OCR context matching for package patterns
  if (ocrText) {
    // Look for common package terms that indicate food products
    const packageTerms = ['net wt', 'weight', 'oz', 'lb', 'gram', 'serving', 'calories', 'nutrition', 'ingredients'];
    const ocrLower = ocrText.toLowerCase();
    const packageTermFound = packageTerms.some(term => ocrLower.includes(term));
    
    if (packageTermFound) {
      totalScore += 0.05; // Small boost for package context
      details.push('package_context_boost: +5%');
    }
    
    // Check if query appears in OCR text
    const ocrContainsQuery = ocrLower.includes(queryNorm) || queryWords.some(word => ocrLower.includes(word));
    if (ocrContainsQuery) {
      totalScore += 0.1;
      details.push('ocr_contains_query: +10%');
    }
  }
  
  const finalScore = Math.min(totalScore / Math.max(weights, 1), 1.0);
  
  // Determine match type based on score
  let matchType: 'exact' | 'fuzzy_high' | 'fuzzy_medium' | 'fuzzy_low';
  if (finalScore >= 0.9) matchType = 'fuzzy_high';
  else if (finalScore >= 0.75) matchType = 'fuzzy_medium';
  else matchType = 'fuzzy_low';
  
  return { score: finalScore, matchType, details };
}

// Extract nutrition data from Open Food Facts product
function extractNutrition(product: any): NutritionData | null {
  const nutriments = product.nutriments;
  if (!nutriments) return null;

  // Convert per 100g values to reasonable serving sizes
  const servingSizeMultiplier = 0.3; // Assume ~30g serving for most products

  const nutrition = {
    calories: Math.round((nutriments.energy_kcal_100g || nutriments['energy-kcal_100g'] || 0) * servingSizeMultiplier),
    protein: Math.round(((nutriments.proteins_100g || nutriments['proteins_100g'] || 0) * servingSizeMultiplier) * 10) / 10,
    carbs: Math.round(((nutriments.carbohydrates_100g || nutriments['carbohydrates_100g'] || 0) * servingSizeMultiplier) * 10) / 10,
    fat: Math.round(((nutriments.fat_100g || nutriments['fat_100g'] || 0) * servingSizeMultiplier) * 10) / 10,
    fiber: Math.round(((nutriments.fiber_100g || nutriments['fiber_100g'] || 0) * servingSizeMultiplier) * 10) / 10,
    sugar: Math.round(((nutriments.sugars_100g || nutriments['sugars_100g'] || 0) * servingSizeMultiplier) * 10) / 10,
    sodium: Math.round((nutriments.sodium_100g || nutriments['sodium_100g'] || 0) * servingSizeMultiplier * 1000) // Convert to mg
  };

  return nutrition;
}

// Check if nutrition data is incomplete/missing
function isNutritionIncomplete(nutrition: NutritionData): boolean {
  // Consider incomplete if major macros are all zero or missing
  const majorMacros = nutrition.protein + nutrition.carbs + nutrition.fat;
  
  // If calories are very low but macros exist, it's okay
  // If major macros are all zero/very low, it's likely incomplete
  return majorMacros < 0.5 && nutrition.calories < 10;
}

// Generate fallback nutrition estimates based on food name
function generateFallbackNutrition(productName: string): NutritionData {
  const name = productName.toLowerCase();
  
  // Enhanced burger/sandwich pattern matching
  if (name.includes('whopper') || name.includes('big mac') || name.includes('quarter pounder')) {
    return { calories: 760, protein: 30, carbs: 50, fat: 45, fiber: 3, sugar: 8, sodium: 1200 };
  }
  if (name.includes('burger') || name.includes('cheeseburger') || (name.includes('with') && name.includes('cheese') && (name.includes('burger') || name.includes('whopper')))) {
    return { calories: 650, protein: 28, carbs: 45, fat: 38, fiber: 3, sugar: 6, sodium: 1100 };
  }
  if (name.includes('sandwich') || name.includes('sub') || name.includes('hoagie')) {
    return { calories: 450, protein: 22, carbs: 40, fat: 20, fiber: 4, sugar: 5, sodium: 900 };
  }
  if (name.includes('pizza')) {
    return { calories: 280, protein: 12, carbs: 30, fat: 12, fiber: 2, sugar: 4, sodium: 640 };
  }
  if (name.includes('fries') || name.includes('french fries')) {
    return { calories: 365, protein: 4, carbs: 63, fat: 17, fiber: 4, sugar: 0, sodium: 246 };
  }
  if (name.includes('taco') || name.includes('burrito')) {
    return { calories: 350, protein: 15, carbs: 35, fat: 18, fiber: 5, sugar: 3, sodium: 750 };
  }
  if (name.includes('chip') || name.includes('crisp')) {
    return { calories: 150, protein: 2, carbs: 15, fat: 10, fiber: 1, sugar: 1, sodium: 170 };
  }
  if (name.includes('cookie') || name.includes('biscuit')) {
    return { calories: 130, protein: 2, carbs: 18, fat: 6, fiber: 1, sugar: 8, sodium: 95 };
  }
  if (name.includes('yogurt') || name.includes('yoghurt')) {
    return { calories: 100, protein: 10, carbs: 12, fat: 3, fiber: 0, sugar: 10, sodium: 60 };
  }
  if (name.includes('bread') || name.includes('toast')) {
    return { calories: 80, protein: 3, carbs: 15, fat: 1, fiber: 2, sugar: 1, sodium: 150 };
  }
  if (name.includes('juice')) {
    return { calories: 110, protein: 0, carbs: 26, fat: 0, fiber: 0, sugar: 22, sodium: 10 };
  }
  if (name.includes('candy') || name.includes('chocolate')) {
    return { calories: 200, protein: 2, carbs: 22, fat: 12, fiber: 2, sugar: 20, sodium: 25 };
  }
  if (name.includes('meat') || name.includes('chicken') || name.includes('beef')) {
    return { calories: 180, protein: 25, carbs: 0, fat: 8, fiber: 0, sugar: 0, sodium: 75 };
  }
  if (name.includes('salad') || name.includes('vegetable')) {
    return { calories: 35, protein: 2, carbs: 7, fat: 0, fiber: 3, sugar: 4, sodium: 20 };
  }
  
  // Generic fallback for unknown foods
  return { calories: 120, protein: 4, carbs: 15, fat: 5, fiber: 2, sugar: 8, sodium: 85 };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create Supabase client for auth verification
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        global: { headers: { Authorization: authHeader } }
      }
    );

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { productName, ocrText, barcode }: ProductSearchRequest = await req.json();
    
    console.log('🔍 Starting branded product search:', { productName, hasOCR: !!ocrText, hasBarcode: !!barcode });

    let result: BrandedProductMatch = {
      found: false,
      confidence: 0,
      source: 'fallback',
      debugInfo: {
        searchQuery: productName,
        candidatesFound: 0,
        matchMethod: 'none'
      }
    };

    // Method 1: PRIORITY - Exact barcode match (overrides all other logic)
    if (barcode && barcode.trim().length > 0) {
      console.log('🏷️ BARCODE DETECTED - Attempting immediate Open Food Facts lookup:', barcode);
      console.log('📊 Barcode detection status: ACTIVE - Will override all other matching logic if found');
      
      try {
        const barcodeResponse = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`);
        console.log('🌐 Open Food Facts API response status:', barcodeResponse.status);
        
        if (barcodeResponse.ok) {
          const barcodeData = await barcodeResponse.json();
          console.log('📋 API response status code:', barcodeData.status);
          
          if (barcodeData.status === 1 && barcodeData.product) {
            const nutrition = extractNutrition(barcodeData.product);
            console.log('🥗 Nutrition extraction result:', nutrition ? 'SUCCESS' : 'FAILED');
            
            if (nutrition) {
              // Check if nutrition data is incomplete
              if (isNutritionIncomplete(nutrition)) {
                console.log('⚠️ BARCODE FOUND but nutrition data incomplete - using fallback nutrition');
                const fallbackNutrition = generateFallbackNutrition(barcodeData.product.product_name || productName);
                
                result = {
                  found: true,
                  confidence: 65, // Lower confidence due to fallback nutrition
                  productId: barcode,
                  productName: barcodeData.product.product_name || productName,
                  brandName: barcodeData.product.brands,
                  nutrition: fallbackNutrition,
                  source: 'barcode',
                  debugInfo: {
                    searchQuery: barcode,
                    candidatesFound: 1,
                    matchMethod: 'barcode_with_fallback_nutrition',
                    fallbackReason: 'incomplete_nutrition_data_fallback_applied'
                  }
                };
                console.log('✅ BARCODE SUCCESS with fallback nutrition:', result.productName);
                console.log('📊 Using fallback nutrition due to incomplete data');
                return new Response(JSON.stringify(result), {
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
              } else {
                result = {
                  found: true,
                  confidence: 99, // Maximum confidence for exact barcode matches
                  productId: barcode,
                  productName: barcodeData.product.product_name || productName,
                  brandName: barcodeData.product.brands,
                  nutrition,
                  source: 'barcode',
                  debugInfo: {
                    searchQuery: barcode,
                    candidatesFound: 1,
                    matchMethod: 'barcode_exact_match',
                    fallbackReason: 'none_barcode_success'
                  }
                };
                console.log('✅ BARCODE SUCCESS - Exact branded match found:', result.productName);
                console.log('🎯 OVERRIDING all other logic - returning branded nutrition immediately');
                return new Response(JSON.stringify(result), {
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
              }
            } else {
              console.log('⚠️ BARCODE FOUND but nutrition extraction failed - will fallback to fuzzy matching');
              result.debugInfo.fallbackReason = 'barcode_found_nutrition_extraction_failed';
            }
          } else {
            console.log('❌ BARCODE NOT FOUND in Open Food Facts database - will fallback to fuzzy matching');
            result.debugInfo.fallbackReason = 'barcode_not_in_database';
          }
        } else {
          console.log('❌ BARCODE API call failed with status:', barcodeResponse.status);
          result.debugInfo.fallbackReason = `barcode_api_error_${barcodeResponse.status}`;
        }
      } catch (error) {
        console.log('❌ BARCODE lookup exception:', error.message);
        result.debugInfo.fallbackReason = `barcode_exception: ${error.message}`;
      }
      
      console.log('🔄 Barcode path completed - proceeding to fuzzy matching fallback');
    } else {
      console.log('📊 Barcode detection status: NOT DETECTED - proceeding with fuzzy matching');
      result.debugInfo.fallbackReason = 'no_barcode_detected';
    }

    // Method 2: Fuzzy text matching with Open Food Facts search
    // Try multiple search variations for better matches
    const searchVariations = [
      ocrText ? `${productName} ${ocrText}` : productName,
      productName.split(' ').reverse().join(' '), // Reverse word order (e.g., "with cheese whopper" -> "whopper cheese with")
      productName.replace(/\bwith\b/g, '').trim(), // Remove "with" for cleaner matches
      `burger king ${productName}`, // Add brand context for popular items
      `mcdonald ${productName}` // Try McDonald's context too
    ];

    let bestCandidates: any[] = [];
    let totalCandidatesFound = 0;

    for (const searchQuery of searchVariations) {
      if (bestCandidates.length > 20) break; // Limit total candidates
      
      console.log('🔤 Attempting text search variation:', searchQuery.substring(0, 50) + '...');
      
      try {
        const searchUrl = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(searchQuery)}&search_simple=1&action=process&json=1&page_size=10`;
        const searchResponse = await fetch(searchUrl);
      
      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        
        result.debugInfo.candidatesFound = searchData.products?.length || 0;
        console.log(`📦 Found ${result.debugInfo.candidatesFound} product candidates`);

        if (searchData.products && searchData.products.length > 0) {
          // Add candidates from this search variation
          bestCandidates = bestCandidates.concat(searchData.products);
          totalCandidatesFound += searchData.products.length;
        }
      } catch (error) {
        console.log('❌ Text search variation failed:', error.message);
      }
    }

    // Now process all candidates with enhanced matching
    result.debugInfo.candidatesFound = totalCandidatesFound;
    console.log(`📦 Found ${totalCandidatesFound} total product candidates across all variations`);

    if (bestCandidates.length > 0) {
      let bestMatch = null;
      let bestScore = 0;
      let bestMatchDetails: string[] = [];

      console.log('🧩 Enhanced fuzzy matching analysis across all candidates:');
      
      // Enhanced fuzzy matching for each candidate
      for (const product of bestCandidates) {
        if (!product.product_name) continue;

        const matchResult = calculateEnhancedSimilarity(
          productName, 
          product.product_name, 
          ocrText || '', 
          product.brands || ''
        );
        
        console.log(`📊 Enhanced analysis for "${product.product_name}":`);
        console.log(`   🎯 Score: ${Math.round(matchResult.score * 100)}% (${matchResult.matchType})`);
        console.log(`   📝 Details: ${matchResult.details.join(', ')}`);

        if (matchResult.score > bestScore && matchResult.score > 0.6) {
          bestScore = matchResult.score;
          bestMatch = product;
          bestMatchDetails = matchResult.details;
          console.log(`   ⭐ NEW BEST MATCH!`);
        }
      }

      // Enhanced confidence scoring and decision making
      if (bestMatch && bestScore > 0.7) { // Lowered threshold to 70% for enhanced matching
        const nutrition = extractNutrition(bestMatch);
        if (nutrition) {
          const confidence = Math.round(bestScore * 100);
          
          // Check if nutrition data is incomplete, use fallback if needed
          let finalNutrition = nutrition;
          let finalConfidence = confidence;
          let needsFallback = false;
          
          if (isNutritionIncomplete(nutrition)) {
            console.log('⚠️ Enhanced match found but nutrition incomplete - applying fallback');
            finalNutrition = generateFallbackNutrition(bestMatch.product_name);
            finalConfidence = Math.max(50, confidence - 20); // Reduce confidence due to fallback
            needsFallback = true;
          }
          
          result = {
            found: true,
            confidence: finalConfidence,
            productId: bestMatch.code,
            productName: bestMatch.product_name,
            brandName: bestMatch.brands,
            nutrition: finalNutrition,
            source: 'fuzzy_match',
            debugInfo: {
              searchQuery: searchVariations[0], // Use first search query for reference
              candidatesFound: totalCandidatesFound,
              matchMethod: needsFallback ? `enhanced_fuzzy_${confidence}%_with_fallback` : `enhanced_fuzzy_${confidence}%`,
              fallbackReason: needsFallback ? `incomplete_nutrition_fallback_applied: ${bestMatchDetails.join('; ')}` : `match_details: ${bestMatchDetails.join('; ')}`
            }
          };

          console.log(`✅ Enhanced fuzzy match found: "${result.productName}"`);
          console.log(`🎯 Confidence: ${finalConfidence}% with details: ${bestMatchDetails.join(', ')}`);
          if (needsFallback) {
            console.log('📊 Applied fallback nutrition due to incomplete data');
          }

          // Return branded data if confidence is >50% (more lenient with fallback data)
          if (finalConfidence >= 50) {
            console.log(`🚀 MATCH ACCEPTED - Returning ${needsFallback ? 'fallback' : 'branded'} nutrition data`);
            return new Response(JSON.stringify(result), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          } else {
            console.log(`⚠️ Confidence ${finalConfidence}% below 50% threshold, will fallback to generic`);
            result.debugInfo.fallbackReason = `confidence_${finalConfidence}%_below_50%_threshold`;
          }
        } else {
          console.log('❌ Enhanced match found but nutrition extraction failed');
          result.debugInfo.fallbackReason = 'enhanced_match_no_nutrition';
        }
      } else {
        console.log(`❌ No suitable enhanced matches found (best score: ${Math.round(bestScore * 100)}%)`);
        result.debugInfo.fallbackReason = `best_enhanced_score_${Math.round(bestScore * 100)}%_below_70%`;
      }
    } else {
      console.log('❌ No product candidates found in any search results');
      result.debugInfo.fallbackReason = 'no_candidates_from_any_search';
    }

    // Method 3: Fallback to generic nutrition estimation
    console.log('🔄 Falling back to generic nutrition estimation');
    const fallbackNutrition = generateFallbackNutrition(productName);
    
    // Block results with very low confidence unless we have good category classification
    const isWellClassified = fallbackNutrition.calories > 200; // Indicates specific category was matched
    const finalConfidence = isWellClassified ? 25 : 15; // Higher confidence for well-classified items
    
    // Block results below 20% confidence threshold as requested
    if (finalConfidence < 20 && !isWellClassified) {
      console.log(`🚫 BLOCKING result - confidence ${finalConfidence}% below 20% threshold and no category fallback`);
      result = {
        found: false,
        confidence: 0,
        source: 'fallback',
        debugInfo: {
          ...result.debugInfo,
          matchMethod: 'blocked_low_confidence',
          fallbackReason: `confidence_${finalConfidence}%_below_20%_threshold_blocked`
        }
      };
    } else {
      result = {
        found: false,
        confidence: finalConfidence,
        productName: productName,
        nutrition: fallbackNutrition,
        source: 'fallback',
        debugInfo: {
          ...result.debugInfo,
          matchMethod: isWellClassified ? 'category_fallback' : 'generic_fallback',
          fallbackReason: result.debugInfo.fallbackReason || 'no_suitable_matches_found'
        }
      };
    }
    
    console.log('📊 Generated fallback nutrition for:', productName, fallbackNutrition);

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
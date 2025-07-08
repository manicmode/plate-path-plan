import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

// Simple fuzzy matching function
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

// Extract nutrition data from Open Food Facts product
function extractNutrition(product: any): NutritionData | null {
  const nutriments = product.nutriments;
  if (!nutriments) return null;

  // Convert per 100g values to reasonable serving sizes
  const servingSizeMultiplier = 0.3; // Assume ~30g serving for most products

  return {
    calories: Math.round((nutriments.energy_kcal_100g || nutriments['energy-kcal_100g'] || 0) * servingSizeMultiplier),
    protein: Math.round(((nutriments.proteins_100g || nutriments['proteins_100g'] || 0) * servingSizeMultiplier) * 10) / 10,
    carbs: Math.round(((nutriments.carbohydrates_100g || nutriments['carbohydrates_100g'] || 0) * servingSizeMultiplier) * 10) / 10,
    fat: Math.round(((nutriments.fat_100g || nutriments['fat_100g'] || 0) * servingSizeMultiplier) * 10) / 10,
    fiber: Math.round(((nutriments.fiber_100g || nutriments['fiber_100g'] || 0) * servingSizeMultiplier) * 10) / 10,
    sugar: Math.round(((nutriments.sugars_100g || nutriments['sugars_100g'] || 0) * servingSizeMultiplier) * 10) / 10,
    sodium: Math.round((nutriments.sodium_100g || nutriments['sodium_100g'] || 0) * servingSizeMultiplier * 1000) // Convert to mg
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    // Method 1: Exact barcode match (highest confidence)
    if (barcode) {
      console.log('🏷️ Attempting barcode lookup:', barcode);
      try {
        const barcodeResponse = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`);
        if (barcodeResponse.ok) {
          const barcodeData = await barcodeResponse.json();
          if (barcodeData.status === 1 && barcodeData.product) {
            const nutrition = extractNutrition(barcodeData.product);
            if (nutrition) {
              result = {
                found: true,
                confidence: 99, // Very high confidence for barcode matches
                productId: barcode,
                productName: barcodeData.product.product_name || productName,
                brandName: barcodeData.product.brands,
                nutrition,
                source: 'barcode',
                debugInfo: {
                  searchQuery: barcode,
                  candidatesFound: 1,
                  matchMethod: 'barcode_exact'
                }
              };
              console.log('✅ Barcode match found:', result.productName);
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

    // Method 2: Fuzzy text matching with Open Food Facts search
    const searchQuery = ocrText ? `${productName} ${ocrText}` : productName;
    console.log('🔤 Attempting text search:', searchQuery.substring(0, 50) + '...');

    try {
      const searchUrl = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(searchQuery)}&search_simple=1&action=process&json=1&page_size=10`;
      const searchResponse = await fetch(searchUrl);
      
      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        
        result.debugInfo.candidatesFound = searchData.products?.length || 0;
        console.log(`📦 Found ${result.debugInfo.candidatesFound} product candidates`);

        if (searchData.products && searchData.products.length > 0) {
          let bestMatch = null;
          let bestScore = 0;

          // Find best matching product
          for (const product of searchData.products) {
            if (!product.product_name) continue;

            const nameScore = calculateSimilarity(
              productName.toLowerCase().trim(),
              product.product_name.toLowerCase().trim()
            );

            // Boost score if brand matches or OCR text contains product info
            let boostedScore = nameScore;
            if (ocrText && product.brands) {
              const brandScore = calculateSimilarity(
                ocrText.toLowerCase(),
                product.brands.toLowerCase()
              );
              boostedScore = Math.max(nameScore, brandScore * 0.8);
            }

            console.log(`📊 Product "${product.product_name}" score: ${Math.round(boostedScore * 100)}%`);

            if (boostedScore > bestScore && boostedScore > 0.6) { // Minimum 60% similarity
              bestScore = boostedScore;
              bestMatch = product;
            }
          }

          // If we found a good match, extract nutrition
          if (bestMatch && bestScore > 0.75) { // 75% threshold for branded products
            const nutrition = extractNutrition(bestMatch);
            if (nutrition) {
              const confidence = Math.round(bestScore * 100);
              
              result = {
                found: true,
                confidence,
                productId: bestMatch.code,
                productName: bestMatch.product_name,
                brandName: bestMatch.brands,
                nutrition,
                source: 'fuzzy_match',
                debugInfo: {
                  searchQuery,
                  candidatesFound: result.debugInfo.candidatesFound,
                  matchMethod: `fuzzy_match_${confidence}%`
                }
              };

              console.log(`✅ Fuzzy match found: "${result.productName}" (${confidence}% confidence)`);

              // Only return branded data if confidence is >90%
              if (confidence >= 90) {
                return new Response(JSON.stringify(result), {
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
              } else {
                console.log(`⚠️ Confidence ${confidence}% below 90% threshold, will fallback to generic`);
                result.debugInfo.fallbackReason = `confidence_${confidence}%_below_90%`;
              }
            }
          }
        }
      }
    } catch (error) {
      console.log('❌ Text search failed:', error.message);
      result.debugInfo.fallbackReason = `search_error: ${error.message}`;
    }

    // Method 3: Fallback to generic nutrition estimation
    console.log('🔄 Falling back to generic nutrition estimation');
    result = {
      found: false,
      confidence: 50, // Generic confidence
      source: 'fallback',
      debugInfo: {
        ...result.debugInfo,
        matchMethod: 'generic_fallback',
        fallbackReason: result.debugInfo.fallbackReason || 'no_suitable_matches_found'
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
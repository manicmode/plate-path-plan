import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SearchRequest {
  query: string;
  maxResults?: number;
  sources?: string[];
}

interface CanonicalSearchResult {
  source: 'off' | 'fdc' | 'local';
  id: string;
  name: string;
  brand?: string;
  imageUrl?: string;
  servingHint?: string;
  caloriesPer100g?: number;
  confidence?: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, maxResults = 10, sources = ['off'] } = await req.json() as SearchRequest;
    
    if (!query || query.trim().length < 2) {
      return new Response(
        JSON.stringify({ error: 'Query must be at least 2 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🔍 [FoodSearch] Searching for: "${query}" (sources: ${sources.join(', ')})`);
    
    const results: CanonicalSearchResult[] = [];
    
    // OpenFoodFacts search
    if (sources.includes('off')) {
      try {
        const offResults = await searchOpenFoodFacts(query, maxResults);
        results.push(...offResults);
        console.log(`📦 [OpenFoodFacts] Found ${offResults.length} results`);
      } catch (error) {
        console.error('❌ [OpenFoodFacts] Search failed:', error);
      }
    }
    
    // Apply ranking and limit results
    const rankedResults = rankResults(results, query).slice(0, maxResults);
    
    console.log(`✅ [FoodSearch] Returning ${rankedResults.length} ranked results`);
    
    return new Response(
      JSON.stringify({ results: rankedResults }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('💥 [FoodSearch] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Search failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Search OpenFoodFacts by text query
 */
async function searchOpenFoodFacts(query: string, limit: number): Promise<CanonicalSearchResult[]> {
  const searchParams = new URLSearchParams({
    search_terms: query,
    search_simple: '1',
    action: 'process',
    json: '1',
    page_size: Math.min(limit * 2, 24).toString(), // Get more to filter
    fields: 'code,product_name,brands,image_url,nutriments,serving_size'
  });
  
  const url = `https://world.openfoodfacts.org/cgi/search.pl?${searchParams}`;
  console.log(`📡 [OpenFoodFacts] Request URL: ${url.substring(0, 120)}...`);
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'PlatePathPlan/1.0 (https://lovable.app) - Health tracking app'
    }
  });
  
  if (!response.ok) {
    throw new Error(`OpenFoodFacts API error: ${response.status}`);
  }
  
  const data = await response.json();
  
  if (!data.products || !Array.isArray(data.products)) {
    console.log('⚠️ [OpenFoodFacts] No products array in response');
    return [];
  }
  
  return data.products
    .filter((product: any) => {
      // Filter out incomplete products
      return product.product_name && 
             product.product_name.trim().length > 0 &&
             !product.product_name.toLowerCase().includes('unknown');
    })
    .map((product: any): CanonicalSearchResult => {
      const name = product.product_name || 'Unknown Product';
      const brand = product.brands ? product.brands.split(',')[0].trim() : undefined;
      
      // Extract calories per 100g
      const nutriments = product.nutriments || {};
      const caloriesPer100g = nutriments['energy-kcal_100g'] || 
                             nutriments['energy_100g'] ? 
                             Math.round(nutriments['energy_100g'] / 4.184) : // Convert kJ to kcal
                             undefined;
      
      // Create serving hint
      let servingHint;
      if (product.serving_size) {
        servingHint = `per ${product.serving_size}`;
      } else if (caloriesPer100g) {
        servingHint = 'per 100g';
      }
      
      return {
        source: 'off',
        id: product.code || crypto.randomUUID(),
        name,
        brand,
        imageUrl: product.image_url || undefined,
        servingHint,
        caloriesPer100g,
        confidence: 0.5 // Base confidence
      };
    })
    .slice(0, limit);
}

/**
 * Rank search results by relevance
 */
function rankResults(results: CanonicalSearchResult[], query: string): CanonicalSearchResult[] {
  const queryLower = query.toLowerCase();
  const queryTokens = queryLower.split(/\s+/).filter(token => token.length > 1);
  
  return results.map(result => {
    const nameLower = result.name.toLowerCase();
    const brandLower = result.brand?.toLowerCase() || '';
    
    let score = 0;
    
    // Exact name match (highest score)
    if (nameLower === queryLower) {
      score += 50;
    }
    
    // Name starts with query
    if (nameLower.startsWith(queryLower)) {
      score += 30;
    }
    
    // Name contains query
    if (nameLower.includes(queryLower)) {
      score += 20;
    }
    
    // Token overlap scoring
    queryTokens.forEach(token => {
      if (nameLower.includes(token)) {
        score += 10;
      }
      if (brandLower.includes(token)) {
        score += 8;
      }
    });
    
    // Brand exact match boost
    if (brandLower && queryLower.includes(brandLower)) {
      score += 15;
    }
    
    // Shorter names are often more specific
    if (result.name.length <= 30) {
      score += 5;
    }
    
    // Has nutrition data
    if (result.caloriesPer100g) {
      score += 3;
    }
    
    // Has brand info
    if (result.brand) {
      score += 2;
    }
    
    return {
      ...result,
      confidence: Math.min(1.0, score / 100)
    };
  }).sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
}
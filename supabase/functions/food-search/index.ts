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
    const { query, maxResults = 10, sources = ['off', 'fdc'] } = await req.json() as SearchRequest;
    
    if (!query || query.trim().length < 2) {
      return new Response(
        JSON.stringify({ error: 'Query must be at least 2 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🔍 [FoodSearch] Searching for: "${query}" (sources: ${sources.join(', ')})`);
    
    const normalizedQuery = normalizeQuery(query);
    console.log(`📝 [FoodSearch] Normalized: "${normalizedQuery}"`);
    
    const searchPromises: Promise<CanonicalSearchResult[]>[] = [];
    
    // Parallel searches
    if (sources.includes('off')) {
      searchPromises.push(
        searchOpenFoodFacts(normalizedQuery, Math.ceil(maxResults * 0.7)).catch(error => {
          console.error('❌ [OpenFoodFacts] Search failed:', error);
          return [];
        })
      );
    }
    
    if (sources.includes('fdc')) {
      searchPromises.push(
        searchUSDAFDC(normalizedQuery, Math.ceil(maxResults * 0.5)).catch(error => {
          console.error('❌ [USDA FDC] Search failed:', error);
          return [];
        })
      );
    }
    
    const allResults = await Promise.all(searchPromises);
    const combinedResults = allResults.flat();
    
    // Dedupe by name similarity and rank
    const deduped = deduplicateResults(combinedResults);
    const rankedResults = rankResults(deduped, normalizedQuery).slice(0, maxResults);
    
    console.log(`✅ [FoodSearch] Combined ${combinedResults.length} → deduped ${deduped.length} → final ${rankedResults.length} results`);
    
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

// Query normalization and synonyms
const SYNONYMS = new Map([
  ['yogurt', 'yoghurt'],
  ['yoghurt', 'yogurt'],
  ['soda', 'soft drink'],
  ['pop', 'soda'],
  ['cheese burger', 'cheeseburger'],
  ['greek yogurt', 'greek yoghurt'],
  ['oat milk', 'oats milk'],
  ['almond milk', 'almonds milk'],
]);

const BURGER_CATS = new Set([
  'en:burgers','en:hamburgers','en:cheeseburgers',
  'burgers','hamburgers','cheeseburgers'
]);

/**
 * Normalize query for better matching
 */
function normalizeQuery(query: string): string {
  let normalized = query
    .toLowerCase()
    .trim()
    // Remove diacritics
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Standardize separators
    .replace(/[-_]/g, ' ')
    // Collapse whitespace
    .replace(/\s+/g, ' ');
  
  // Apply synonyms
  for (const [from, to] of SYNONYMS.entries()) {
    if (normalized.includes(from)) {
      normalized = normalized.replace(new RegExp(from, 'g'), to);
    }
  }
  
  // Handle plurals (simple approach)
  normalized = normalized.replace(/\b(\w+)ies\b/g, '$1y').replace(/\b(\w+)s\b/g, '$1');
  
  return normalized;
}

/**
 * Deduplicate results by name similarity
 */
function deduplicateResults(results: CanonicalSearchResult[]): CanonicalSearchResult[] {
  const seen = new Set<string>();
  const deduped: CanonicalSearchResult[] = [];
  
  for (const result of results) {
    const key = `${result.name.toLowerCase().replace(/\s+/g, '')}-${result.brand?.toLowerCase() || ''}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(result);
    }
  }
  
  return deduped;
}

/**
 * Search OpenFoodFacts by text query with intelligent ranking
 */
async function searchOpenFoodFacts(query: string, limit: number): Promise<CanonicalSearchResult[]> {
  const startTime = Date.now();
  
  // Normalize query and detect patterns
  const normalizedQuery = query.toLowerCase().trim().replace(/\s+/g, ' ');
  const tokens = normalizedQuery.split(' ').filter(t => t.length > 1);
  
  // Detect cheeseburger intent (within 3-token window)
  const intent = {
    cheeseburgerVariant: false,
    normalizedPhrase: normalizedQuery
  };
  
  if (tokens.includes('cheese') && tokens.includes('burger') && tokens.length <= 3) {
    intent.cheeseburgerVariant = true;
    intent.normalizedPhrase = 'cheeseburger';
    console.info(`🍔 [FoodSearch] Detected cheeseburger intent for: "${query}"`);
  }
  
  const searchParams = new URLSearchParams({
    search_terms: query,
    search_simple: '1',
    action: 'process',
    json: '1',
    page_size: '50', // Get more results for better ranking
    fields: 'code,product_name,brands,image_url,nutriments,serving_size,categories_tags,categories_tags_en,countries_tags,quantity'
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
  
  let products = data.products
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
      if (product.serving_size || product.quantity) {
        servingHint = `per ${product.serving_size || product.quantity}`;
      } else if (caloriesPer100g) {
        servingHint = 'per 100g';
      }
      
      // Smart scoring for burger intent
      let score = calculateSmartScore(product, normalizedQuery, intent);
      
      return {
        source: 'off',
        id: product.code || crypto.randomUUID(),
        name,
        brand,
        imageUrl: product.image_url || undefined,
        servingHint,
        caloriesPer100g,
        confidence: Math.min(1.0, score / 100)
      };
    });
  
  // Apply intelligent ranking
  products = products.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
  
  // Check if we need a burger category fallback
  const burgerIntentCount = products.slice(0, 10).filter(p => 
    p.name.toLowerCase().includes('burger') || 
    p.name.toLowerCase().includes('cheeseburger')
  ).length;
  
  let didCategoryFallback = false;
  
  // If we have burger intent but few burger results, try category search
  if (intent.cheeseburgerVariant && burgerIntentCount < 3) {
    try {
      console.info(`🔄 [FoodSearch] Performing burger category fallback`);
      const categoryResults = await searchByCategory('burgers', 15);
      if (categoryResults.length > 0) {
        // Merge and dedupe by code
        const existingCodes = new Set(products.map(p => p.id));
        const newResults = categoryResults.filter(p => !existingCodes.has(p.id));
        products = [...products, ...newResults];
        didCategoryFallback = true;
      }
    } catch (error) {
      console.error('⚠️ [FoodSearch] Category fallback failed:', error);
    }
  }
  
  const ms = Date.now() - startTime;
  console.info(`📊 [FoodSearch] Query: "${query}", normalized: "${intent.normalizedPhrase}", firstPass: ${data.products?.length || 0}, burgerIntent: ${burgerIntentCount}, didCategoryFallback: ${didCategoryFallback}, final: ${products.length}, ms: ${ms}`);
  
  return products.slice(0, limit);
}

/**
 * Calculate smart score for a product based on query intent
 */
function calculateSmartScore(product: any, query: string, intent: any): number {
  const name = (product.product_name || '').toLowerCase();
  const brand = (product.brands || '').toLowerCase();
  const categories = [...(product.categories_tags || []), ...(product.categories_tags_en || [])];
  const queryTokens = query.split(' ').filter(t => t.length > 1);
  
  let score = 0;
  
  // Category matching for burger intent
  const hasBurgerCategory = categories.some(cat => BURGER_CATS.has(cat.toLowerCase()));
  if (hasBurgerCategory) {
    score += 30; // Strong boost for burger category
  }
  
  // Name pattern matching
  if (intent.cheeseburgerVariant) {
    if (name.includes('cheeseburger')) {
      score += 25; // Perfect match for cheeseburger
    } else if (name.includes('cheese') && name.includes('burger')) {
      score += 20; // Good match for "cheese burger"
    } else if (name.includes('burger')) {
      score += 15; // General burger match
    }
  }
  
  // Token matching
  let tokenMatches = 0;
  queryTokens.forEach(token => {
    if (name.includes(token)) {
      score += 10;
      tokenMatches++;
    }
    if (brand.includes(token)) {
      score += 8;
    }
  });
  
  // Penalty for irrelevant results when we want burgers
  if (query.includes('burger') && !name.includes('burger') && !hasBurgerCategory) {
    score -= 20;
  }
  
  // Exact name match boost
  if (name === query) {
    score += 40;
  } else if (name.startsWith(query)) {
    score += 25;
  } else if (name.includes(query)) {
    score += 15;
  }
  
  // Quality indicators
  if (product.brands) score += 2;
  if (product.quantity || product.serving_size) score += 1;
  if (product.nutriments && (product.nutriments['energy-kcal_100g'] || product.nutriments['energy_100g'])) score += 3;
  
  // Prefer shorter, more specific names
  if (name.length <= 30) score += 5;
  
  return Math.max(0, score);
}

/**
 * Search by category fallback
 */
async function searchByCategory(category: string, limit: number): Promise<CanonicalSearchResult[]> {
  const searchParams = new URLSearchParams({
    tagtype_0: 'categories',
    tag_contains_0: 'contains',
    tag_0: category,
    json: '1',
    page_size: limit.toString(),
    fields: 'code,product_name,brands,image_url,nutriments,serving_size,categories_tags,categories_tags_en,quantity'
  });
  
  const url = `https://world.openfoodfacts.org/cgi/search.pl?${searchParams}`;
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'PlatePathPlan/1.0 (https://lovable.app) - Health tracking app'
    }
  });
  
  if (!response.ok) {
    throw new Error(`OpenFoodFacts category API error: ${response.status}`);
  }
  
  const data = await response.json();
  
  if (!data.products || !Array.isArray(data.products)) {
    return [];
  }
  
  return data.products
    .filter((product: any) => {
      return product.product_name && 
             product.product_name.trim().length > 0 &&
             !product.product_name.toLowerCase().includes('unknown');
    })
    .map((product: any): CanonicalSearchResult => {
      const name = product.product_name || 'Unknown Product';
      const brand = product.brands ? product.brands.split(',')[0].trim() : undefined;
      
      const nutriments = product.nutriments || {};
      const caloriesPer100g = nutriments['energy-kcal_100g'] || 
                             nutriments['energy_100g'] ? 
                             Math.round(nutriments['energy_100g'] / 4.184) : 
                             undefined;
      
      let servingHint;
      if (product.serving_size || product.quantity) {
        servingHint = `per ${product.serving_size || product.quantity}`;
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
        confidence: 0.6 // Category matches get decent confidence
      };
    });
}

/**
 * Search USDA FDC API
 */
async function searchUSDAFDC(query: string, limit: number): Promise<CanonicalSearchResult[]> {
  const searchParams = new URLSearchParams({
    query: query,
    dataType: 'Foundation,SR Legacy,Survey',
    pageSize: limit.toString(),
    requireAllWords: 'false'
  });
  
  const url = `https://api.nal.usda.gov/fdc/v1/foods/search?${searchParams}`;
  
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'PlatePathPlan/1.0 (https://lovable.app) - Health tracking app'
    }
  });
  
  if (!response.ok) {
    throw new Error(`USDA FDC API error: ${response.status}`);
  }
  
  const data = await response.json();
  
  if (!data.foods || !Array.isArray(data.foods)) {
    return [];
  }
  
  return data.foods
    .filter((food: any) => food.description && food.description.trim().length > 0)
    .map((food: any): CanonicalSearchResult => {
      const name = food.description || 'Unknown Food';
      const brand = food.brandName || food.brandOwner || undefined;
      
      // Extract calories per 100g
      let caloriesPer100g;
      if (food.foodNutrients) {
        const energyNutrient = food.foodNutrients.find((n: any) => 
          n.nutrientId === 1008 || // Energy (kcal)
          n.nutrientName?.toLowerCase().includes('energy')
        );
        if (energyNutrient?.value) {
          caloriesPer100g = Math.round(energyNutrient.value);
        }
      }
      
      // Calculate confidence based on query match
      const confidence = calculateFDCConfidence(food, query);
      
      return {
        source: 'fdc',
        id: `fdc-${food.fdcId}`,
        name,
        brand,
        imageUrl: undefined, // FDC doesn't provide images
        servingHint: caloriesPer100g ? 'per 100g' : undefined,
        caloriesPer100g,
        confidence
      };
    });
}

/**
 * Calculate confidence score for FDC results
 */
function calculateFDCConfidence(food: any, query: string): number {
  const name = (food.description || '').toLowerCase();
  const brand = (food.brandName || food.brandOwner || '').toLowerCase();
  const queryTokens = query.toLowerCase().split(' ').filter(t => t.length > 1);
  
  let score = 0;
  
  // Exact matches
  if (name === query.toLowerCase()) {
    score += 0.9;
  } else if (name.includes(query.toLowerCase())) {
    score += 0.7;
  }
  
  // Token matching with co-occurrence bonus
  let tokenMatches = 0;
  queryTokens.forEach(token => {
    if (name.includes(token)) {
      score += 0.1;
      tokenMatches++;
    }
    if (brand.includes(token)) {
      score += 0.05;
    }
  });
  
  // Co-occurrence bonus (multiple tokens close together)
  if (tokenMatches > 1) {
    score += tokenMatches * 0.05;
  }
  
  // Quality indicators
  if (food.brandName || food.brandOwner) score += 0.1;
  if (food.foodNutrients && food.foodNutrients.length > 3) score += 0.1;
  
  // Data source preference (Foundation > SR Legacy > Survey)
  if (food.dataType === 'Foundation') score += 0.1;
  else if (food.dataType === 'SR Legacy') score += 0.05;
  
  return Math.min(1.0, Math.max(0.1, score));
}

/**
 * Enhanced ranking with token co-occurrence and confidence normalization
 */
function rankResults(results: CanonicalSearchResult[], query: string): CanonicalSearchResult[] {
  const queryTokens = query.toLowerCase().split(' ').filter(t => t.length > 1);
  
  return results
    .map(result => {
      // Recalculate confidence with co-occurrence bonus
      const name = result.name.toLowerCase();
      const brand = (result.brand || '').toLowerCase();
      
      let coOccurrenceBonus = 0;
      let matchedTokens = 0;
      
      queryTokens.forEach(token => {
        if (name.includes(token) || brand.includes(token)) {
          matchedTokens++;
        }
      });
      
      // Bonus for multiple token matches (indicates better semantic relevance)
      if (matchedTokens > 1) {
        coOccurrenceBonus = matchedTokens * 0.1;
      }
      
      // Boost high-quality results
      let qualityBonus = 0;
      if (result.caloriesPer100g) qualityBonus += 0.05;
      if (result.brand) qualityBonus += 0.05;
      if (result.imageUrl) qualityBonus += 0.03;
      
      const finalConfidence = Math.min(1.0, 
        (result.confidence || 0.5) + coOccurrenceBonus + qualityBonus
      );
      
      return {
        ...result,
        confidence: finalConfidence
      };
    })
    .sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
}
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SearchRequest {
  query: string;
  maxResults?: number;
  sources?: string[];
  fallbackToOff?: boolean;
}

interface SearchResult {
  source: string;
  id: string;
  name: string;
  brand?: string;
  imageUrl?: string;
  servingHint?: string;
  caloriesPer100g?: number;
  confidence?: number;
  barcode?: string | null;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: SearchRequest = await req.json();
    const { 
      query, 
      maxResults = 10, 
      sources = ['nutritionix', 'edamam'], 
      fallbackToOff = true 
    } = body;

    console.log(`[FOOD_SEARCH] Query: "${query}", Sources: ${JSON.stringify(sources)}`);

    let results: SearchResult[] = [];

    // Try primary providers first
    try {
      if (sources.includes('nutritionix') || sources.includes('edamam')) {
        // For now, simulate provider results since we don't have actual API integrations
        // In a real implementation, you would call actual APIs here
        console.log('[FOOD_SEARCH] Attempting provider search...');
        
        // Simulate some provider results based on query
        results = generateMockProviderResults(query, maxResults);
        
        if (results.length > 0) {
          console.log(`[FOOD_SEARCH] Found ${results.length} results from providers`);
          return new Response(
            JSON.stringify({ results }), 
            { 
              status: 200, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }
      }
    } catch (err) {
      console.warn('[FOOD_SEARCH] Provider error:', err);
    }

    // Fallback to OpenFoodFacts if enabled
    if (fallbackToOff) {
      console.log('[FOOD_SEARCH] Falling back to OpenFoodFacts...');
      results = await searchOpenFoodFacts(query, maxResults);
    }

    console.log(`[FOOD_SEARCH] Final results count: ${results.length}`);
    
    return new Response(
      JSON.stringify({ results }), 
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('[FOOD_SEARCH] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

// Mock provider results generator for demo purposes
function generateMockProviderResults(query: string, maxResults: number): SearchResult[] {
  const queryLower = query.toLowerCase();
  
  // Simple mock data based on common queries
  const mockData: { [key: string]: SearchResult[] } = {
    'yakisoba': [
      {
        source: 'nutritionix',
        id: 'nutritionix_yakisoba_1',
        name: 'Yakisoba Noodles',
        brand: 'Maruchan',
        caloriesPer100g: 138,
        confidence: 0.9,
        servingHint: '100g'
      },
      {
        source: 'edamam',
        id: 'edamam_yakisoba_1', 
        name: 'Japanese Yakisoba',
        caloriesPer100g: 142,
        confidence: 0.85,
        servingHint: 'per serving'
      }
    ],
    'chicken salad': [
      {
        source: 'nutritionix',
        id: 'nutritionix_chicken_salad_1',
        name: 'Grilled Chicken Salad',
        caloriesPer100g: 89,
        confidence: 0.92,
        servingHint: '100g'
      }
    ],
    'sandwich': [
      {
        source: 'nutritionix',
        id: 'nutritionix_sandwich_1',
        name: 'Club Sandwich on Wheat Bread',
        caloriesPer100g: 250,
        confidence: 0.88,
        servingHint: 'per sandwich'
      }
    ]
  };

  // Find matching mock data
  for (const [key, items] of Object.entries(mockData)) {
    if (queryLower.includes(key) || key.includes(queryLower)) {
      return items.slice(0, maxResults);
    }
  }

  // Generate generic mock results if no specific match
  return [{
    source: 'nutritionix',
    id: `nutritionix_${queryLower.replace(/\s+/g, '_')}`,
    name: `${query} (Nutritionix)`,
    caloriesPer100g: 100,
    confidence: 0.7,
    servingHint: '100g'
  }].slice(0, maxResults);
}

// OpenFoodFacts fallback search
async function searchOpenFoodFacts(query: string, maxResults: number): Promise<SearchResult[]> {
  try {
    const searchUrl = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=${maxResults}`;
    
    const response = await fetch(searchUrl);
    if (!response.ok) {
      throw new Error(`OpenFoodFacts API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.products || !Array.isArray(data.products)) {
      return [];
    }

    return data.products.map((item: any): SearchResult => ({
      source: 'off',
      id: item?.code ?? item?.id ?? null,
      name: item?.product_name ?? item?.generic_name ?? item?.brands ?? item?.code ?? 'Unknown Product',
      brand: item?.brands ?? undefined,
      imageUrl: item?.image_url ?? item?.image_front_url ?? undefined,
      servingHint: item?.serving_size ?? '100g',
      caloriesPer100g: item?.nutriments?.['energy-kcal_100g'] ?? undefined,
      confidence: 0.7,
      barcode: item?.code ?? item?.barcode ?? null
    }));
    
  } catch (error) {
    console.error('[FOOD_SEARCH] OpenFoodFacts search failed:', error);
    return [];
  }
}
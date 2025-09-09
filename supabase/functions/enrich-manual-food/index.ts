import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Nutrients {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber?: number;
  sugar?: number;
  saturated_fat?: number;
  sodium?: number;
  potassium?: number;
  calcium?: number;
  iron?: number;
}

interface EnrichedFood {
  name: string;
  aliases: string[];
  locale: string;
  ingredients: { name: string; grams?: number; amount?: string }[];
  per100g: Nutrients;
  perServing?: Nutrients & { serving_grams?: number };
  source: "FDC" | "EDAMAM" | "NUTRITIONIX" | "CURATED" | "ESTIMATED";
  source_id?: string;
  confidence: number;
  ingredient_source?: "FDC" | "EDAMAM" | "NUTRITIONIX" | "CURATED" | "ESTIMATED"; // Track ingredient source separately
  low_value?: boolean; // Mark low-quality results for short caching
}

interface ProviderCandidate {
  result: EnrichedFood;
  src: string;
  conf: number;
  ing_len: number;
  low_value: boolean;
}

// SHA256 utility
const sha256 = async (s: string): Promise<string> => {
  const data = new TextEncoder().encode(s);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
};

// Energy sanity check (±8% tolerance)
const validateEnergy = (nutrients: Nutrients): Nutrients => {
  const { calories, protein, fat, carbs } = nutrients;
  const calculated = (carbs * 4) + (fat * 9) + (protein * 4);
  const tolerance = 0.08;
  
  if (Math.abs(calories - calculated) / calculated > tolerance) {
    console.log(`[ENRICH][ENERGY] Sanity check failed: ${calories} vs ${calculated} calculated`);
    // Clamp to calculated value
    return { ...nutrients, calories: Math.round(calculated) };
  }
  
  return nutrients;
};

// Timeout wrapper
const withTimeout = async <T>(promise: Promise<T>, ms: number): Promise<T> => {
  const timeout = new Promise<T>((_, reject) => 
    setTimeout(() => reject(new Error('Timeout')), ms)
  );
  return Promise.race([promise, timeout]);
};

// USDA/FDC API integration
const searchFDC = async (query: string): Promise<EnrichedFood | null> => {
  const apiKey = Deno.env.get('FDC_API_KEY');
  if (!apiKey) return null;

  try {
    console.log(`[ENRICH][FDC] Searching: ${query}`);
    
    const response = await withTimeout(
      fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(query)}&api_key=${apiKey}&pageSize=5`),
      1200
    );

    if (!response.ok) return null;
    
    const data = await response.json();
    const foods = data.foods || [];
    
    if (foods.length === 0) return null;
    
    const food = foods[0]; // Take first result
    const nutrients = food.foodNutrients || [];
    
    // Map USDA nutrient codes to our format
    const nutrientMap: Record<string, keyof Nutrients> = {
      '208': 'calories',      // ENERC_KCAL
      '203': 'protein',       // PROCNT
      '204': 'fat',          // FAT
      '205': 'carbs',        // CHOCDF
      '291': 'fiber',        // FIBTG
      '269': 'sugar',        // SUGAR
      '307': 'sodium',       // NA
      '306': 'potassium',    // K
      '301': 'calcium',      // CA
      '303': 'iron',         // FE
      '606': 'saturated_fat' // FASAT
    };
    
    const per100g: Nutrients = {
      calories: 0,
      protein: 0,
      fat: 0,
      carbs: 0
    };
    
    nutrients.forEach((n: any) => {
      const key = nutrientMap[n.nutrientId?.toString()];
      if (key && n.value != null) {
        per100g[key] = n.value;
      }
    });
    
    // Validate and sanitize
    const sanitized = validateEnergy(per100g);
    
    return {
      name: food.description || query,
      aliases: [food.description, food.brandName].filter(Boolean),
      locale: 'auto',
      ingredients: [{
        name: food.description || query
      }],
      per100g: sanitized,
      source: 'FDC',
      source_id: food.fdcId?.toString(),
      confidence: 0.85
    };
    
  } catch (error) {
    console.log(`[ENRICH][FDC] Failed: ${error.message}`);
    return null;
  }
};

// Edamam API integration with ingredients parsing
const searchEdamam = async (query: string): Promise<EnrichedFood | null> => {
  const appId = Deno.env.get('EDAMAM_APP_ID');
  const appKey = Deno.env.get('EDAMAM_APP_KEY');
  if (!appId || !appKey) return null;

  try {
    console.log(`[ENRICH][EDAMAM] Searching: ${query}`);
    
    const response = await withTimeout(
      fetch(`https://api.edamam.com/api/food-database/v2/parser?ingr=${encodeURIComponent(query)}&app_id=${appId}&app_key=${appKey}`),
      1200
    );

    if (!response.ok) return null;
    
    const data = await response.json();
    const parsed = data.parsed?.[0] || data.hints?.[0];
    
    if (!parsed?.food) return null;
    
    const food = parsed.food;
    const nutrients = food.nutrients || {};
    
    const per100g: Nutrients = {
      calories: Math.round(nutrients.ENERC_KCAL || 0),
      protein: Math.round((nutrients.PROCNT || 0) * 10) / 10,
      fat: Math.round((nutrients.FAT || 0) * 10) / 10,
      carbs: Math.round((nutrients.CHOCDF || 0) * 10) / 10,
      fiber: nutrients.FIBTG ? Math.round(nutrients.FIBTG * 10) / 10 : undefined,
      sugar: nutrients.SUGAR ? Math.round(nutrients.SUGAR * 10) / 10 : undefined,
      sodium: nutrients.NA ? Math.round(nutrients.NA) : undefined,
      potassium: nutrients.K ? Math.round(nutrients.K) : undefined,
      calcium: nutrients.CA ? Math.round(nutrients.CA) : undefined,
      iron: nutrients.FE ? Math.round(nutrients.FE * 10) / 10 : undefined,
      saturated_fat: nutrients.FASAT ? Math.round(nutrients.FASAT * 10) / 10 : undefined
    };
    
    const sanitized = validateEnergy(per100g);
    
    // Parse ingredients from foodContentsLabel if available
    const rawIngredients = food.foodContentsLabel as string | undefined;
    const ingredients = parseIngredients(rawIngredients);
    
    return {
      name: food.label || query,
      aliases: [food.label, food.brand].filter(Boolean),
      locale: 'auto',
      ingredients: ingredients.length > 0 ? ingredients : [{ name: food.label || query }],
      per100g: sanitized,
      source: 'EDAMAM',
      source_id: food.foodId,
      confidence: 0.78
    };
    
  } catch (error) {
    console.log(`[ENRICH][EDAMAM] Failed: ${error.message}`);
    return null;
  }
};

// Enhanced ingredient parsing with better pattern recognition
const parseIngredients = (raw?: string) => {
  if (!raw?.trim()) return [];
  
  console.log(`[ENRICH][PARSE_ING] Raw: "${raw.substring(0, 200)}"`);
  
  // Clean up the raw string
  let cleaned = raw
    .replace(/\b(CONTAINS?|MAY CONTAIN)\b.*$/gi, '') // Remove allergen warnings
    .replace(/\([^)]*\)/g, ' ')  // Remove all parentheticals
    .replace(/\[[^\]]*\]/g, ' ') // Remove brackets
    .replace(/\.+$/, '')         // Remove trailing periods
    .replace(/\s+/g, ' ')        // Normalize spaces
    .trim();
    
  // Split on various delimiters
  const ingredients = cleaned
    .split(/[,;]+/g)
    .map(x => x.trim())
    .filter(x => x.length > 1 && !x.match(/^\d+$/)) // Filter out empty, single chars, and pure numbers
    .slice(0, 60) // Cap at 60 ingredients
    .map(name => ({ name: name.toLowerCase().replace(/^(and|or)\s+/i, '').trim() }));
    
  console.log(`[ENRICH][PARSE_ING] Parsed ${ingredients.length} ingredients from "${raw.substring(0, 100)}"`);
  return ingredients;
};

// Enhanced Nutritionix API integration - branded-first with ingredient-aware scoring
const searchNutritionix = async (query: string): Promise<EnrichedFood | null> => {
  const appId = Deno.env.get('NUTRITIONIX_APP_ID');
  const apiKey = Deno.env.get('NUTRITIONIX_API_KEY');
  if (!appId || !apiKey) return null;

  try {
    console.log(`[ENRICH][NUTRITIONIX] Searching: ${query}`);
    
    // Step 1: ALWAYS call instant search to get candidates
    const instantResponse = await withTimeout(
      fetch(`https://trackapi.nutritionix.com/v2/search/instant?query=${encodeURIComponent(query)}`, {
        headers: {
          'x-app-id': appId,
          'x-app-key': apiKey
        }
      }),
      1000
    );

    if (!instantResponse.ok) {
      console.log(`[ENRICH][NUTRITIONIX] Instant search failed: ${instantResponse.status}`);
      return null;
    }
    
    const instantData = await instantResponse.json();
    const branded = instantData.branded || [];
    const common = instantData.common || [];
    
    console.log(`[ENRICH][NIX][INSTANT] branded=${branded.length} common=${common.length}`);
    
    // NEW: Branded-first strategy - try multiple branded items for ingredients
    if (branded.length > 0) {
      console.log(`[ENRICH][NX][BRANDED] Trying ${Math.min(6, branded.length)} branded candidates`);
      
      // Try up to 6 branded items to find one with good ingredients
      const brandedCandidates = branded.slice(0, 6);
      
      for (let i = 0; i < brandedCandidates.length; i++) {
        const candidate = brandedCandidates[i];
        if (candidate?.nix_item_id) {
          console.log(`[ENRICH][NX][DEEP] item=${candidate.nix_item_id} name="${candidate.food_name}"`);
          
          try {
            const itemResponse = await withTimeout(
              fetch(`https://trackapi.nutritionix.com/v2/search/item?nix_item_id=${candidate.nix_item_id}`, {
                headers: {
                  'x-app-id': appId,
                  'x-app-key': apiKey
                }
              }),
              1000
            );

            if (itemResponse.ok) {
              const itemData = await itemResponse.json();
              const foods = itemData.foods || [];
              
              if (foods.length > 0) {
                const food = foods[0];
                const result = parseNutritionixBrandedItem(food, candidate, query);
                
                console.log(`[ENRICH][NX][DEEP] item=${candidate.nix_item_id} ingredients=${result.ingredients.length}`);
                
                // If we found good ingredients (3+), return this one immediately
                if (result.ingredients.length >= 3) {
                  console.log(`[ENRICH][NX][BRANDED] Found good ingredients (${result.ingredients.length}), using this result`);
                  return result;
                }
                
                // Otherwise, if this is the last candidate or we have at least some ingredients, return it
                if (i === brandedCandidates.length - 1 || result.ingredients.length > 1) {
                  return result;
                }
              }
            }
          } catch (error) {
            console.log(`[ENRICH][NX][DEEP] Failed to fetch item ${candidate.nix_item_id}: ${error.message}`);
            continue;
          }
        }
      }
    }
    
    // Fallback to common if branded failed or unavailable
    if (common.length > 0) {
      const bestCommon = pickBestCandidate(query, common);
      console.log(`[ENRICH][NX][COMMON] low_value=true`);
      
      const naturalResult = await searchNutritionixNatural(bestCommon.food_name || query, appId, apiKey);
      if (naturalResult) {
        // Mark common results as low_value since they lack ingredient statements
        naturalResult.low_value = true;
        return naturalResult;
      }
    }
    
    console.log(`[ENRICH][NUTRITIONIX] No viable candidates found`);
    return null;
    
  } catch (error) {
    console.log(`[ENRICH][NUTRITIONIX] Failed: ${error.message}`);
    return null;
  }
};

// Helper to pick best candidate from Nutritionix results - try multiple for ingredients
const pickBestCandidate = (query: string, candidates: any[]) => {
  if (!candidates.length) return null;
  
  const lowerQuery = query.toLowerCase();
  
  // Prefer exact matches first
  const exact = candidates.find(c => 
    c.food_name?.toLowerCase() === lowerQuery ||
    c.brand_name_item_name?.toLowerCase() === lowerQuery
  );
  if (exact) return exact;
  
  // Then prefer items that start with query
  const startsWith = candidates.find(c => 
    c.food_name?.toLowerCase().startsWith(lowerQuery) ||
    c.brand_name_item_name?.toLowerCase().startsWith(lowerQuery)
  );
  if (startsWith) return startsWith;
  
  // Finally return first match
  return candidates[0];
};

// Parse branded item with ingredient statement
const parseNutritionixBrandedItem = (food: any, candidate: any, query: string): EnrichedFood => {
  // Convert to per 100g (Nutritionix gives per serving)
  const servingGrams = food.serving_weight_grams || 100;
  const scale = 100 / servingGrams;
  
  const per100g: Nutrients = {
    calories: Math.round((food.nf_calories || 0) * scale),
    protein: Math.round((food.nf_protein || 0) * scale * 10) / 10,
    fat: Math.round((food.nf_total_fat || 0) * scale * 10) / 10,
    carbs: Math.round((food.nf_total_carbohydrate || 0) * scale * 10) / 10,
    fiber: food.nf_dietary_fiber ? Math.round(food.nf_dietary_fiber * scale * 10) / 10 : undefined,
    sugar: food.nf_sugars ? Math.round(food.nf_sugars * scale * 10) / 10 : undefined,
    sodium: food.nf_sodium ? Math.round(food.nf_sodium * scale) : undefined,
    potassium: food.nf_potassium ? Math.round(food.nf_potassium * scale) : undefined,
    saturated_fat: food.nf_saturated_fat ? Math.round(food.nf_saturated_fat * scale * 10) / 10 : undefined
  };
  
  const sanitized = validateEnergy(per100g);
  
  // Parse ingredients from nf_ingredient_statement
  const rawIngredients = food.nf_ingredient_statement as string | undefined;
  const ingredients = parseIngredients(rawIngredients);
  
  // Mark as low_value if insufficient ingredients
  const low_value = ingredients.length <= 1;
  
  return {
    name: food.food_name || candidate.food_name || query,
    aliases: [food.food_name, food.brand_name, candidate.food_name].filter(Boolean),
    locale: 'auto',
    ingredients: ingredients.length > 0 ? ingredients : [{ name: food.food_name || query }],
    per100g: sanitized,
    perServing: {
      ...sanitized,
      serving_grams: servingGrams
    },
    source: 'NUTRITIONIX' as const,
    source_id: food.nix_item_id || candidate.nix_item_id,
    confidence: 0.75,
    low_value
  };
};

// Fallback to natural/nutrients API (common items only)
const searchNutritionixNatural = async (query: string, appId: string, apiKey: string): Promise<EnrichedFood | null> => {
  try {
    console.log(`[ENRICH][NUTRITIONIX] Fallback to natural/nutrients`);
    
    const response = await withTimeout(
      fetch('https://trackapi.nutritionix.com/v2/natural/nutrients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-app-id': appId,
          'x-app-key': apiKey
        },
        body: JSON.stringify({ query })
      }),
      1200
    );

    if (!response.ok) return null;
    
    const data = await response.json();
    const foods = data.foods || [];
    
    if (foods.length === 0) return null;
    
    const food = foods[0];
    
    // Convert to per 100g (Nutritionix gives per serving)
    const servingGrams = food.serving_weight_grams || 100;
    const scale = 100 / servingGrams;
    
    const per100g: Nutrients = {
      calories: Math.round((food.nf_calories || 0) * scale),
      protein: Math.round((food.nf_protein || 0) * scale * 10) / 10,
      fat: Math.round((food.nf_total_fat || 0) * scale * 10) / 10,
      carbs: Math.round((food.nf_total_carbohydrate || 0) * scale * 10) / 10,
      fiber: food.nf_dietary_fiber ? Math.round(food.nf_dietary_fiber * scale * 10) / 10 : undefined,
      sugar: food.nf_sugars ? Math.round(food.nf_sugars * scale * 10) / 10 : undefined,
      sodium: food.nf_sodium ? Math.round(food.nf_sodium * scale) : undefined,
      potassium: food.nf_potassium ? Math.round(food.nf_potassium * scale) : undefined,
      saturated_fat: food.nf_saturated_fat ? Math.round(food.nf_saturated_fat * scale * 10) / 10 : undefined
    };
    
    const sanitized = validateEnergy(per100g);
    
    // Parse ingredients from nf_ingredient_statement
    const rawIngredients = food.nf_ingredient_statement as string | undefined;
    const ingredients = parseIngredients(rawIngredients);
    
    // Mark as low_value if lacking ingredients (common for natural/nutrients)
    const low_value = ingredients.length <= 1;
    
    return {
      name: food.food_name || query,
      aliases: [food.food_name, food.brand_name].filter(Boolean),
      locale: 'auto',
      ingredients: ingredients.length > 0 ? ingredients : [{ name: food.food_name || query }],
      per100g: sanitized,
      perServing: {
        ...sanitized,
        serving_grams: servingGrams
      },
      source: 'NUTRITIONIX',
      source_id: food.nix_item_id,
      confidence: 0.75,
      low_value
    };
    
  } catch (error) {
    console.log(`[ENRICH][NUTRITIONIX] Natural fallback failed: ${error.message}`);
    return null;
  }
};

// Ingredient-aware scoring function
const calculateIngredientAwareScore = (candidate: EnrichedFood): number => {
  let score = candidate.confidence ?? 0;
  const ingredientCount = candidate.ingredients?.length ?? 0;
  
  // Boost based on ingredient count
  if (ingredientCount >= 3) {
    score += 0.25;
  } else if (ingredientCount === 2) {
    score += 0.10;
  } else {
    score -= 0.30; // Penalize lack of ingredients
  }
  
  // Additional boost for NUTRITIONIX branded items
  if (candidate.source === 'NUTRITIONIX' && !candidate.low_value) {
    score += 0.05;
  }
  
  return Math.max(0, Math.min(1, score)); // Clamp to 0-1 range
};

// GPT fallback with recipe analysis
const estimateWithGPT = async (query: string): Promise<EnrichedFood | null> => {
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openAIApiKey) return null;

  try {
    console.log(`[ENRICH][GPT] Estimating: ${query}`);
    
    const response = await withTimeout(
      fetch('https://api.openai.com/v1/chat/completions', {
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
              content: 'You are a nutrition expert. Analyze food items and provide nutritional estimates per 100g. Return valid JSON only.'
            },
            {
              role: 'user',
              content: `Analyze "${query}" and provide nutrition per 100g. Include ingredients list if it's a dish. Return JSON:
{
  "name": "food name",
  "ingredients": [{"name": "ingredient", "amount": "optional amount"}],
  "per100g": {
    "calories": number,
    "protein": number,
    "fat": number, 
    "carbs": number,
    "fiber": number,
    "sugar": number,
    "sodium": number,
    "potassium": number,
    "calcium": number,
    "iron": number
  }
}`
            }
          ],
          temperature: 0.3,
          max_tokens: 500
        }),
      }),
      1200
    );

    if (!response.ok) return null;
    
    const data = await response.json();
    const content = data.choices[0].message.content;
    
    const parsed = JSON.parse(content);
    const sanitized = validateEnergy(parsed.per100g);
    
    return {
      name: parsed.name || query,
      aliases: [parsed.name].filter(Boolean),
      locale: 'auto',
      ingredients: parsed.ingredients || [{ name: parsed.name || query }],
      per100g: sanitized,
      source: 'ESTIMATED',
      confidence: Math.random() * 0.15 + 0.55 // 0.55-0.70
    };
    
  } catch (error) {
    console.log(`[ENRICH][GPT] Failed: ${error.message}`);
    return null;
  }
};

// Feature flags - default ON unless noted
const ENRICH_V2_ING_AWARE = true; 
const ENRICH_LOG_DIAG = false;
const ENRICH_VERSION = "v2.2";

// Dish vs Ingredient routing
const DISH_WORDS = ['sandwich','burger','taco','wrap','noodle','ramen','sushi','roll','curry','biryani','yakisoba','gobi','rajas','pizza','enchilada','quesadilla'];
const SIMPLE_ING = ['apple','egg','rice','pasta','yogurt','cereal','chicken','fish','beef','salmon','banana'];

function classifyQuery(q: string): 'dish'|'ingredient' {
  const t = q.toLowerCase().trim();
  if (t.includes(' ')) return 'dish';
  if (DISH_WORDS.some(w => t.includes(w))) return 'dish';
  if (SIMPLE_ING.includes(t)) return 'ingredient';
  // single word unknown defaults to dish to avoid FDC on dishes like "yakisoba"
  return 'dish';
}

serve(async (req) => {
  console.log(`[ENRICH][REQ] ${new Date().toISOString()}`);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, locale = 'auto' } = await req.json();
    const url = new URL(req.url);
    const bustParam = url.searchParams.get('bust');
    const bustHeader = req.headers.get('x-qa-bust');
    const qaCache = bustParam === '1' || bustHeader === '1';
    
    if (!query?.trim()) {
      return new Response(JSON.stringify({ error: 'Query is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build query hash
    const normalizedQuery = query.toLowerCase().trim();
    const hashInput = `${normalizedQuery}|${locale}`;
    const query_hash = await sha256(hashInput);
    
    console.log(`[ENRICH][HASH] ${query_hash} for "${query}"`);

    // Use service role client for cache operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      }
    );

    // Cache check with versioning and QA bust
    let cached = null;
    if (!qaCache) {
      const { data } = await supabaseAdmin
        .from('food_enrichment_cache')
        .select('*')
        .eq('query_hash', query_hash)
        .or('expires_at.is.null,expires_at.gt.now()')
        .limit(1)
        .single();
        
      // Check cache version and low_value upgrade
      if (data) {
        const cacheVersion = data.response_data?.conf?.enrich_version;
        const isOldVersion = cacheVersion !== ENRICH_VERSION;
        const isOldLowValue = data.low_value === true && new Date(data.created_at).getTime() < Date.now() - 15 * 60 * 1000;
        
        if (!isOldVersion && !(ENRICH_V2_ING_AWARE && isOldLowValue)) {
          cached = data;
        }
      }
    }

    if (cached) {
      console.log(`[ENRICH][CACHE HIT]`, {
        q: normalizedQuery,
        source: cached.source,
        conf: cached.confidence,
        ingLen: cached.response_data?.ingredients?.length ?? 0,
        perServingG: cached.response_data?.perServing?.serving_grams
      });
      return new Response(JSON.stringify(cached.response_data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!ENRICH_V2_ING_AWARE) {
      // Fallback to old behavior if feature disabled
      const nutritionixResult = await searchNutritionix(query);
      if (nutritionixResult) {
        const ttl_hours = 90 * 24; // 90 days
        const expires_at = new Date(Date.now() + ttl_hours * 3600 * 1000).toISOString();
        
        await supabaseAdmin
          .from('food_enrichment_cache')
          .upsert({
            query_hash,
            query: normalizedQuery,
            response_data: nutritionixResult,
            source: nutritionixResult.source,
            confidence: nutritionixResult.confidence,
            expires_at,
            low_value: false
          }, { onConflict: 'query_hash' });

        return new Response(JSON.stringify(nutritionixResult), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // INGREDIENT-AWARE V2 LOGIC WITH DISH ROUTING
    let result: EnrichedFood | null = null;
    
    // Classify query type for provider ordering
    const queryType = classifyQuery(normalizedQuery);
    const providerOrder = queryType === 'dish' ? ['NUTRITIONIX', 'EDAMAM', 'FDC'] : ['FDC', 'EDAMAM', 'NUTRITIONIX'];
    
    // Try providers in order based on query type
    let nutritionixResult: EnrichedFood | null = null;
    let edamamResult: EnrichedFood | null = null;
    let fdcResult: EnrichedFood | null = null;
    
    for (const provider of providerOrder) {
      if (provider === 'NUTRITIONIX' && !nutritionixResult) {
        if (ENRICH_LOG_DIAG) console.log(`[ENRICH][TRY][NIX] q="${normalizedQuery}"`);
        nutritionixResult = await searchNutritionix(query);
        if (nutritionixResult && ENRICH_LOG_DIAG) {
          const branded = nutritionixResult.source_id ? true : false;
          console.log(`[ENRICH][TRY][NIX] q="${normalizedQuery}", branded=${branded}, ingLen=${nutritionixResult.ingredients.length}`);
        }
      }
      if (provider === 'EDAMAM' && !edamamResult) {
        if (ENRICH_LOG_DIAG) console.log(`[ENRICH][TRY][EDAMAM] q="${normalizedQuery}"`);
        edamamResult = await searchEdamam(query);
        if (edamamResult && ENRICH_LOG_DIAG) {
          console.log(`[ENRICH][TRY][EDAMAM] q="${normalizedQuery}", ingLen=${edamamResult.ingredients.length}`);
        }
      }
      if (provider === 'FDC' && !fdcResult) {
        if (ENRICH_LOG_DIAG) console.log(`[ENRICH][TRY][FDC] q="${normalizedQuery}"`);
        fdcResult = await searchFDC(query);
        if (fdcResult) {
          if (fdcResult.ingredients.length <= 1) {
            fdcResult.low_value = true;
          }
          if (ENRICH_LOG_DIAG) {
            console.log(`[ENRICH][TRY][FDC] q="${normalizedQuery}", ingLen=${fdcResult.ingredients.length}, kcal100g=${fdcResult.per100g.calories}`);
          }
        }
      }
    }

    // Ingredient-aware selection with minimum requirements
    const minIngredients = (candidate: EnrichedFood, queryText: string): number => {
      if (queryText.includes('sandwich') || queryText.includes('burger') || queryText.includes('taco') || queryText.includes('wrap')) {
        return candidate.source === 'NUTRITIONIX' ? 5 : 3;
      }
      return candidate.source === 'NUTRITIONIX' ? 3 : 2;
    };
    
    // Score and pick winner
    const candidates: Array<{result: EnrichedFood, score: number, reason: string, branded?: boolean}> = [];
    
    if (nutritionixResult) {
      const minIng = minIngredients(nutritionixResult, normalizedQuery);
      const ingLen = nutritionixResult.ingredients.length;
      const branded = !!nutritionixResult.source_id;
      
      let score = nutritionixResult.confidence || 0.75;
      if (ingLen >= 3) score += 0.25;
      else if (ingLen === 2) score += 0.10;
      else score -= 0.30;
      if (branded) score += 0.05;
      
      const meetsCriteria = ingLen >= minIng;
      candidates.push({
        result: nutritionixResult,
        score: meetsCriteria ? score : score - 0.5,
        reason: `NUTRITIONIX ${branded ? 'branded' : 'common'} ${meetsCriteria ? 'meets' : 'fails'} minIng=${minIng}`,
        branded
      });
    }
    
    if (edamamResult) {
      const minIng = minIngredients(edamamResult, normalizedQuery);
      const ingLen = edamamResult.ingredients.length;
      
      let score = edamamResult.confidence || 0.78;
      if (ingLen >= 3) score += 0.25;
      else if (ingLen === 2) score += 0.10;
      else score -= 0.30;
      
      const meetsCriteria = ingLen >= minIng;
      candidates.push({
        result: edamamResult,
        score: meetsCriteria ? score : score - 0.5,
        reason: `EDAMAM ${meetsCriteria ? 'meets' : 'fails'} minIng=${minIng}`
      });
    }
    
    if (fdcResult) {
      const minIng = minIngredients(fdcResult, normalizedQuery);
      const ingLen = fdcResult.ingredients.length;
      
      let score = fdcResult.confidence || 0.85;
      if (ingLen >= 3) score += 0.25;
      else if (ingLen === 2) score += 0.10;
      else score -= 0.30;
      
      const meetsCriteria = ingLen >= minIng;
      candidates.push({
        result: fdcResult,
        score: meetsCriteria ? score : score - 0.5,
        reason: `FDC ${meetsCriteria ? 'meets' : 'fails'} minIng=${minIng}`
      });
    }
    
    // Pick highest scoring candidate
    if (candidates.length > 0) {
      candidates.sort((a, b) => b.score - a.score);
      const winner = candidates[0];
      result = winner.result;
      
      console.log(`[ENRICH][DECISION]`, {
        q: normalizedQuery,
        route: queryType,
        tried: providerOrder,
        picked: {
          source: result.source,
          ingLen: result.ingredients.length,
          reason: winner.reason,
          branded: winner.branded || false
        }
      });
    }
    
    // Final fallback: GPT estimation
    if (!result) {
      result = await estimateWithGPT(query);
      if (result) {
        result.low_value = true; // GPT estimates are always low value
        if (ENRICH_LOG_DIAG) console.log(`[ENRICH][PICK] source=ESTIMATED, ingLen=${result.ingredients.length}, fallback=true`);
      }
    }
    
    if (!result) {
      console.log(`[ENRICH][MISS] No results for "${query}"`);
      return new Response(JSON.stringify({ error: 'No nutrition data found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Set low_value flag based on ingredient count
    if (result.ingredients.length <= 1 && !result.low_value) {
      result.low_value = true;
    }

    // Add cache versioning to result
    result = {
      ...result,
      conf: {
        enrich_version: ENRICH_VERSION,
        branded: result.source === 'NUTRITIONIX' && !!result.source_id,
        providerPath: queryType
      }
    };

    // Log final result
    const ttl_hours = result.low_value ? 6 : (90 * 24); // 6h for low-value, 90d for good results
    
    console.log("[ENRICH][PICK]", {
      source: result.source,
      ingLen: result.ingredients?.length ?? 0,
      lowValue: result.low_value || false,
      ttl: `${ttl_hours}h`
    });

    // CACHE WITH LOW_VALUE AWARENESS
    const expires_at = new Date(Date.now() + ttl_hours * 3600 * 1000).toISOString();
    
    await supabaseAdmin
      .from('food_enrichment_cache')
      .upsert({
        query_hash,
        query: normalizedQuery,
        response_data: result,
        source: result.source,
        confidence: result.confidence,
        expires_at,
        low_value: result.low_value || false
      }, { onConflict: 'query_hash' });

    console.log(`[ENRICH][CACHED] ${result.source} expires=${expires_at.split('T')[0]} low_value=${result.low_value || false}`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error(`[ENRICH][ERROR] ${error.message}`);
    return new Response(JSON.stringify({
      error: 'Enrichment failed',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
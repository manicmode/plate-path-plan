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

// Parse ingredients from various sources (Nutritionix, Edamam, etc.)
const parseIngredients = (raw?: string) => {
  if (!raw) return [];
  return raw
    .split(/[,;]+/g)
    .map(x => x.replace(/\(.*?\)/g, ''))   // drop parentheticals
    .map(x => x.trim())
    .filter(Boolean)
    .slice(0, 60) // increased cap
    .map(name => ({ name }));
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
    
    // NEW: Branded-first strategy
    if (branded.length > 0) {
      // Prefer branded items - they have better ingredient data
      const bestBranded = pickBestCandidate(query, branded);
      if (bestBranded?.nix_item_id) {
        console.log(`[ENRICH][NX][DEEP] item=${bestBranded.nix_item_id} (branded)`);
        
        const itemResponse = await withTimeout(
          fetch(`https://trackapi.nutritionix.com/v2/search/item?nix_item_id=${bestBranded.nix_item_id}`, {
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
            const result = parseNutritionixBrandedItem(food, bestBranded, query);
            
            console.log(`[ENRICH][NX][DEEP] item=${bestBranded.nix_item_id} ingredients=${result.ingredients.length}`);
            return result;
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

// Helper to pick best candidate from Nutritionix results
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

serve(async (req) => {
  console.log(`[ENRICH][REQ] ${new Date().toISOString()}`);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, locale = 'auto' } = await req.json();
    
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

    // Cache check
    const { data: cached } = await supabaseAdmin
      .from('food_enrichment_cache')
      .select('*')
      .eq('query_hash', query_hash)
      .or('expires_at.is.null,expires_at.gt.now()')
      .limit(1)
      .single();

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

    // ENHANCED INGREDIENT-AWARE PROVIDER CASCADE
    let result: EnrichedFood | null = null;
    
    // Detect multi-word or non-ASCII tokens  
    const isMultiWord = normalizedQuery.includes(' ') || /[^\x00-\x7F]/.test(normalizedQuery);
    
    if (isMultiWord) {
      console.log(`[ENRICH][MULTI-WORD] Priority: NUTRITIONIX → EDAMAM → FDC → ESTIMATED`);
      
      // Sequential cascade for multi-word with enhanced logic
      const nutritionixResult = await searchNutritionix(query);
      let edamamResult: EnrichedFood | null = null;
      
      // Always try Edamam for ingredient comparison, even after NX-common
      if (!nutritionixResult || nutritionixResult.low_value || nutritionixResult.ingredients.length <= 1) {
        edamamResult = await searchEdamam(query);
      }
      
      // Use ingredient-aware scoring to pick winner
      const candidates: ProviderCandidate[] = [];
      
      if (nutritionixResult) {
        const scored = calculateIngredientAwareScore(nutritionixResult);
        candidates.push({
          result: nutritionixResult,
          src: 'NUTRITIONIX',
          conf: scored,
          ing_len: nutritionixResult.ingredients.length,
          low_value: nutritionixResult.low_value || false
        });
      }
      
      if (edamamResult) {
        const scored = calculateIngredientAwareScore(edamamResult);
        candidates.push({
          result: edamamResult,
          src: 'EDAMAM',
          conf: scored,
          ing_len: edamamResult.ingredients.length,
          low_value: edamamResult.low_value || false
        });
      }
      
      // Pick best candidate or fall back to FDC
      if (candidates.length > 0) {
        const winner = candidates.reduce((best, curr) => 
          curr.conf > best.conf ? curr : best
        );
        
        // Only use if score is decent, otherwise try FDC
        if (winner.conf >= 0.6) {
          result = winner.result;
          console.log(`[ENRICH][HIT source=${winner.src}] confidence=${winner.conf.toFixed(2)} ingredients=${winner.ing_len}`);
        }
      }
      
      // FDC fallback if no good candidates
      if (!result) {
        const fdcResult = await searchFDC(query);
        if (fdcResult) {
          result = fdcResult;
          console.log(`[ENRICH][HIT source=FDC] confidence=${result.confidence}`);
        }
      }
      
    } else {
      // Single word: FDC-first but use ingredient-aware scoring for final pick
      console.log(`[ENRICH][SINGLE-WORD] Priority: FDC → EDAMAM → NUTRITIONIX → ESTIMATED`);
      
      const [fdcResult, edamamResult, nutritionixResult] = await Promise.all([
        searchFDC(query),
        searchEdamam(query),
        searchNutritionix(query)
      ]);
      
      // Build candidates with ingredient-aware scoring
      const candidates: ProviderCandidate[] = [];
      
      if (nutritionixResult) {
        const scored = calculateIngredientAwareScore(nutritionixResult);
        candidates.push({
          result: nutritionixResult,
          src: 'NUTRITIONIX',
          conf: scored,
          ing_len: nutritionixResult.ingredients.length,
          low_value: nutritionixResult.low_value || false
        });
      }
      
      if (edamamResult) {
        const scored = calculateIngredientAwareScore(edamamResult);
        candidates.push({
          result: edamamResult,
          src: 'EDAMAM', 
          conf: scored,
          ing_len: edamamResult.ingredients.length,
          low_value: edamamResult.low_value || false
        });
      }
      
      if (fdcResult) {
        const scored = calculateIngredientAwareScore(fdcResult);
        candidates.push({
          result: fdcResult,
          src: 'FDC',
          conf: scored, 
          ing_len: fdcResult.ingredients.length,
          low_value: fdcResult.low_value || false
        });
      }
      
      // Pick highest scoring candidate
      if (candidates.length > 0) {
        const winner = candidates.reduce((best, curr) => 
          curr.conf > best.conf ? curr : best
        );
        result = winner.result;
        
        // Mark as low_value if ingredients are insufficient
        if (winner.ing_len <= 1) {
          result.low_value = true;
        }
        
        console.log(`[ENRICH][DECISION] Picked ${winner.src} (score=${winner.conf.toFixed(2)}, ing_len=${winner.ing_len})`);
      }
      
      // Log decision telemetry
      if (candidates.length > 0) {
        console.log(`[ENRICH][DECISION]`, {
          q: normalizedQuery,
          picked: result?.source || 'NONE', 
          ingredients_len: result?.ingredients.length || 0,
          candidates: candidates.map(c => ({
            src: c.src,
            conf: c.conf.toFixed(2),
            ing_len: c.ing_len,
            low_value: c.low_value
          }))
        });
      }
    }
    
    // Final fallback: GPT estimation
    if (!result) {
      result = await estimateWithGPT(query);
      if (result) {
        console.log(`[ENRICH][HIT source=ESTIMATED] confidence=${result.confidence}`);
      }
    }
    
    if (!result) {
      console.log(`[ENRICH][MISS] No results for "${query}"`);
      return new Response(JSON.stringify({ error: 'No nutrition data found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // INGREDIENT BACKFILL: If chosen nutrition source lacks ingredients, find best ingredient source
    if (result.ingredients.length <= 1 && result.source !== 'ESTIMATED') {
      try {
        console.log(`[ENRICH][BACKFILL] Attempting ingredient backfill for ${result.source}`);
        
        // Try other providers for ingredients if we haven't already
        const ingredientCandidates: EnrichedFood[] = [];
        
        if (result.source !== 'NUTRITIONIX') {
          const nixResult = await searchNutritionix(query);
          if (nixResult && nixResult.ingredients.length > 1) {
            ingredientCandidates.push(nixResult);
          }
        }
        
        if (result.source !== 'EDAMAM') {
          const edamamResult = await searchEdamam(query);  
          if (edamamResult && edamamResult.ingredients.length > 1) {
            ingredientCandidates.push(edamamResult);
          }
        }
        
        // Try GPT as last resort
        const gptResult = await estimateWithGPT(query);
        if (gptResult && gptResult.ingredients.length > 1) {
          ingredientCandidates.push(gptResult);
        }
        
        if (ingredientCandidates.length > 0) {
          // Pick best ingredient source (prefer most ingredients)
          const bestIngredientSource = ingredientCandidates.reduce((best, curr) => 
            curr.ingredients.length > best.ingredients.length ? curr : best
          );
          
          console.log(`[ENRICH][BACKFILL] Success: ${bestIngredientSource.ingredients.length} ingredients from ${bestIngredientSource.source}`);
          
          // Compose final object: Keep macros from nutrition source, ingredients from ingredient source  
          result.ingredients = bestIngredientSource.ingredients;
          result.ingredient_source = bestIngredientSource.source; // Telemetry only - UI shows nutrition source
        }
      } catch (error) {
        console.log(`[ENRICH][BACKFILL] Failed: ${error.message}`);
        // Continue with original result
      }
    }

    // Set low_value flag based on ingredient count
    if (result.ingredients.length <= 1 && !result.low_value) {
      result.low_value = true;
    }

    // Log what the edge function returns before cache write/return
    console.log("[ENRICH][HIT]", {
      q: normalizedQuery, 
      source: result.source, 
      conf: result.confidence,
      ingLen: result.ingredients?.length ?? 0,
      low_value: result.low_value || false,
      perServingG: result.perServing?.serving_grams
    });

    // CACHE WITH LOW_VALUE AWARENESS
    const ttl_hours = result.low_value ? 6 : (90 * 24); // 6h for low-value, 90d for good results
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
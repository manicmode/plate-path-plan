import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// redeploy marker: 2025-01-06T15:45:00Z
console.log('[ENRICH][BOOT]');

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

// Edamam API integration
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
    
    return {
      name: food.label || query,
      aliases: [food.label, food.brand].filter(Boolean),
      locale: 'auto',
      ingredients: [{
        name: food.label || query
      }],
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

// Parse Nutritionix ingredients
const parseIngredients = (raw?: string) => {
  if (!raw) return [];
  return raw
    .split(/[,;]+/g)
    .map(x => x.replace(/\(.*?\)/g, ''))   // drop parentheticals
    .map(x => x.trim())
    .filter(Boolean)
    .slice(0, 40)
    .map(name => ({ name }));
};

// Nutritionix API integration with deep-fetch
const searchNutritionix = async (query: string): Promise<EnrichedFood | null> => {
  const appId = Deno.env.get('NUTRITIONIX_APP_ID');
  const apiKey = Deno.env.get('NUTRITIONIX_API_KEY');
  if (!appId || !apiKey) return null;

  try {
    console.log(`[ENRICH][NUTRITIONIX] Searching: ${query}`);
    
    // Step 1: Instant search to get candidates
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
    
    // Prefer branded items for ingredients, fall back to common
    const candidates = [...branded, ...common];
    if (candidates.length === 0) {
      console.log(`[ENRICH][NUTRITIONIX] No candidates found`);
      return null;
    }
    
    const topCandidate = candidates[0];
    const nixItemId = topCandidate.nix_item_id || topCandidate.tag_id;
    
    if (!nixItemId) {
      console.log(`[ENRICH][NUTRITIONIX] No item ID found for deep fetch`);
      return null;
    }

    // Step 2: Deep fetch item details for ingredients
    console.log(`[ENRICH][NUTRITIONIX] Deep fetch: ${nixItemId}`);
    const itemResponse = await withTimeout(
      fetch(`https://trackapi.nutritionix.com/v2/search/item?nix_item_id=${nixItemId}`, {
        headers: {
          'x-app-id': appId,
          'x-app-key': apiKey
        }
      }),
      1000
    );

    if (!itemResponse.ok) {
      console.log(`[ENRICH][NUTRITIONIX] Item fetch failed: ${itemResponse.status}`);
      // Fallback to natural/nutrients
      return await searchNutritionixNatural(query, appId, apiKey);
    }
    
    const itemData = await itemResponse.json();
    const foods = itemData.foods || [];
    
    if (foods.length === 0) {
      console.log(`[ENRICH][NUTRITIONIX] No detailed food data`);
      return await searchNutritionixNatural(query, appId, apiKey);
    }
    
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
    
    // Parse ingredients from nf_ingredient_statement (key benefit of deep fetch)
    const rawIngredients = food.nf_ingredient_statement as string | undefined;
    const ingredients = parseIngredients(rawIngredients);
    
    const result = {
      name: food.food_name || topCandidate.food_name || query,
      aliases: [food.food_name, food.brand_name, topCandidate.food_name].filter(Boolean),
      locale: 'auto',
      ingredients: ingredients.length > 0 ? ingredients : [{ name: food.food_name || query }],
      per100g: sanitized,
      perServing: {
        ...sanitized,
        serving_grams: servingGrams
      },
      source: 'NUTRITIONIX' as const,
      source_id: nixItemId,
      confidence: 0.75
    };

    console.log(`[ENRICH][NUTRITIONIX] Deep fetch success: ${ingredients.length} ingredients`);
    return result;
    
  } catch (error) {
    console.log(`[ENRICH][NUTRITIONIX] Failed: ${error.message}`);
    return null;
  }
};

// Fallback to natural/nutrients API
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
      confidence: 0.75
    };
    
  } catch (error) {
    console.log(`[ENRICH][NUTRITIONIX] Natural fallback failed: ${error.message}`);
    return null;
  }
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

    // Resolver cascade - prioritize Nutritionix for complex queries
    let result: EnrichedFood | null = null;
    
    // Detect if query is complex (multiple words) suggesting a composed dish
    const isComplexQuery = normalizedQuery.split(' ').length >= 2;
    
    if (isComplexQuery) {
      // 1. Try Nutritionix first for complex queries (better ingredients)
      result = await searchNutritionix(query);
      if (result) {
        console.log(`[ENRICH][HIT source=NUTRITIONIX] confidence=${result.confidence}`);
      }
      
      // 2. Try FDC if Nutritionix failed or low confidence
      if (!result || result.confidence < 0.7) {
        const fdcResult = await searchFDC(query);
        if (fdcResult && (!result || fdcResult.confidence > result.confidence)) {
          result = fdcResult;
          console.log(`[ENRICH][HIT source=FDC] confidence=${result.confidence}`);
        }
      }
    } else {
      // 1. Try FDC first for simple queries (single ingredients)
      result = await searchFDC(query);
      if (result) {
        console.log(`[ENRICH][HIT source=FDC] confidence=${result.confidence}`);
      }
      
      // 2. Try Nutritionix if FDC failed or low confidence
      if (!result || result.confidence < 0.7) {
        const nutritionixResult = await searchNutritionix(query);
        if (nutritionixResult && (!result || nutritionixResult.confidence > result.confidence)) {
          result = nutritionixResult;
          console.log(`[ENRICH][HIT source=NUTRITIONIX] confidence=${result.confidence}`);
        }
      }
    }
    
    // 3. Try Edamam if still low confidence
    if (!result || result.confidence < 0.7) {
      const edamamResult = await searchEdamam(query);
      if (edamamResult && (!result || edamamResult.confidence > result.confidence)) {
        result = edamamResult;
        console.log(`[ENRICH][HIT source=EDAMAM] confidence=${result.confidence}`);
      }
    }
    
    // 4. GPT fallback
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

    // Step 4: Ingredient backfill safety
    // If winning source has no ingredients, backfill from GPT estimation
    if (result.ingredients.length <= 1 && result.source !== 'ESTIMATED') {
      try {
        console.log(`[ENRICH][BACKFILL] Attempting ingredient backfill for ${result.source}`);
        const gptResult = await estimateWithGPT(query);
        
        if (gptResult && gptResult.ingredients.length > 1) {
          console.log(`[ENRICH][BACKFILL] Success: ${gptResult.ingredients.length} ingredients from GPT`);
          // Keep nutrition from trusted source, use ingredients from GPT
          result.ingredients = gptResult.ingredients;
          result.ingredient_source = 'ESTIMATED'; // Mark ingredient source
        }
      } catch (error) {
        console.log(`[ENRICH][BACKFILL] Failed: ${error.message}`);
        // Continue with original result
      }
    }

    // B) Log what the edge function returns before cache write/return
    console.log("[ENRICH][HIT]", {
      q: normalizedQuery, 
      source: result.source, 
      conf: result.confidence,
      ingLen: result.ingredients?.length ?? 0,
      perServingG: result.perServing?.serving_grams
    });

    // Cache the result with 90-day TTL
    const expires_at = new Date(Date.now() + 90 * 24 * 3600 * 1000).toISOString();
    
    await supabaseAdmin
      .from('food_enrichment_cache')
      .upsert({
        query_hash,
        query: normalizedQuery,
        response_data: result,
        source: result.source,
        confidence: result.confidence,
        expires_at
      }, { onConflict: 'query_hash' });

    console.log(`[ENRICH][CACHED] ${result.source} expires=${expires_at.split('T')[0]}`);

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
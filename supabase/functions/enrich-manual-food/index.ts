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

// Nutritionix branded deep-fetch resolver for sandwichy queries
const resolveNutritionixBranded = async (q: string): Promise<EnrichedFood | null> => {
  const appId = Deno.env.get('NUTRITIONIX_APP_ID');
  const apiKey = Deno.env.get('NUTRITIONIX_API_KEY');
  if (!appId || !apiKey) return null;

  try {
    // 1) normalize bread-y phrasing (keep bread token for scoring)
    const breadTokens = ['wheat','white','sourdough','rye','multigrain','whole','ciabatta','brioche'];
    const breadHint = (q.match(/\b(wheat|white|sourdough|rye|multigrain|whole|ciabatta|brioche)\b/i)?.[0] ?? '').toLowerCase();
    const coreQ = q.replace(/\bon\s+(wheat|white|sourdough|rye|multigrain|whole|bread)\b/i, '').trim();

    // 2) instant search (prefer branded list)
    const instant = await withTimeout(
      fetch(`https://trackapi.nutritionix.com/v2/search/instant?query=${encodeURIComponent(coreQ)}`, {
        headers: {
          'x-app-id': appId,
          'x-app-key': apiKey
        }
      }),
      1200
    );

    if (!instant.ok) return null;
    
    const instantData = await instant.json();
    const branded = (instantData?.branded ?? []).slice(0, 12); // widen net

    if (branded.length === 0) return null;

    // 3) deep-fetch all branded hits in parallel, parse ingredients
    const fetched = await Promise.all(branded.map(async (b: any) => {
      try {
        const fullResponse = await withTimeout(
          fetch(`https://trackapi.nutritionix.com/v2/search/item?nix_item_id=${b.nix_item_id}`, {
            headers: {
              'x-app-id': appId,
              'x-app-key': apiKey
            }
          }),
          1200
        );

        if (!fullResponse.ok) return null;

        const fullData = await fullResponse.json();
        const full = fullData.foods?.[0];
        if (!full) return null;

        const ings = parseIngredients(full?.nf_ingredient_statement); // existing parser
        const ingLen = ings.length;

        // sandwichy scoring: ingredients, bread match, brand presence
        let score = (full?.nutr_confidence ?? 0) + (ingLen >= 5 ? 0.5 : ingLen >= 3 ? 0.25 : -0.5);
        if (breadHint && full?.nf_ingredient_statement?.toLowerCase().includes(breadHint)) score += 0.15;
        if (full?.brand_name) score += 0.05;

        return { full, ingLen, score };
      } catch (error) {
        console.log(`[ENRICH][NUTRITIONIX] Deep-fetch failed for ${b.nix_item_id}: ${error.message}`);
        return null;
      }
    }));

    // choose best
    const validFetched = fetched.filter(f => f !== null);
    if (validFetched.length === 0) return null;

    const best = validFetched.sort((a,b) => b!.score - a!.score)[0];
    if (best && best.ingLen >= 5) {
      const result = parseNutritionixBrandedItem(best.full, { nix_item_id: best.full.nix_item_id }, q);
      if (ENRICH_LOG_DIAG) {
        console.log(`[ENRICH][FETCH:NUTRITIONIX] {id: "${best.full.nix_item_id}", name: "${best.full.food_name}", branded: true, ingredients_len: ${best.ingLen}}`);
      }
      return result;
    }
    return null; // signal "no qualifying brand hit"
  } catch (error) {
    console.log(`[ENRICH][NUTRITIONIX] Branded resolve failed: ${error.message}`);
    return null;
  }
};

// Enhanced Nutritionix API integration - branded-first with bread-aware scoring
const searchNutritionix = async (query: string, breadKind?: string, isSandwich = false): Promise<EnrichedFood | null> => {
  const appId = Deno.env.get('NUTRITIONIX_APP_ID');
  const apiKey = Deno.env.get('NUTRITIONIX_API_KEY');
  if (!appId || !apiKey) return null;

  try {
    if (ENRICH_LOG_DIAG) {
      console.log(`[ENRICH][FETCH:NUTRITIONIX] Searching: ${query}`);
    }
    
    // Step 1: Call instant search to get candidates
    const instantResponse = await withTimeout(
      fetch(`https://trackapi.nutritionix.com/v2/search/instant?query=${encodeURIComponent(query)}`, {
        headers: {
          'x-app-id': appId,
          'x-app-key': apiKey
        }
      }),
      1200
    );

    if (!instantResponse.ok) {
      console.log(`[ENRICH][NUTRITIONIX] Instant search failed: ${instantResponse.status}`);
      return null;
    }
    
    const instantData = await instantResponse.json();
    const branded = instantData.branded || [];
    const common = instantData.common || [];
    
    if (ENRICH_LOG_DIAG) {
      console.log(`[ENRICH][TRY][NIX] q="${query}", branded=${branded.length}, common=${common.length}`);
    }
    
    // Enhanced branded-first strategy with sandwich priority
    if (branded.length > 0 && ENRICH_BRAND_FIRST) {
      let bestCandidate: any = null;
      let bestScore = 0;
      let bestResult: EnrichedFood | null = null;
      
      // For sandwiches, prioritize items that match query tokens closely
      let candidatesToTry = branded;
      if (isSandwich) {
        const queryTokens = query.toLowerCase().split(/\s+/);
        candidatesToTry = branded.filter((candidate: any) => {
          const name = (candidate.food_name || '').toLowerCase();
          const brandItem = (candidate.brand_name_item_name || '').toLowerCase();
          const combined = `${name} ${brandItem}`;
          
          // Check if all query tokens are present
          return queryTokens.every(token => combined.includes(token));
        });
        
        if (candidatesToTry.length === 0) {
          candidatesToTry = branded; // Fallback to all branded if no matches
        }
      }
      
      // Try up to 5 branded candidates
      const maxCandidates = Math.min(5, candidatesToTry.length);
      
      for (let i = 0; i < maxCandidates; i++) {
        const candidate = candidatesToTry[i];
        if (!candidate?.nix_item_id) continue;
        
        try {
          const itemResponse = await withTimeout(
            fetch(`https://trackapi.nutritionix.com/v2/search/item?nix_item_id=${candidate.nix_item_id}`, {
              headers: {
                'x-app-id': appId,
                'x-app-key': apiKey
              }
            }),
            1200
          );

          if (itemResponse.ok) {
            const itemData = await itemResponse.json();
            const foods = itemData.foods || [];
            
            if (foods.length > 0) {
              const food = foods[0];
              const result = parseNutritionixBrandedItem(food, candidate, query);
              const ingLen = result.ingredients.length;
              
              if (ENRICH_LOG_DIAG) {
                console.log(`[ENRICH][FETCH:NUTRITIONIX] {id: "${candidate.nix_item_id}", name: "${candidate.food_name}", branded: true, ingredients_len: ${ingLen}}`);
              }
              
              // Calculate candidate score
              let score = result.confidence || 0.75;
              
              // Ingredient scoring
              if (ingLen >= 3) score += 0.25;
              else if (ingLen === 2) score += 0.10;
              else score -= 0.30;
              
              // Brand boost
              score += 0.05;
              
              // Bread matching bonus
              if (breadKind && (candidate.food_name || candidate.brand_name_item_name || '').toLowerCase().includes(breadKind.toLowerCase())) {
                score += 0.05;
              }
              
              // Sandwich-specific boosts
              if (isSandwich && ENRICH_SANDWICH_ROUTING) {
                if (ingLen >= 5) {
                  score += 0.30; // Major boost for detailed sandwiches
                }
                if (ingLen >= 8) {
                  score += 0.20; // Extra boost for very detailed ingredient lists
                }
              }
              
              // Accept immediately if meets brand criteria
              const minIngredients = isSandwich ? 5 : 3;
              if (ingLen >= minIngredients) {
                if (ENRICH_LOG_DIAG) {
                  console.log(`[ENRICH][SELECT] {source: "NUTRITIONIX", ingredients_len: ${ingLen}, breadMatched: ${!!breadKind}}`);
                }
                return result;
              }
              
              // Track best candidate if none meet immediate criteria
              if (score > bestScore) {
                bestScore = score;
                bestCandidate = candidate;
                bestResult = result;
              }
            }
          }
        } catch (error) {
          console.log(`[ENRICH][NUTRITIONIX] Deep-fetch failed for ${candidate.nix_item_id}: ${error.message}`);
          continue;
        }
      }
      
      // Return best branded result if we found one
      if (bestResult) {
        return bestResult;
      }
    }
    
    // Fallback to common if branded failed or unavailable
    if (common.length > 0) {
      const bestCommon = pickBestCandidate(query, common);
      
      const naturalResult = await searchNutritionixNatural(bestCommon.food_name || query, appId, apiKey);
      if (naturalResult) {
        // Mark common results as low_value since they lack ingredient statements
        naturalResult.low_value = true;
        return naturalResult;
      }
    }
    
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

// Feature flags from flag system (default ON except DIAG)
const flag = (name: string, onByDefault = true) => {
  const v = (Deno.env as any)?.[name];
  if (v === undefined || v === null) return onByDefault;
  if (typeof v === 'string') return v === '1' || v.toLowerCase() === 'true';
  return !!v;
};

const ENRICH_V2_ING_AWARE = flag('VITE_ENRICH_V2_ING_AWARE', true);
const ENRICH_BRAND_FIRST = flag('VITE_ENRICH_BRAND_FIRST', true);
const ENRICH_SANDWICH_ROUTING = flag('VITE_ENRICH_SANDWICH_ROUTING', true);
const ENRICH_LOG_DIAG = flag('VITE_ENRICH_LOG_DIAG', false);
const ENRICH_VERSION = "v2.2";

// Query classification helpers
const SANDWICH_HINTS = ['sandwich', 'club sandwich', 'sub', 'hoagie', 'panini', 'wrap', 'burger', 'taco'];

function isSandwichy(q: string) {
  const s = q.toLowerCase();
  return SANDWICH_HINTS.some(h => s.includes(h));
}

function isMultiWord(q: string) {
  return q.trim().includes(' ');
}

const BREAD_HINTS = ['wheat', 'whole', 'white', 'sourdough', 'multigrain', 'rye'];

function extractBreadHints(q: string) {
  const s = q.toLowerCase();
  return BREAD_HINTS.filter(h => s.includes(h));
}

// Enhanced provider ordering with FDC guards
const calculateProviderScore = (candidate: EnrichedFood, query: string): number => {
  let score = candidate.confidence ?? 0.75;
  const ingredientCount = candidate.ingredients?.length ?? 0;
  
  // Ingredient scoring nudges
  if (ingredientCount >= 5) {
    score += 0.5;
  } else if (ingredientCount >= 3) {
    score += 0.25;
  } else if (ingredientCount === 2) {
    score += 0.10;
  } else {
    score -= 0.30;
  }
  
  // Hard gate for FDC with ≤1 ingredients
  if (candidate.source === 'FDC' && ingredientCount <= 1) {
    score = -Infinity; // Never select weak FDC if others meet thresholds
    candidate.low_value = true;
  }
  
  return score;
};

// Provider ordering with ingredient-aware thresholds
const tryProviderOrdering = async (query: string, breadKind?: string): Promise<EnrichedFood | null> => {
  const isSandwich = isSandwichy(query);
  const isMultiWordQuery = isMultiWord(query);
  
  if (ENRICH_LOG_DIAG) {
    console.log(`[ENRICH] Query classification: sandwich=${isSandwich}, multiWord=${isMultiWordQuery}`);
  }
  
  let nutritionixResult: EnrichedFood | null = null;
  let edamamResult: EnrichedFood | null = null;
  let fdcResult: EnrichedFood | null = null;
  
  // Try providers in parallel for efficiency
  const [nxi, eda, fdc] = await Promise.all([
    searchNutritionix(query, breadKind, isSandwich),
    searchEdamam(query),
    searchFDC(query)
  ]);
  
  nutritionixResult = nxi;
  edamamResult = eda;
  fdcResult = fdc;
  
  // Apply thresholds based on query type and provider
  const getThreshold = (source: string, isSandwich: boolean, isMultiWordQuery: boolean): number => {
    if (isSandwich) {
      switch (source) {
        case 'NUTRITIONIX': return 5;
        case 'EDAMAM': return 3;
        case 'FDC': return 2;
        default: return 2;
      }
    } else if (isMultiWordQuery) {
      switch (source) {
        case 'NUTRITIONIX': return 3;
        case 'EDAMAM': return 3;
        case 'FDC': return 2;
        default: return 2;
      }
    } else {
      // Single word queries are more lenient
      switch (source) {
        case 'NUTRITIONIX': return 2;
        case 'EDAMAM': return 2;
        case 'FDC': return 1;
        default: return 1;
      }
    }
  };
  
  // Check if candidates meet thresholds
  const candidates: Array<{result: EnrichedFood, score: number, source: string, meetsThreshold: boolean}> = [];
  
  if (nutritionixResult) {
    const threshold = getThreshold('NUTRITIONIX', isSandwich, isMultiWordQuery);
    const meetsThreshold = nutritionixResult.ingredients.length >= threshold;
    const score = calculateProviderScore(nutritionixResult, query);
    candidates.push({
      result: nutritionixResult,
      score: meetsThreshold ? score : -1,
      source: 'NUTRITIONIX',
      meetsThreshold
    });
  }
  
  if (edamamResult) {
    const threshold = getThreshold('EDAMAM', isSandwich, isMultiWordQuery);
    const meetsThreshold = edamamResult.ingredients.length >= threshold;
    const score = calculateProviderScore(edamamResult, query);
    candidates.push({
      result: edamamResult,
      score: meetsThreshold ? score : -1,
      source: 'EDAMAM',
      meetsThreshold
    });
  }
  
  if (fdcResult) {
    const threshold = getThreshold('FDC', isSandwich, isMultiWordQuery);
    const meetsThreshold = fdcResult.ingredients.length >= threshold;
    const score = calculateProviderScore(fdcResult, query);
    
    // Additional FDC guard: don't select if other providers meet their thresholds
    const hasOtherQualified = candidates.some(c => c.meetsThreshold);
    const finalScore = (hasOtherQualified && fdcResult.ingredients.length <= 1) ? -Infinity : score;
    
    candidates.push({
      result: fdcResult,
      score: meetsThreshold ? finalScore : -1,
      source: 'FDC',
      meetsThreshold
    });
  }
  
  // Sort by score (highest first) and return best candidate
  candidates.sort((a, b) => b.score - a.score);
  
  if (candidates.length > 0 && candidates[0].score > -1) {
    const winner = candidates[0];
    
    if (ENRICH_LOG_DIAG) {
      console.log(`[ENRICH][SELECT] {source: "${winner.source}", ingredients_len: ${winner.result.ingredients.length}, threshold: ${getThreshold(winner.source, isSandwich, isMultiWordQuery)}, meetsThreshold: ${winner.meetsThreshold}}`);
    }
    
    return winner.result;
  }
  
  return null;
};

// QA Cache clearing helper (dev/test only)
const clearQACache = async (supabaseAdmin: any): Promise<boolean> => {
  try {
    const qaQueries = [
      'club sandwich',
      'club sandwich on wheat', 
      'yakisoba',
      'aloo gobi',
      'pollo con rajas'
    ];
    
    const { error } = await supabaseAdmin
      .from('food_enrichment_cache')
      .delete()
      .in('query', qaQueries);
    
    if (error) {
      console.error('[QA] Cache clear failed:', error);
      return false;
    }
    
    console.log('[QA] Cache cleared for', qaQueries.length, 'QA queries');
    return true;
  } catch (error) {
    console.error('[QA] Cache clear error:', error);
    return false;
  }
};

serve(async (req) => {
  console.log(`[ENRICH][REQ] ${new Date().toISOString()}`);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  
  // Handle QA cache clearing endpoint
  if (url.pathname.includes('clear-qa-cache')) {
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
    
    const success = await clearQACache(supabaseAdmin);
    return new Response(JSON.stringify({ success }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { query, locale = 'auto' } = await req.json();
    const bustParam = url.searchParams.get('bust');
    const bustHeader = req.headers.get('x-qa-bust');
    const qaCache = bustParam === '1' || bustHeader === '1';
    
    if (!query?.trim()) {
      return new Response(JSON.stringify({ error: 'Query is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract bread hints for sandwich scoring (don't change search query)
    const breadKind = extractBreadHints(query)[0] || undefined;
    const searchQuery = query;

    // Build query hash for caching (use original query, not normalized)
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
      const nutritionixResult = await searchNutritionix(query, breadKind);
      if (nutritionixResult) {
        // Add versioning to result
        nutritionixResult.conf = { 
          enrich_version: ENRICH_VERSION,
          providerPath: 'nutritionix_legacy'
        };
        
        const ttl_hours = nutritionixResult.low_value ? 6 : 90 * 24;
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
            low_value: nutritionixResult.low_value || false
          }, { onConflict: 'query_hash' });

        return new Response(JSON.stringify(nutritionixResult), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // INGREDIENT-AWARE V2 LOGIC WITH FINALIZED PROVIDER ORDER
    let result: EnrichedFood | null = null;
    
    // Use new provider ordering system
    result = await tryProviderOrdering(searchQuery, breadKind);

    // still nothing? FDC fallback
    if (!result) result = await searchFDC(searchQuery);
    
    // Telemetry for final decision
    if (result && ENRICH_LOG_DIAG) {
      console.log(`[ENRICH][WIN]`, { q: query, source: result.source, ingLen: result.ingredients?.length });
    }
    
    // Final fallback: GPT estimation
    if (!result) {
      result = await estimateWithGPT(query);
      if (result) {
        result.low_value = true; // GPT estimates are always low value
      }
    }
    
    if (!result) {
      console.log(`[ENRICH][MISS] No results for "${query}"`);
      return new Response(JSON.stringify({ error: 'No nutrition data found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Add versioning to result
    result.conf = { 
      enrich_version: ENRICH_VERSION,
      providerPath: result.source.toLowerCase(),
      ...(result.conf || {})
    };

    // Cache the result with appropriate TTL
    const ttl_hours = result.low_value ? 6 : 90 * 24; // 6 hours for low value, 90 days for good results
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

    console.log(`[ENRICH][SUCCESS]`, {
      q: normalizedQuery,
      source: result.source,
      conf: result.confidence,
      ingLen: result.ingredients?.length ?? 0,
      lowValue: result.low_value || false,
      ttl: ttl_hours
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error(`[ENRICH][ERROR]`, error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
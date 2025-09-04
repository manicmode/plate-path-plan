// SINGLE SOURCE OF TRUTH for Manual Entry & Speak-to-Log free-text parsing.
// Do not create new text-lookup functions; extend resolvers here.
// Retired: manual-text-lookup, nlp-food, speech-food (410), remove after 30 days.

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Types
type RecognizedFood = {
  id: string;
  source: 'manual' | 'speech';
  provider: 'off' | 'generic' | 'restaurant' | 'gpt';
  name: string;
  brand?: string | null;
  barcode?: string | null;
  imageUrl?: string | null;
  servingGrams: number;
  servingText?: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number;
  sugar_g?: number;
  __hydrated: true;
  meta?: Record<string, unknown>;
  confidence: number; // 0..1
};

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Cache TTL
const CACHE_TTL_HOURS = 24;

// Helper functions
function cleanQuery(q: string): string {
  return q.trim().toLowerCase().replace(/\s+/g, ' ');
}

function normalizeQuery(q: string): string {
  return cleanQuery(q).replace(/[^\w\s]/g, '');
}

function classifyQuery(q: string): 'likely_brand' | 'likely_generic' | 'likely_restaurant' | 'unknown' {
  const brandHints = /(kellogg|nestle|trader\s*joe|tj\'?s|costco|kirkland|heinz|barilla|oreo|clif|chobani|fage|cheerios|quaker|gatorade|pringles|lays|doritos|ben.?&.?jerry|whole.?foods)/i;
  const restaurantHints = /(mcdonald|in.?n.?out|chipotle|subway|taco\s*bell|kfc|starbucks|burger\s*king|wendy|panera|domino|papa john|five guys|shake shack)/i;
  
  if (restaurantHints.test(q)) return 'likely_restaurant';
  if (brandHints.test(q)) return 'likely_brand';
  if (q.split(' ').length <= 3) return 'likely_generic';
  return 'unknown';
}

function pickNonZero(v: number | null | undefined, d: number): number {
  return (v && v > 0) ? v : d;
}

// Cache management
async function getCachedResults(normalizedQ: string): Promise<RecognizedFood[] | null> {
  try {
    const { data } = await supabase
      .from('food_text_cache')
      .select('items')
      .eq('normalized_q', normalizedQ)
      .gt('expires_at', new Date().toISOString())
      .single();
    
    return data?.items || null;
  } catch {
    return null;
  }
}

async function setCachedResults(q: string, normalizedQ: string, items: RecognizedFood[]): Promise<void> {
  try {
    // Truncate items to reasonable size for storage
    const truncatedItems = items.slice(0, 10).map(item => ({
      ...item,
      meta: undefined // Remove raw data to save space
    }));

    await supabase
      .from('food_text_cache')
      .upsert({
        q,
        normalized_q: normalizedQ,
        items: truncatedItems,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + CACHE_TTL_HOURS * 60 * 60 * 1000).toISOString()
      }, { 
        onConflict: 'normalized_q' 
      });
  } catch (error) {
    console.warn('[CACHE][WRITE_ERROR]', error.message);
  }
}

// Food resolvers
async function resolveOFF(q: string): Promise<RecognizedFood[] | null> {
  try {
    console.log('[RESOLVER][OFF] Searching:', q);
    
    const response = await fetch(
      `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&page_size=5&json=1`,
      { 
        headers: { 'User-Agent': 'food-text-lookup/1.0' },
        signal: AbortSignal.timeout(5000)
      }
    );

    if (!response.ok) return null;
    
    const data = await response.json();
    const products = data?.products || [];
    
    if (products.length === 0) return null;

    const results: RecognizedFood[] = products.slice(0, 3).map((product: any, index: number) => {
      const serving = parseServingFromOFF(product);
      const macros = derivePerPortion(product, serving.grams);
      
      return {
        id: `off-${product.code || Date.now()}-${index}`,
        source: 'manual' as const,
        provider: 'off' as const,
        name: product.product_name || product.generic_name || 'Unknown Product',
        brand: product.brands || null,
        barcode: product.code || null,
        imageUrl: product.image_url || null,
        servingGrams: serving.grams || 100,
        servingText: serving.text,
        calories: pickNonZero(macros.calories, 150),
        protein_g: pickNonZero(macros.protein_g, 8),
        carbs_g: pickNonZero(macros.carbs_g, 25),
        fat_g: pickNonZero(macros.fat_g, 5),
        fiber_g: pickNonZero(macros.fiber_g, 2),
        sugar_g: pickNonZero(macros.sugar_g, 3),
        __hydrated: true,
        confidence: 0.8,
        meta: { raw: product }
      };
    });

    console.log(`[RESOLVER][OFF] Found ${results.length} results`);
    return results;
  } catch (error) {
    console.warn('[RESOLVER][OFF][ERROR]', error.message);
    return null;
  }
}

async function resolveGeneric(q: string): Promise<RecognizedFood[] | null> {
  console.log('[RESOLVER][GENERIC] Searching:', q);
  // Placeholder - could query USDA or generic foods table
  return null;
}

async function resolveRestaurant(q: string): Promise<RecognizedFood[] | null> {
  console.log('[RESOLVER][RESTAURANT] Searching:', q);
  // Placeholder - could query restaurant menu items table
  return null;
}

async function resolveGPT(q: string): Promise<RecognizedFood[] | null> {
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openAIApiKey) {
    console.warn('[RESOLVER][GPT] No OpenAI API key configured');
    return null;
  }

  try {
    console.log('[RESOLVER][GPT] Analyzing:', q);
    
    const prompt = `Analyze this food text and provide nutrition estimates: "${q}"

Return 1-3 food items as JSON array with this exact format:
[{
  "name": "food name",
  "servingGrams": number,
  "servingText": "serving description",
  "calories": number,
  "protein_g": number,
  "carbs_g": number,
  "fat_g": number,
  "fiber_g": number,
  "sugar_g": number,
  "confidence": 0.6
}]

Be conservative with portions. If multiple foods mentioned, split them into separate items.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a nutrition expert. Always respond with valid JSON only.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 500,
        temperature: 0.3
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    
    if (!content) return null;

    const parsed = JSON.parse(content);
    const items = Array.isArray(parsed) ? parsed : [parsed];

    const results: RecognizedFood[] = items.slice(0, 3).map((item: any, index: number) => ({
      id: `gpt-${Date.now()}-${index}`,
      source: 'manual' as const,
      provider: 'gpt' as const,
      name: item.name || q,
      servingGrams: item.servingGrams || 100,
      servingText: item.servingText,
      calories: pickNonZero(item.calories, 150),
      protein_g: pickNonZero(item.protein_g, 8),
      carbs_g: pickNonZero(item.carbs_g, 25),
      fat_g: pickNonZero(item.fat_g, 5),
      fiber_g: pickNonZero(item.fiber_g, 2),
      sugar_g: pickNonZero(item.sugar_g, 3),
      __hydrated: true,
      confidence: Math.max(0.4, Math.min(0.8, item.confidence || 0.6))
    }));

    console.log(`[RESOLVER][GPT] Generated ${results.length} results`);
    return results;
  } catch (error) {
    console.warn('[RESOLVER][GPT][ERROR]', error.message);
    return null;
  }
}

// Helper functions for serving parsing (reuse from barcode logic)
function parseServingFromOFF(product: any): { grams: number | null; text?: string } {
  const servingSize = product.serving_size || product.nutriments?.serving_size;
  if (!servingSize) return { grams: null };

  const text = String(servingSize);
  
  // Try to extract grams
  let match = text.match(/(\d+(?:\.\d+)?)\s*(?:g|grams?)\b/i);
  if (match) return { grams: parseFloat(match[1]), text };

  // Try oz to grams
  match = text.match(/(\d+(?:\.\d+)?)\s*(?:oz|ounces?)\b/i);
  if (match) return { grams: parseFloat(match[1]) * 28.35, text };

  // Try ml (assume 1g/ml for liquids)
  match = text.match(/(\d+(?:\.\d+)?)\s*(?:ml|milliliters?)\b/i);
  if (match) return { grams: parseFloat(match[1]), text };

  return { grams: null, text };
}

function derivePerPortion(product: any, grams: number | null) {
  const nutriments = product.nutriments || {};
  
  const kcal100 = nutriments['energy-kcal_100g'] || nutriments.energy_kcal_100g;
  const kcalServ = nutriments['energy-kcal_serving'] || nutriments.energy_kcal_serving;
  
  const prot100 = nutriments.proteins_100g;
  const protServ = nutriments.proteins_serving;
  
  const carb100 = nutriments.carbohydrates_100g;
  const carbServ = nutriments.carbohydrates_serving;
  
  const fat100 = nutriments.fat_100g;
  const fatServ = nutriments.fat_serving;
  
  const fiber100 = nutriments.fiber_100g;
  const sugar100 = nutriments.sugars_100g;

  // Prefer serving values, else scale from 100g
  let calories = kcalServ;
  let protein_g = protServ;
  let carbs_g = carbServ;
  let fat_g = fatServ;
  let fiber_g = null;
  let sugar_g = null;

  if (!calories && kcal100 && grams) calories = (kcal100 * grams) / 100;
  if (!protein_g && prot100 && grams) protein_g = (prot100 * grams) / 100;
  if (!carbs_g && carb100 && grams) carbs_g = (carb100 * grams) / 100;
  if (!fat_g && fat100 && grams) fat_g = (fat100 * grams) / 100;
  if (fiber100 && grams) fiber_g = (fiber100 * grams) / 100;
  if (sugar100 && grams) sugar_g = (sugar100 * grams) / 100;

  return { calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g };
}

// Main handler
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { q, source, bypassCache } = await req.json();
    const query = cleanQuery(q || '');
    
    if (!query) {
      return new Response(
        JSON.stringify({ ok: false, error: 'EMPTY_QUERY' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    console.log(`[TEXT_LOOKUP] Processing query: "${query}" from ${source}`);

    const normalizedQ = normalizeQuery(query);
    
    // Check cache first (unless bypassed)
    let results: RecognizedFood[] | null = null;
    let cached = false;
    
    if (!bypassCache) {
      results = await getCachedResults(normalizedQ);
      if (results) {
        cached = true;
        console.log(`[TEXT_LOOKUP][CACHE_HIT] ${results.length} items`);
      }
    }

    // If no cache hit, resolve through providers
    if (!results) {
      const intent = classifyQuery(query);
      console.log(`[TEXT_LOOKUP] Query intent: ${intent}`);

      // Priority routing based on intent
      if (intent === 'likely_brand') {
        results = await resolveOFF(query) || await resolveGeneric(query) || await resolveRestaurant(query);
      } else if (intent === 'likely_generic') {
        results = await resolveGeneric(query) || await resolveOFF(query) || await resolveRestaurant(query);
      } else if (intent === 'likely_restaurant') {
        results = await resolveRestaurant(query) || await resolveOFF(query) || await resolveGeneric(query);
      } else {
        results = await resolveOFF(query) || await resolveGeneric(query) || await resolveRestaurant(query);
      }

      // Last resort: GPT fallback
      if (!results) {
        results = await resolveGPT(query);
      }

      // Cache the results
      if (results && results.length > 0) {
        await setCachedResults(query, normalizedQ, results);
      }
    }

    // Annotate source field
    if (results) {
      results = results.map(r => ({ 
        ...r, 
        source: (source === 'speech' ? 'speech' : 'manual') as const 
      }));
    }

    const response = {
      ok: true,
      items: results || [],
      cached,
      note: results?.length === 0 ? 'NO_MATCH' : undefined
    };

    console.log(`[TEXT_LOOKUP][SUCCESS] ${results?.length || 0} items, cached: ${cached}`);

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );

  } catch (error: any) {
    console.error('[TEXT_LOOKUP][ERROR]', error);
    return new Response(
      JSON.stringify({ ok: false, error: error?.message || 'UNKNOWN' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});
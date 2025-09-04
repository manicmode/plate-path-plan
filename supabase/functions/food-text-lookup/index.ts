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

// Generic food definitions
type GenericDef = {
  synonyms: string[];
  per100g: { kcal: number, p: number, c: number, f: number };
  defaultServingG: number;
};

const BASIC_GENERICS: Record<string, GenericDef> = {
  'chicken breast cooked': {
    synonyms: ['chicken', 'grilled chicken', 'chicken breast', 'roast chicken'],
    per100g: { kcal: 165, p: 31, c: 0, f: 3.6 },
    defaultServingG: 150
  },
  'oatmeal dry': {
    synonyms: ['oats', 'oatmeal', 'rolled oats'],
    per100g: { kcal: 379, p: 13.2, c: 67.7, f: 6.5 },
    defaultServingG: 40
  },
  'banana': {
    synonyms: ['banana'],
    per100g: { kcal: 89, p: 1.1, c: 22.8, f: 0.3 },
    defaultServingG: 118
  },
  'white rice cooked': {
    synonyms: ['rice', 'white rice', 'cooked rice', 'steamed rice'],
    per100g: { kcal: 130, p: 2.7, c: 28.7, f: 0.3 },
    defaultServingG: 150
  },
  'egg large': {
    synonyms: ['egg', 'eggs'],
    per100g: { kcal: 155, p: 13, c: 1.1, f: 11 },
    defaultServingG: 50
  },
  'avocado': {
    synonyms: ['avocado'],
    per100g: { kcal: 160, p: 2, c: 9, f: 15 },
    defaultServingG: 100
  },
  'almond butter': {
    synonyms: ['almond butter'],
    per100g: { kcal: 614, p: 21, c: 19, f: 55 },
    defaultServingG: 32
  }
};

// Restaurant chain aliases and seed data
const CHAIN_ALIASES: Record<string, string> = {
  'in n out': 'In-N-Out Burger',
  'in-n-out': 'In-N-Out Burger',
  'innout': 'In-N-Out Burger',
  'in and out burger': 'In-N-Out Burger',
  'in & out': 'In-N-Out Burger'
};

const RESTAURANT_SEED: Record<string, Array<{
  name: string; servingText: string; kcal?: number; p?: number; c?: number; f?: number;
}>> = {
  'In-N-Out Burger': [
    { name: 'Double-Double', servingText: '1 burger', kcal: 670, p: 37, c: 39, f: 41 },
    { name: 'Cheeseburger', servingText: '1 burger', kcal: 480, p: 22, c: 39, f: 27 },
    { name: 'Hamburger', servingText: '1 burger', kcal: 390, p: 16, c: 39, f: 19 }
  ]
};

// Helper functions
function normalize(q: string): string {
  let s = (q || '').toLowerCase().trim();

  // insert space between letters and digits: "chicken150g" -> "chicken 150g"
  s = s.replace(/([a-z])(\d)/g, '$1 $2').replace(/(\d)([a-z])/g, '$1 $2');

  // normalize units
  s = s.replace(/\bgrams?\b/g, 'g')
       .replace(/\bmilliliters?\b/g, 'ml')
       .replace(/\bou?nces?\b/g, 'oz');

  // handle common punctuation as separators
  s = s.replace(/[,_]/g, ' ');

  // collapse whitespace
  s = s.replace(/\s+/g, ' ');
  return s;
}

// extract an amount like "150 g", "1 oz", "1/2 cup", plain number defaulting to g
function extractQuantity(s: string): { grams: number | null, servingText?: string } {
  const OZ_TO_G = 28.349523125;
  // 150 g / 150g
  let m = s.match(/(\d+(?:\.\d+)?)\s*g\b/);
  if (m) return { grams: parseFloat(m[1]), servingText: `${m[1]} g` };

  // 1 oz
  m = s.match(/(\d+(?:\.\d+)?)\s*oz\b/);
  if (m) return { grams: parseFloat(m[1]) * OZ_TO_G, servingText: `${m[1]} oz` };

  // simple "200" → assume grams if a generic food is present
  m = s.match(/\b(\d{2,3})\b/);
  if (m) return { grams: parseFloat(m[1]), servingText: `${m[1]} g` };

  return { grams: null };
}

function cleanQuery(q: string): string {
  return normalize(q);
}

function normalizeQuery(q: string): string {
  return cleanQuery(q).replace(/[^\w\s]/g, '');
}

function matchGeneric(query: string): { key: string, def: GenericDef } | null {
  for (const [key, def] of Object.entries(BASIC_GENERICS)) {
    for (const s of def.synonyms) {
      const re = new RegExp(`\\b${s.replace(/\s+/g, '\\s+')}\\b`, 'i');
      if (re.test(query)) return { key, def };
    }
  }
  return null;
}

function normalizeChainName(q: string): string | null {
  const s = q.toLowerCase();
  for (const [alias, proper] of Object.entries(CHAIN_ALIASES)) {
    if (s.includes(alias)) return proper;
  }
  // also catch exact proper name
  if (s.includes('in-n-out') || s.includes('in n out')) return 'In-N-Out Burger';
  return null;
}

function classifyQuery(q: string): 'likely_brand' | 'likely_generic' | 'likely_restaurant' | 'unknown' {
  const restaurantHints = /(mcdonald|in.?n.?out|chipotle|subway|taco\s*bell|kfc|starbucks|burger\s*king|wendy|panera|domino|papa john|five guys|shake shack)/i;
  if (restaurantHints.test(q)) return 'likely_restaurant';

  // quantity strongly implies generic
  if (/\b(\d+(?:\.\d+)?)\s*(g|oz|ml)\b/.test(q)) return 'likely_generic';

  const brandHints = /(kellogg|nestle|trader\s*joe|tj'?s|kirkland|heinz|barilla|oreo|clif|chobani|fage|cheerios|quaker|gatorade|pringles|lays|doritos|ben.?&.?jerry|whole.?foods)/i;
  if (brandHints.test(q)) return 'likely_brand';

  if (q.split(' ').length <= 3) return 'likely_generic';
  return 'unknown';
}

function dedupeAndCap(items: RecognizedFood[], cap = 5) {
  const seen = new Map<string, RecognizedFood>();
  for (const it of items) {
    const key = (it.barcode || `${it.provider}:${it.brand ?? ''}:${it.name}` || it.id).toLowerCase();
    const prev = seen.get(key);
    if (!prev || (it.confidence ?? 0) > (prev.confidence ?? 0)) seen.set(key, it);
  }
  return Array.from(seen.values()).slice(0, cap);
}

function pickNonZero(v: number | null | undefined, d: number): number {
  return (v && v > 0) ? v : d;
}

function coerce(v: any): number | null {
  if (typeof v === 'number' && !isNaN(v) && v > 0) return v;
  if (typeof v === 'string') {
    const n = parseFloat(v);
    return (!isNaN(n) && n > 0) ? n : null;
  }
  return null;
}

function parseServingFromText(text: string | null | undefined): { grams: number | null; text?: string } {
  if (!text) return { grams: null };
  
  const str = String(text);
  
  // Try to extract grams
  let match = str.match(/(\d+(?:\.\d+)?)\s*(?:g|grams?)\b/i);
  if (match) return { grams: parseFloat(match[1]), text: str };

  // Try oz to grams
  match = str.match(/(\d+(?:\.\d+)?)\s*(?:oz|ounces?)\b/i);
  if (match) return { grams: parseFloat(match[1]) * 28.35, text: str };

  // Try ml (assume 1g/ml for liquids)
  match = str.match(/(\d+(?:\.\d+)?)\s*(?:ml|milliliters?)\b/i);
  if (match) return { grams: parseFloat(match[1]), text: str };

  return { grams: null, text: str };
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
  
  // 1) try DB if present
  try {
    const { data } = await supabase.from('food_generics').select('*').ilike('name', `%${q}%`).limit(5);
    if (data?.length) {
      return data.map((g: any) => {
        const parsed = parseServingFromText(g?.serving_text);
        const grams = parsed.grams ?? coerce(g?.serving_grams) ?? extractQuantity(q).grams ?? 100;
        const per = derivePerPortion(g, grams);
        return {
          id: crypto.randomUUID(),
          source: 'manual',
          provider: 'generic',
          name: g.name,
          brand: null,
          barcode: null,
          imageUrl: g.image_url ?? null,
          servingGrams: per.grams ?? grams ?? 100,
          servingText: parsed.text ?? g?.serving_text,
          calories: pickNonZero(per.calories, 150),
          protein_g: pickNonZero(per.protein_g, 8),
          carbs_g: pickNonZero(per.carbs_g, 25),
          fat_g: pickNonZero(per.fat_g, 5),
          __hydrated: true,
          confidence: 0.78
        };
      });
    }
  } catch (_) { /* ignore */ }

  // 2) built-in lexicon fallback
  const hit = matchGeneric(q);
  if (hit) {
    const { def, key } = hit;
    const qty = extractQuantity(q);
    const grams = qty.grams ?? def.defaultServingG;
    const scale = grams / 100;

    return [{
      id: crypto.randomUUID(),
      source: 'manual',
      provider: 'generic',
      name: key,
      brand: null,
      barcode: null,
      imageUrl: null,
      servingGrams: grams,
      servingText: qty.servingText ?? `${grams} g`,
      calories: Math.round(def.per100g.kcal * scale),
      protein_g: +(def.per100g.p * scale).toFixed(1),
      carbs_g:   +(def.per100g.c * scale).toFixed(1),
      fat_g:     +(def.per100g.f * scale).toFixed(1),
      __hydrated: true,
      confidence: 0.8
    }];
  }

  return null;
}

async function resolveRestaurant(q: string): Promise<RecognizedFood[] | null> {
  const chain = normalizeChainName(q);
  console.log('[RESOLVER][RESTAURANT] Searching:', q);

  // 1) Try DB if present
  try {
    const { data } = await supabase
      .from('restaurant_menu_items')
      .select('*')
      .ilike('name', `%${q}%`)
      .limit(5);
    if (data?.length) {
      return data.map((r: any) => {
        const parsed = parseServingFromText(r?.serving_text);
        const grams = parsed.grams ?? coerce(r?.serving_grams) ?? null;
        const per = derivePerPortion(r, grams);
        return {
          id: crypto.randomUUID(),
          source: 'manual',
          provider: 'restaurant',
          name: r.name,
          brand: r.chain ?? chain,
          servingGrams: per.grams ?? grams ?? 100,
          servingText: parsed.text ?? r?.serving_text ?? '1 item',
          calories: pickNonZero(per.calories, r.energy_kcal_serving ?? 500),
          protein_g: pickNonZero(per.protein_g, r.proteins_serving ?? 20),
          carbs_g:   pickNonZero(per.carbohydrates_serving ?? per.carbs_g, 40),
          fat_g:     pickNonZero(per.fat_serving ?? per.fat_g, 20),
          __hydrated: true,
          confidence: 0.78
        };
      });
    }
  } catch (_) { /* ignore */ }

  // 2) Seed fallback if we detected a chain by alias
  if (chain && RESTAURANT_SEED[chain]) {
    return RESTAURANT_SEED[chain].map((m) => ({
      id: crypto.randomUUID(),
      source: 'manual' as const,
      provider: 'restaurant' as const,
      name: m.name,
      brand: chain,
      servingGrams: 0,
      servingText: m.servingText,
      calories: m.kcal ?? 500,
      protein_g: m.p ?? 20,
      carbs_g:   m.c ?? 40,
      fat_g:     m.f ?? 20,
      __hydrated: true,
      confidence: 0.75
    }));
  }

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

    // Annotate source field and deduplicate/cap results
    if (results) {
      results = results.map(r => ({ 
        ...r, 
        source: (source === 'speech' ? 'speech' : 'manual') as const 
      }));
      
      // Deduplicate and cap results
      results = dedupeAndCap(results);
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
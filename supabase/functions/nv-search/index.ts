import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const NV_MIN_PREFIX = 3;
const NV_MAX_RESULTS = 8;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  
  // Use service role client for vault access
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { q, maxResults = NV_MAX_RESULTS, region = 'US' } = await req.json();

    const trimmed = q?.trim() || '';
    
    // Early return for short queries
    if (trimmed.length < NV_MIN_PREFIX) {
      console.log(`[NV][SEARCH] q="${trimmed}" hits=0 (too short)`);
      return new Response(JSON.stringify({ data: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const searchTerm = `${trimmed.toLowerCase()}%`;
    console.log(`[NV][SEARCH] q="${trimmed}" searching...`);

    // Attempt NV vault query first (with proper schema handling)
    let suggestions: any[] = [];
    try {
      const nv = supabase.schema('nutrition_vault');

      // Query vault with ranking
      const { data: items, error } = await nv
        .from('items')
        .select(`
          id, canonical_key, provider, provider_ref, name, brand,
          class_id, confidence, per100g, portion_defs, flags, updated_at
        `)
        .or(`name.ilike.${searchTerm},brand.ilike.${searchTerm}`)
        .eq('region', region)
        .gt('expires_at', new Date().toISOString())
        .order('updated_at', { ascending: false })
        .limit(maxResults * 2); // Get more for ranking

      if (error) {
        console.error('[NV][SEARCH] Query error:', error);
        throw error;
      }

      // Simple ranking algorithm
      const ranked = (items || [])
        .map((item: any) => {
          let score = item.confidence || 0.7;
          const nameLower = (item.name || '').toLowerCase();
          const queryLower = trimmed.toLowerCase();
          if (nameLower.startsWith(queryLower)) score += 4; // Exact prefix match bonus
          if (item.brand) score += 1; // Brand bonus
          const daysSinceUpdate = (Date.now() - new Date(item.updated_at).getTime()) / (1000 * 60 * 60 * 24);
          if (!Number.isNaN(daysSinceUpdate) && daysSinceUpdate <= 90) score += 0.5; // Freshness bonus
          return { ...item, score };
        })
        .sort((a: any, b: any) => b.score - a.score)
        .slice(0, maxResults);

      // Transform to expected format
      suggestions = ranked.map((item: any) => ({
        id: item.id,
        name: item.name,
        brand: item.brand || undefined,
        classId: item.class_id || undefined,
        source: 'vault',
        per100g: item.per100g,
        portion_defs: item.portion_defs,
        confidence: item.confidence,
        provider: item.provider,
        provider_ref: item.provider_ref,
        isGeneric: item.flags?.generic === true,
        // Optional passthroughs if present in NV
        ingredientsText: (item as any).ingredients_text || undefined,
        ingredientsList: Array.isArray((item as any).ingredients_list) ? (item as any).ingredients_list : undefined,
      }));

      // Log telemetry to lookups table (best‑effort)
      try {
        await nv.from('lookups').insert({
          id: crypto.randomUUID(),
          q: trimmed,
          item_id: null,
          hit: suggestions.length > 0,
          provider: 'cache'
        });
      } catch (e) {
        console.warn('[NV][SEARCH] Telemetry insert skipped:', (e as any)?.message);
      }

      console.log(`[NV][SEARCH] q="${trimmed}" hits=${suggestions.length}`);

      return new Response(JSON.stringify({ data: suggestions }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (vaultErr) {
      console.error('[NV][SEARCH] Vault unavailable, falling back:', (vaultErr as any)?.message || vaultErr);

      // Fallback: OpenFoodFacts search as a resilient public provider
      try {
        const params = new URLSearchParams({
          search_terms: trimmed,
          search_simple: '1',
          action: 'process',
          json: '1',
          page_size: String(maxResults),
          fields: [
            'code', 'id', 'product_name', 'brands', 'ingredients_text', 'ingredients_text_en',
            'nutriments', 'image_url'
          ].join(',')
        });
        const url = `https://world.openfoodfacts.org/cgi/search.pl?${params.toString()}`;
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`OFF HTTP ${resp.status}`);
        const off = await resp.json();
        const products: any[] = Array.isArray(off.products) ? off.products : [];

        suggestions = products.map((p: any) => {
          const ingredientsText = p.ingredients_text_en || p.ingredients_text || '';
          const ingredientsList = ingredientsText
            ? ingredientsText.split(/[,;|]/).map((s: string) => s.trim()).filter(Boolean).slice(0, 20)
            : undefined;
          const n = p.nutriments || {};
          const per100g = {
            kcal: Number(n['energy-kcal_100g'] ?? n['energy-kcal_value'] ?? n['energy_value']) || undefined,
            protein_g: Number(n['proteins_100g']) || undefined,
            carbs_g: Number(n['carbohydrates_100g']) || undefined,
            fat_g: Number(n['fat_100g']) || undefined,
            fiber_g: Number(n['fiber_100g']) || undefined,
            sugar_g: Number(n['sugars_100g']) || undefined,
            sodium_mg: Number(n['sodium_100g'] ? n['sodium_100g'] * 1000 : n['salt_100g'] ? n['salt_100g'] * 400 : 0) || undefined,
          };
          const out = {
            id: String(p.code || p.id),
            name: p.product_name || trimmed,
            brand: p.brands || undefined,
            classId: undefined,
            source: 'off',
            per100g,
            portion_defs: undefined,
            confidence: 0.6,
            provider: 'openfoodfacts',
            provider_ref: String(p.code || p.id || ''),
            isGeneric: true,
            imageUrl: p.image_url || undefined,
            ingredientsText,
            ingredientsList,
          };
          if (ingredientsList && ingredientsList.length) {
            console.log('[NV][LABEL]', {
              name: out.name,
              provider: out.provider,
              first3: ingredientsList.slice(0, 3)
            });
          }
          return out;
        });

        return new Response(JSON.stringify({ data: suggestions }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (fallbackErr) {
        console.error('[NV][SEARCH][FALLBACK] OFF failed:', (fallbackErr as any)?.message || fallbackErr);
        // Final empty response rather than 500 to avoid breaking UX
        return new Response(JSON.stringify({ data: [] }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

  } catch (error) {
    console.error('[NV][SEARCH] Error:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Search failed' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
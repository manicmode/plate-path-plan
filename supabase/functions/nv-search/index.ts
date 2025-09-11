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

    // Query vault with ranking
    const { data: items, error } = await supabase
      .from('nutrition_vault.items')
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

    // Also search aliases
    const { data: aliasItems, error: aliasError } = await supabase
      .from('nutrition_vault.aliases')
      .select(`
        item_id,
        nutrition_vault.items!inner(
          id, canonical_key, provider, provider_ref, name, brand,
          class_id, confidence, per100g, portion_defs, flags, updated_at
        )
      `)
      .ilike('alias', searchTerm)
      .limit(maxResults);

    if (aliasError) {
      console.error('[NV][SEARCH] Alias query error:', aliasError);
    }

    // Combine and rank results
    const allItems = [...(items || [])];
    
    // Add alias results (flatten the nested structure)
    if (aliasItems) {
      for (const alias of aliasItems) {
        const item = (alias as any).nutrition_vault.items;
        if (item && !allItems.find(existing => existing.id === item.id)) {
          allItems.push(item);
        }
      }
    }

    // Simple ranking algorithm
    const ranked = allItems
      .map(item => {
        let score = item.confidence || 0.7;
        const nameLower = item.name.toLowerCase();
        const queryLower = trimmed.toLowerCase();
        
        // Exact prefix match on name
        if (nameLower.startsWith(queryLower)) {
          score += 4;
        }
        
        // Brand exists bonus
        if (item.brand) {
          score += 1;
        }
        
        // Recent data bonus (within 90 days)
        const daysSinceUpdate = (Date.now() - new Date(item.updated_at).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceUpdate <= 90) {
          score += 0.5;
        }
        
        return { ...item, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults);

    // Transform to expected format
    const suggestions = ranked.map(item => ({
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
      isGeneric: item.flags?.generic === true
    }));

    // Log telemetry to lookups table
    await supabase
      .from('nutrition_vault.lookups')
      .insert({
        id: crypto.randomUUID(),
        q: trimmed,
        item_id: null,
        hit: suggestions.length > 0,
        provider: 'cache'
      });

    console.log(`[NV][SEARCH] q="${trimmed}" hits=${suggestions.length}`);

    return new Response(JSON.stringify({ data: suggestions }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

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
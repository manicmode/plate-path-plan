import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function normalize(s: string): string {
  return s?.toLowerCase().trim().replace(/\s+/g, ' ').replace(/[^\p{L}\p{N}\s]/gu, '') || '';
}

function buildCanonicalKey(name: string, brand?: string, classId?: string, region = 'US'): string {
  const normName = normalize(name);
  const normBrand = normalize(brand || '');
  const normClass = classId || '';
  return `${normName}|${normBrand}|${normClass}|${region}`;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  
  // Use service role client for vault writes
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const payload = await req.json();
    
    const {
      provider,
      provider_ref,
      name,
      brand,
      class_id,
      region = 'US',
      per100g,
      portion_defs,
      upc_gtin,
      attribution,
      ttl_days = 365,
      aliases = []
    } = payload;

    // Validate required fields
    if (!provider || !['edamam', 'nutritionix'].includes(provider)) {
      throw new Error(`Invalid provider: ${provider}`);
    }
    
    if (!provider_ref || !name || !per100g) {
      throw new Error('Missing required fields: provider_ref, name, or per100g');
    }

    // Cap aliases to prevent abuse
    const safeAliases = (aliases || []).slice(0, 10);

    // Build canonical key
    const canonical_key = buildCanonicalKey(name, brand, class_id, region);
    
    // Calculate expires_at in application
    const expires_at = new Date(Date.now() + (ttl_days * 24 * 60 * 60 * 1000)).toISOString();

    const itemData = {
      id: crypto.randomUUID(),
      canonical_key,
      upc_gtin: upc_gtin || null,
      provider,
      provider_ref: String(provider_ref),
      name,
      brand: brand || null,
      restaurant: null,
      class_id: class_id || null,
      region,
      label_base: 'US_2016',
      confidence: 1.0,
      per100g,
      portion_defs: portion_defs || null,
      attribution: attribution || `Source: ${provider.charAt(0).toUpperCase() + provider.slice(1)}`,
      ttl_days,
      first_seen: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      expires_at,
      flags: {},
      version: 1
    };

    console.log(`[NV][WRITE] provider=${provider} name="${name}" upserting...`);

    // Upsert item
    const { data: item, error: itemError } = await supabase
      .from('nutrition_vault.items')
      .upsert(itemData, {
        onConflict: 'provider,provider_ref',
        ignoreDuplicates: false
      })
      .select('id')
      .single();

    if (itemError) {
      console.error('[NV][WRITE] Item upsert error:', itemError);
      throw itemError;
    }

    const finalItemId = item?.id || itemData.id;

    // Insert aliases if provided
    if (safeAliases.length > 0) {
      const aliasRows = safeAliases.map(alias => ({
        id: crypto.randomUUID(),
        item_id: finalItemId,
        alias: String(alias).trim(),
        source: 'provider'
      }));

      const { error: aliasError } = await supabase
        .from('nutrition_vault.aliases')
        .upsert(aliasRows, {
          onConflict: 'item_id,alias',
          ignoreDuplicates: true
        });

      if (aliasError) {
        console.error('[NV][WRITE] Alias insert error:', aliasError);
        // Don't fail the whole operation for alias errors
      }
    }

    console.log(`[NV][WRITE] ok provider=${provider} name="${name}" id=${provider_ref} upserted=true`);

    return new Response(JSON.stringify({ 
      ok: true, 
      id: finalItemId 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[NV][WRITE] Error:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Write failed' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
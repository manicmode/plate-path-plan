import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Payload = { providerRef?: string; name?: string };

async function offByBarcode(barcode: string) {
  try {
    console.log(`[NV][LABEL] Fetching OFF by barcode: ${barcode}`);
    const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`);
    if (!r.ok) return null;
    const j = await r.json();
    const p = j?.product;
    if (!p) return null;
    
    const text = p.ingredients_text || p.ingredients_text_en || "";
    const list = Array.isArray(p.ingredients)
      ? p.ingredients.map((x: any) => x.text).filter(Boolean)
      : (text ? text.split(",").map((s: string) => s.trim()) : []);
    
    console.log(`[NV][LABEL] OFF barcode success: ${list.length} ingredients`);
    return { ingredientsText: text, ingredientsList: list, source: "off" as const };
  } catch (error) {
    console.error(`[NV][LABEL] OFF barcode error:`, error);
    return null;
  }
}

async function offSearchByName(name: string) {
  try {
    console.log(`[NV][LABEL] Searching OFF by name: ${name}`);
    const r = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(name)}&search_simple=1&json=1&page_size=1`);
    if (!r.ok) return null;
    const j = await r.json();
    const p = j?.products?.[0];
    if (!p) return null;
    
    const text = p.ingredients_text || p.ingredients_text_en || "";
    const list = Array.isArray(p.ingredients)
      ? p.ingredients.map((x: any) => x.text).filter(Boolean)
      : (text ? text.split(",").map((s: string) => s.trim()) : []);
    
    console.log(`[NV][LABEL] OFF search success: ${list.length} ingredients`);
    return { ingredientsText: text, ingredientsList: list, source: "off" as const };
  } catch (error) {
    console.error(`[NV][LABEL] OFF search error:`, error);
    return null;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { providerRef, name } = (await req.json()) as Payload;
    
    console.log(`[NV][LABEL] Request: providerRef=${providerRef}, name=${name}`);

    // 1) Try barcode first
    if (providerRef && /^\d{8,14}$/.test(providerRef)) {
      const hit = await offByBarcode(providerRef);
      if (hit) {
        return new Response(JSON.stringify(hit), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        });
      }
    }

    // 2) Try best-effort name search
    if (name && name.length >= 3) {
      const hit = await offSearchByName(name);
      if (hit) {
        return new Response(JSON.stringify(hit), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        });
      }
    }

    console.log('[NV][LABEL] No ingredients found');
    return new Response(JSON.stringify({ 
      ingredientsText: "", 
      ingredientsList: [], 
      source: "none" 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });
  } catch (e) {
    console.error('[NV][LABEL] Error:', e);
    // Never 500 — empty but informative
    return new Response(JSON.stringify({ 
      ingredientsText: "", 
      ingredientsList: [], 
      source: "error", 
      error: String(e?.message ?? e) 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });
  }
});
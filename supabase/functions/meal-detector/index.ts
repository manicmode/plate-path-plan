import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const VISION_URL = "https://vision.googleapis.com/v1/images:annotate";

// Foodish regex for label fallback filtering
const FOODISH = /salmon|fish|asparagus|vegetable|veggie|tomato|potato|chicken|beef|pork|meat|egg|rice|noodle|pasta|bread|sandwich|soup|salad|fruit|berry|shrimp|prawn|tuna|sardine|broccoli|cauliflower|yogurt|cheese|bean|lentil|tofu|oat|cereal|corn|spinach|lettuce|carrot|onion|garlic|apple|banana|orange|avocado|nuts|olive|mushroom/;

// Hard reject list for GPT filtering
const REJECT = new Set([
  'plate','dish','bowl','table','tableware','cutlery','silverware','utensil',
  'fork','knife','spoon','chopsticks','napkin','tray','placemat','glass','cup'
]);

// GPT Vision function for food-only extraction
async function gptExtractFoods(imageBase64: string): Promise<any[]> {
  const openAIKey = Deno.env.get("OPENAI_API_KEY");
  if (!openAIKey) {
    console.log('[MEAL-DETECTOR] No OpenAI key, skipping GPT');
    return [];
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a nutrition vision assistant. Identify edible food items visible on the plate(s). Never include containers or table settings (plate, bowl, dish, tray, table, tableware, cutlery, fork, knife, spoon, chopsticks, napkin, placemat, glass, cup). Use generic food names only (no brands, no SKUs). Prefer specific mains/proteins (e.g., "grilled salmon"). If unsure, omit the item.'
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Return strict JSON:\n\n{"items":[\n  {"name":"string-lowercase", "category":"protein|veg|fruit|grain|dairy|sauce|other", "confidence":0.0}\n]}\n\n1–6 items max. No duplicates. No containers. Omit uncertain items.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageBase64,
                  detail: 'high'
                }
              }
            ]
          }
        ],
        max_tokens: 200,
        temperature: 0
      }),
    });

    if (!response.ok) {
      console.error('[MEAL-DETECTOR] GPT error:', response.status, await response.text());
      return [];
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content?.trim();
    
    if (!content) return [];

    // Parse JSON response
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      console.error('[MEAL-DETECTOR] GPT JSON parse error:', e);
      return [];
    }

    const items = Array.isArray(parsed?.items) ? parsed.items : [];
    
    console.log(`[MEAL] raw model items count = ${items.length}`);

    // Server-side filters (hard)
    const filtered = items
      .map((i: any) => ({ ...i, name: (i.name || '').toLowerCase().trim() }))
      .filter((i: any) => i.name && !REJECT.has(i.name));

    const THRESH = { veg: 0.20, fruit: 0.20, protein: 0.50, grain: 0.50, dairy: 0.50, sauce: 0.35, other: 0.40 };
    const thresholded = filtered.filter((i: any) => (i.confidence ?? 0) >= (THRESH[i.category] ?? 0.40));

    // De-dupe by stem
    const seen = new Set<string>();
    const stem = (s: string) => s.replace(/[- ]/g, ' ').replace(/\s+/g, ' ').trim();
    const validated = thresholded
      .filter((i: any) => {
        const k = stem(i.name);
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .map((item: any) => ({
        name: item.name,
        confidence: item.confidence || 0.5,
        category: item.category || 'other',
        source: 'gpt'
      }))
      .slice(0, 6)

    console.log(`[MEAL] after server filters count = ${validated.length}`);
    return validated;

  } catch (error) {
    console.error('[MEAL-DETECTOR] GPT exception:', error);
    return [];
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  
  try {
    const body = await req.json();
    const { image_base64, image_b64, image_url, mode } = body;
    
    // === DETAILED LOGGING FOR INVESTIGATION ===
    console.log('[MEAL] recv keys = { image_b64: ' + !!image_b64 + ', image_url: ' + !!image_url + ' }');
    
    // Use either key (maintain compatibility)
    let imageInput = image_base64 || image_b64;
    
    // Handle base64 prefix normalization
    if (imageInput && !imageInput.startsWith('data:image/')) {
      // Accept bare base64 too — add JPEG prefix
      imageInput = `data:image/jpeg;base64,${imageInput}`;
    }
    
    console.log('[MEAL] image_b64 head = "' + (imageInput?.slice(0, 22) || 'null') + '", hasPrefix = ' + (imageInput?.startsWith('data:image/') || false) + ', b64Len = ' + (imageInput?.length || 0));
    
    // Sanitize base64 input
    const content = (imageInput || "").split(",").pop();
    if (!content) {
      console.log('[MEAL-DETECTOR] No valid image data - falling back to Vision-only');
      throw new Error("Invalid image data");
    }

    // GPT-first mode: try GPT vision first
    if (mode === 'gpt-first') {
      console.log("[MEAL-DETECTOR] Starting GPT vision extraction...");
      const gptItems = await gptExtractFoods(imageInput);
      
      if (gptItems.length > 0) {
        console.log(`[MEAL-DETECTOR] GPT success: returning ${gptItems.length} items`);
        return new Response(JSON.stringify({
          items: gptItems,
          _debug: { from: "gpt", count: gptItems.length }
        }), { headers: { ...cors, "Content-Type": "application/json" }});
      }
      
      console.log("[MEAL-DETECTOR] GPT returned no items, falling back to Vision...");
    }

    const key = Deno.env.get("GOOGLE_VISION_API_KEY");
    if (!key) throw new Error("Missing GOOGLE_VISION_API_KEY");

    console.log("[MEAL-DETECTOR] Starting Vision object detection...");

    // First attempt: OBJECT_LOCALIZATION only
    const objectBody = {
      requests: [{
        image: { content },
        features: [{ type: "OBJECT_LOCALIZATION", maxResults: 20 }],
      }],
    };

    const objectResponse = await fetch(`${VISION_URL}?key=${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(objectBody),
    });

    const objectRaw = await objectResponse.text();
    if (!objectResponse.ok) throw new Error(`Vision Objects ${objectResponse.status}: ${objectRaw}`);
    
    const objectJson = JSON.parse(objectRaw);
    const objectResp = objectJson?.responses?.[0] ?? {};
    const objs = objectResp?.localizedObjectAnnotations ?? [];

    console.log(`[MEAL-DETECTOR] Found ${objs.length} objects`);

    // If we found objects, return them
    if (objs.length > 0) {
      const items = objs.map((o: any) => ({
        name: (o.name || "").toLowerCase(),
        confidence: o.score || 0,
        source: "object",
        box: o.boundingPoly?.normalizedVertices ?? null,
      }));

      console.log(`[MEAL-DETECTOR] Returning ${items.length} objects`);
      return new Response(JSON.stringify({
        items,
        _debug: { from: "objects", count: items.length }
      }), { headers: { ...cors, "Content-Type": "application/json" }});
    }

    // Fallback: LABEL_DETECTION with foodish filtering
    console.log("[MEAL-DETECTOR] No objects found, trying labels fallback...");
    
    const labelBody = {
      requests: [{
        image: { content },
        features: [{ type: "LABEL_DETECTION", maxResults: 15 }],
      }],
    };

    const labelResponse = await fetch(`${VISION_URL}?key=${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(labelBody),
    });

    const labelRaw = await labelResponse.text();
    if (!labelResponse.ok) throw new Error(`Vision Labels ${labelResponse.status}: ${labelRaw}`);
    
    const labelJson = JSON.parse(labelRaw);
    const labelResp = labelJson?.responses?.[0] ?? {};
    const rawLabels = labelResp?.labelAnnotations ?? [];

    // Filter to foodish terms only
    const foodLabels = rawLabels
      .map((x: any) => ({
        name: (x.description || "").toLowerCase(),
        confidence: x.score || 0,
        source: "label",
        box: null
      }))
      .filter((x: any) => FOODISH.test(x.name));

    console.log(`[MEAL-DETECTOR] Found ${rawLabels.length} labels, ${foodLabels.length} foodish`);

    return new Response(JSON.stringify({
      items: foodLabels,
      _debug: { from: "labels_fallback", count: foodLabels.length }
    }), { headers: { ...cors, "Content-Type": "application/json" }});

  } catch (e) {
    console.error("[MEAL-DETECTOR] Error:", e);
    return new Response(JSON.stringify({ 
      error: String(e), 
      items: [],
      _debug: { from: "error" }
    }), {
      status: 200, 
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
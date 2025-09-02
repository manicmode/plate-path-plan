import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const VISION_URL = "https://vision.googleapis.com/v1/images:annotate";

// Foodish regex for label fallback filtering
const FOODISH = /salmon|fish|asparagus|vegetable|veggie|tomato|potato|chicken|beef|pork|meat|egg|rice|noodle|pasta|bread|sandwich|soup|salad|fruit|berry|shrimp|prawn|tuna|sardine|broccoli|cauliflower|yogurt|cheese|bean|lentil|tofu|oat|cereal|corn|spinach|lettuce|carrot|onion|garlic|apple|banana|orange|avocado|nuts|olive|mushroom/;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  
  try {
    const body = await req.json();
    const { image_base64, image_b64, mode } = body;
    
    // === MEAL-DETECTOR INSTRUMENTATION ===
    console.log('[MEAL-DETECTOR] inputs: image_base64?=' + !!image_base64 + ' len=' + (image_base64?.length || 0) + ', image_b64?=' + !!image_b64 + ' len=' + (image_b64?.length || 0) + ', mode=' + mode);
    
    // Use either key (maintain compatibility)
    const imageInput = image_base64 || image_b64;
    const key = Deno.env.get("GOOGLE_VISION_API_KEY");
    if (!key) throw new Error("Missing GOOGLE_VISION_API_KEY");

    // Sanitize base64 input
    const content = (imageInput || "").split(",").pop();
    if (!content) {
      console.log('[MEAL-DETECTOR] No valid image data - falling back to Vision-only');
      throw new Error("Invalid image data");
    }

    console.log("[MEAL-DETECTOR] Starting object detection...");

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
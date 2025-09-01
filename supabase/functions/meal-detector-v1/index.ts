import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const VISION_URL = "https://vision.googleapis.com/v1/images:annotate";

// NEGATIVE terms to drop - less aggressive filtering (only obvious non-foods)
const NEGATIVE = /\b(plate|tableware|fork|spoon|knife|napkin|logo|brand|font|text|cutlery|table|placemat)\b/i;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  
  try {
    const { image_base64 } = await req.json();
    const key = Deno.env.get("GOOGLE_VISION_API_KEY");
    if (!key) throw new Error("Missing GOOGLE_VISION_API_KEY");

    // Sanitize base64 input
    const content = (image_base64 || "").split(",").pop();
    if (!content) throw new Error("Invalid image data");

    console.log("[MEAL-V1] Starting detection...");

    // Single Vision API call with both features
    const requestBody = {
      requests: [{
        image: { content },
        features: [
          { type: "OBJECT_LOCALIZATION", maxResults: 50 },
          { type: "LABEL_DETECTION", maxResults: 50 }
        ],
      }],
    };

    const response = await fetch(`${VISION_URL}?key=${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    const rawResponse = await response.text();
    if (!response.ok) throw new Error(`Vision ${response.status}: ${rawResponse}`);
    
    const json = JSON.parse(rawResponse);
    const resp = json?.responses?.[0] ?? {};
    
    // Parse objects
    const rawObjects = resp?.localizedObjectAnnotations ?? [];
    const normalizedObjects = rawObjects.map((o: any) => (o.name || "").toLowerCase().trim());
    const keptObjects = normalizedObjects.filter((name: string) => name && !NEGATIVE.test(name));
    
    // Parse labels
    const rawLabels = resp?.labelAnnotations ?? [];
    const normalizedLabels = rawLabels.map((l: any) => (l.description || "").toLowerCase().trim());
    const keptLabels = normalizedLabels.filter((name: string) => name && !NEGATIVE.test(name));
    
    // Decide which to use: objects first, fallback to labels
    const useObjects = keptObjects.length > 0;
    const chosenItems = useObjects ? keptObjects : keptLabels;
    const chosenSource = useObjects ? "objects" : "labels";
    
    // Build result items
    const items = chosenItems.map(name => ({
      name,
      confidence: 0.8,
      source: chosenSource,
      box: null
    }));

    // Debug info
    const debugInfo = {
      from: chosenSource,
      rawObjectsCount: rawObjects.length,
      rawLabelsCount: rawLabels.length,
      keptObjectsCount: keptObjects.length,
      keptLabelsCount: keptLabels.length,
      sampleObjects: normalizedObjects.slice(0, 5),
      sampleLabels: normalizedLabels.slice(0, 5)
    };

    console.log(`[MEAL-V1] rawObjects=${rawObjects.length} rawLabels=${rawLabels.length} keptObjects=${keptObjects.length} keptLabels=${keptLabels.length} chosen=${chosenSource} samples=${chosenItems.slice(0, 5).join(',')}`);

    return new Response(JSON.stringify({
      items,
      _debug: debugInfo
    }), { headers: { ...cors, "Content-Type": "application/json" }});

  } catch (e) {
    console.error("[MEAL-DETECTOR-V1] Error:", e);
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
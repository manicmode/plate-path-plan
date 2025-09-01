import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const VISION_URL = "https://vision.googleapis.com/v1/images:annotate";

// obvious non-food junk we always drop
const NEGATIVE = /\b(plate|tableware|fork|spoon|knife|napkin|logo|brand|font|text|cutlery|table|placemat|bowl|glass|cup|tray)\b/i;
// "generic" terms that aren't specific foods (should NOT block labels fallback)
const GENERIC = /\b(food|foods|dish|meal|snack|cuisine|produce|ingredient|vegetable|vegetables|fruit|fruits|meat|seafood|dairy)\b/i;
const keep = (s: string) => !NEGATIVE.test(s);
const isGeneric = (s: string) => GENERIC.test(s);

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
    
    // Parse objects and labels
    const rawObjects = resp?.localizedObjectAnnotations ?? [];
    const objects = rawObjects.map((o: any) => (o.name || "").toLowerCase().trim()).filter(s => s);
    
    const rawLabels = resp?.labelAnnotations ?? [];
    const labels = rawLabels.map((l: any) => (l.description || "").toLowerCase().trim()).filter(s => s);
    
    // Build four arrays
    const objectsKept = objects.filter(keep);
    const objectsSpecific = objectsKept.filter(s => !isGeneric(s));
    const labelsKept = labels.filter(keep);
    const labelsSpecific = labelsKept.filter(s => !isGeneric(s));
    
    // Choosing logic (this is the fix)
    let chosen: string[];
    let chosenFrom: string;
    
    if (objectsSpecific.length > 0) {
      chosen = objectsSpecific;
      chosenFrom = 'objects';
    } else if (labelsSpecific.length > 0) {
      chosen = labelsSpecific;
      chosenFrom = 'labels';
    } else if (labelsKept.length > 0) {
      chosen = labelsKept;
      chosenFrom = 'labels_generic';
    } else {
      chosen = [];
      chosenFrom = 'none';
    }
    
    // Add info log
    console.info('[MEAL-V1]', JSON.stringify({
      chosen: chosenFrom,
      objects: objects.slice(0,5),
      labels: labels.slice(0,5)
    }));

    return new Response(JSON.stringify({
      items: chosen.slice(0, 8),
      _debug: {
        from: chosenFrom,
        rawObjectsCount: objects.length,
        rawLabelsCount: labels.length,
        keptObjectsCount: objectsKept.length,
        keptLabelsCount: labelsKept.length,
        specificObjectsCount: objectsSpecific.length,
        specificLabelsCount: labelsSpecific.length,
        sampleObjects: objects.slice(0,6),
        sampleLabels: labels.slice(0,6)
      }
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
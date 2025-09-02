// meal-detector-v1/index.ts - CORS-safe veggie-union detector
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const VISION_URL = "https://vision.googleapis.com/v1/images:annotate";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { image_base64, debug } = body ?? {};
    const debugMode = debug === true;

    const key = Deno.env.get("GOOGLE_VISION_API_KEY");
    if (!key) throw new Error("Missing GOOGLE_VISION_API_KEY");

    const content = (image_base64 || "").split(",").pop();
    if (!content) throw new Error("Invalid image data");

    const requestBody = {
      requests: [{
        image: { content },
        features: [
          { type: "OBJECT_LOCALIZATION", maxResults: 50 },
          { type: "LABEL_DETECTION", maxResults: 50 },
        ],
      }],
    };

    const visionResponse = await fetch(`${VISION_URL}?key=${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    const raw = await visionResponse.text();
    if (!visionResponse.ok) throw new Error(`Vision ${visionResponse.status}: ${raw}`);
    const json = JSON.parse(raw);
    const resp = json?.responses?.[0] ?? {};
    const rawObjects = resp?.localizedObjectAnnotations ?? [];
    const rawLabels  = resp?.labelAnnotations ?? [];

    // Normalize
    const objects = rawObjects
      .filter((o: any) => (o.score || 0) >= 0.55)
      .map((o: any) => ({ name: (o.name||"").toLowerCase().trim(), score: o.score||0 }))
      .filter((o: any) => o.name);

    const labels = rawLabels
      .map((l: any) => ({ name: (l.description||"").toLowerCase().trim(), score: l.score||0 }))
      .filter((l: any) => l.name);

    // Filters
    const NEG = /\b(plate|tableware|fork|spoon|knife|napkin|logo|brand|font|text|cutlery|table|placemat|bowl|glass|cup|tray|recipe|cuisine|cooking|garnish|dishware)\b/i;
    const GENERIC = /\b(food|foods|dish|meal|snack|cuisine|produce|ingredient|vegetable|vegetables|fruit|fruits|meat|seafood|dairy)\b/i;
    const KEEP_VEG = /\b(asparagus|tomato|tomatoes|cherry tomato|lemon|lime|broccoli|carrot|spinach|lettuce|cucumber|dill|parsley|cilantro|herb)\b/i;

    const keep = (s: string) => !NEG.test(s) || KEEP_VEG.test(s);
    const isGeneric = (s: string) => GENERIC.test(s) && !KEEP_VEG.test(s);

    const objectsKept   = objects.filter(o => keep(o.name));
    const objectsSpec   = objectsKept.filter(o => !isGeneric(o.name));
    const labelsKept    = labels.filter(l => keep(l.name));
    const labelsSpec    = labelsKept.filter(l => !isGeneric(l.name));

    let chosen: Array<{name: string, source: string, score: number}> = [];
    let chosenFrom: string;

    // Explicit veggie matcher (kept even when objects exist)
    const VEGGIE_PATTERN =
      /\b(asparagus|tomato|tomatoes|cherry tomato|lemon|lime|broccoli|carrot|spinach|lettuce|cucumber|pepper|onion)\b/i;

    if (objectsSpec.length > 0) {
      // Start with specific objects (e.g., salmon)
      chosen = objectsSpec.map((o: any) => ({
        name: o.name,
        source: 'object',
        score: o.score || 0.7,
      }));

      // Union: veggie labels, relaxed score, no duplicates
      const objNames = new Set(objectsSpec.map((o: any) => (o.name || '').toLowerCase()));
      const veggieLabels = labelsKept
        .filter((l: any) => {
          const n = (l.name || '').toLowerCase();
          return VEGGIE_PATTERN.test(n) && !objNames.has(n) && (l.score ?? 0) >= 0.25;
        })
        .map((l: any) => ({
          name: l.name,
          source: 'label',
          score: l.score || 0.5,
        }));

      chosen = [...chosen, ...veggieLabels];
      chosenFrom = veggieLabels.length > 0 ? 'objects_with_labels' : 'objects';

    } else if (labelsSpec.length > 0) {
      chosen = labelsSpec.map((l: any) => ({
        name: l.name,
        source: 'label',
        score: l.score || 0.5,
      }));
      chosenFrom = 'labels';

    } else if (labelsKept.length > 0) {
      chosen = labelsKept.map((l: any) => ({
        name: l.name,
        source: 'label',
        score: l.score || 0.5,
      }));
      chosenFrom = 'labels_generic';

    } else {
      chosen = [];
      chosenFrom = 'none';
    }

    console.info('[MEAL-V1] Final selection:', {
      from: chosenFrom,
      count: chosen.length,
      items: chosen.map(i => `${i.name}:${i.source}:${(i.score ?? 0).toFixed(2)}`),
    });

    const payload: any = {
      items: chosen.slice(0, 8), // Return objects with {name, source, score}
      _debug: {
        from: chosenFrom,
        rawObjectsCount: objects.length,
        rawLabelsCount: labels.length,
        keptObjectsCount: objectsKept.length,
        keptLabelsCount: labelsKept.length,
        specificObjectsCount: objectsSpec.length,
        specificLabelsCount: labelsSpec.length,
        sampleObjects: objects.slice(0,6).map(o=>o.name),
        sampleLabels: labels.slice(0,6).map(l=>l.name),
      },
    };
    
    if (debugMode) {
      payload._debug.chosen_items = chosen;
      payload._debug.objects_all = objects.slice(0,20);
      payload._debug.labels_all = labels.slice(0,20);
    }

    console.log(`[MEAL-DETECTOR-V1] Success: ${chosen.length} items from ${chosenFrom}`);

    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    console.error("[MEAL-DETECTOR-V1] Error:", err);
    return new Response(JSON.stringify({
      error: String(err?.message ?? err),
      items: [],
      _debug: { from: "error", message: String(err?.message ?? err) },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200, // Keep CORS happy; client handles error
    });
  }
});
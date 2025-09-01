import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const VISION_URL = "https://vision.googleapis.com/v1/images:annotate";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { image_base64 } = await req.json();
    const key = Deno.env.get("GOOGLE_VISION_API_KEY");
    if (!key) throw new Error("Missing GOOGLE_VISION_API_KEY");

    const content = (image_base64 || "").split(",").pop();

    // ✅ MEAL ONLY: object + labels (helpful), no text, no web
    const body = {
      requests: [{
        image: { content },
        features: [
          { type: "OBJECT_LOCALIZATION", maxResults: 20 },
          { type: "LABEL_DETECTION",     maxResults: 12 },
        ],
      }],
    };

    const r = await fetch(`${VISION_URL}?key=${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const raw = await r.text();
    if (!r.ok) throw new Error(`Vision ${r.status}: ${raw}`);
    const json = JSON.parse(raw);
    const resp = json?.responses?.[0] ?? {};

    // Objects first
    const objs = resp?.localizedObjectAnnotations ?? [];
    const objectItems = objs.map((o:any) => ({
      name: (o.name || "").toLowerCase(),
      confidence: o.score || 0,
      source: "object",
      box: o.boundingPoly?.normalizedVertices ?? null,
    }));

    // Labels as secondary candidates
    const labels = (resp?.labelAnnotations ?? []).map((x:any) => ({
      name: (x.description || "").toLowerCase(),
      confidence: x.score || 0,
      source: "label",
      box: null
    }));

    // Return both (client will gate & map to nutrition DB)
    const items = [...objectItems, ...labels];
    return new Response(JSON.stringify({
      items,
      _debug: { from: "object+label", objects: objectItems.length, labels: labels.length }
    }), { headers: { ...cors, "Content-Type": "application/json" }});
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e), items: [] }), {
      status: 200, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
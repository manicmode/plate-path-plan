import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const VISION_URL = "https://vision.googleapis.com/v1/images:annotate";

// canonical foods + defaults (extend as needed)
const FOOD: Record<string, { aliases: string[]; defaultGrams: number }> = {
  salmon:     { aliases: ["salmon", "fish fillet"], defaultGrams: 140 },
  asparagus:  { aliases: ["asparagus"],             defaultGrams: 85  },
  tomato:     { aliases: ["tomato","cherry tomato"],defaultGrams: 50  },
  lemon:      { aliases: ["lemon","lemon slice"],   defaultGrams: 20  },
  pasta:      { aliases: ["pasta","spaghetti","noodles"], defaultGrams: 140 },
  rice:       { aliases: ["rice","fried rice"],     defaultGrams: 150 },
  salad:      { aliases: ["salad","lettuce","greens"], defaultGrams: 120 },
  chicken:    { aliases: ["chicken","chicken breast"], defaultGrams: 120 },
  beef:       { aliases: ["beef","steak"],          defaultGrams: 150 },
  fries:      { aliases: ["fries","french fries","chips"], defaultGrams: 90 },
  burger:     { aliases: ["burger"],                defaultGrams: 180 },
  sandwich:   { aliases: ["sandwich"],              defaultGrams: 170 },
  eggs:       { aliases: ["egg","omelet","omelette"], defaultGrams: 100 },
  pancakes:   { aliases: ["pancake","pancakes","waffle"], defaultGrams: 150 },
  sushi:      { aliases: ["sushi"],                 defaultGrams: 140 },
  soup:       { aliases: ["soup"],                  defaultGrams: 300 },
  bread:      { aliases: ["bread","toast","bun"],   defaultGrams: 60  },
  pizza:      { aliases: ["pizza"],                 defaultGrams: 200 },
  carrot:     { aliases: ["carrot","carrots"],      defaultGrams: 60  },
  broccoli:   { aliases: ["broccoli"],              defaultGrams: 90  },
  potato:     { aliases: ["potato","potatoes"],     defaultGrams: 150 },
  fish:       { aliases: ["fish"],                  defaultGrams: 140 },
  tuna:       { aliases: ["tuna"],                  defaultGrams: 140 },
  cheese:     { aliases: ["cheese"],                defaultGrams: 30  },
  yogurt:     { aliases: ["yogurt"],                defaultGrams: 170 },
  milk:       { aliases: ["milk"],                  defaultGrams: 240 },
  beans:      { aliases: ["beans"],                 defaultGrams: 180 },
  lentils:    { aliases: ["lentils"],               defaultGrams: 180 },
  nuts:       { aliases: ["nuts","nut"],            defaultGrams: 30  },
  avocado:    { aliases: ["avocado"],               defaultGrams: 150 },
  spinach:    { aliases: ["spinach"],               defaultGrams: 30  },
  kale:       { aliases: ["kale"],                  defaultGrams: 70  },
  apple:      { aliases: ["apple"],                 defaultGrams: 180 },
  banana:     { aliases: ["banana"],                defaultGrams: 120 },
  orange:     { aliases: ["orange"],                defaultGrams: 150 },
};

function toCanonical(s: string): string | null {
  const t = s.toLowerCase();
  for (const k of Object.keys(FOOD)) {
    const hit = FOOD[k].aliases.some(a => t.includes(a));
    if (hit) return k;
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  
  try {
    const { image_base64 } = await req.json();
    const key = Deno.env.get("GOOGLE_VISION_API_KEY");
    if (!key) throw new Error("Missing GOOGLE_VISION_API_KEY");
    
    const content = (image_base64 || "").split(",").pop();

    const body = {
      requests: [{
        image: { content },
        features: [
          { type: "OBJECT_LOCALIZATION", maxResults: 20 },
          { type: "LABEL_DETECTION",     maxResults: 15 },
        ],
      }],
    };

    const r = await fetch(`${VISION_URL}?key=${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    
    const text = await r.text();
    if (!r.ok) throw new Error(`Vision error ${r.status}: ${text}`);
    
    const json = JSON.parse(text);
    const resp = json?.responses?.[0] ?? {};
    const objs = resp?.localizedObjectAnnotations ?? [];
    const labels = (resp?.labelAnnotations ?? []).map((x: any) => (x.description || "").toLowerCase());

    // Build candidates from boxes, enrich with global labels for generics
    const cand = objs.map((o: any) => {
      const vs = o.boundingPoly?.normalizedVertices ?? [];
      const xs = vs.map((v: any) => v.x ?? 0), ys = vs.map((v: any) => v.y ?? 0);
      const x = Math.max(0, Math.min(...xs)), y = Math.max(0, Math.min(...ys));
      const w = Math.max(0, Math.max(...xs) - x), h = Math.max(0, Math.max(...ys) - y);
      const raw = (o.name || "").toLowerCase();

      // first try the object name, then enrich with best global label that maps
      let name = toCanonical(raw);
      if (!name) {
        const guess = labels.map(toCanonical).find(Boolean);
        if (guess) name = guess;
      }
      return { name, score: o.score || 0, x, y, w, h, area: Math.max(w*h, 0) };
    }).filter(c => c.name && c.score >= 0.55); // filter non-foods like "sleeve", "white"

    if (!cand.length) {
      console.log(`[meal-detector] No food objects detected from ${objs.length} objects and ${labels.length} labels`);
      return new Response(JSON.stringify({ items: [] }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const areaSum = cand.reduce((s,c) => s + c.area, 0) || 1;
    const items = cand
      .sort((a,b) => b.score - a.score)
      .slice(0, 4)
      .map(c => {
        const ratio = c.area / areaSum; // share of plate
        const base = FOOD[c.name!].defaultGrams;
        const grams = Math.max(20, Math.round(base * (ratio / 0.6))); // ~60% main item normalization
        return {
          name: c.name, 
          confidence: c.score,
          box: { x:c.x, y:c.y, w:c.w, h:c.h },
          areaRatio: Number(ratio.toFixed(3)),
          grams
        };
      });

    console.log(`[meal-detector] Detected ${items.length} food items:`, items.map(i => `${i.name}(${i.grams}g)`));

    return new Response(JSON.stringify({ items }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
    
  } catch (e) {
    console.error("[meal-detector] Error:", e);
    return new Response(JSON.stringify({ error: String(e), items: [] }), {
      status: 200, // fail-soft; client shows retry UI
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
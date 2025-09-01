import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const VISION_URL = "https://vision.googleapis.com/v1/images:annotate";

// canonical foods + aliases + default grams
const FOOD: Record<string, { aliases: string[]; defaultGrams: number }> = {
  salmon:     { aliases: ["salmon","fish","salmon steak","grilled salmon","fish fillet"], defaultGrams: 140 },
  asparagus:  { aliases: ["asparagus"], defaultGrams: 85 },
  tomato:     { aliases: ["tomato","cherry tomato"], defaultGrams: 50 },
  lemon:      { aliases: ["lemon","lemon slice"], defaultGrams: 20 },
  pasta:      { aliases: ["pasta","spaghetti","noodles"], defaultGrams: 140 },
  rice:       { aliases: ["rice","fried rice","pilaf"], defaultGrams: 150 },
  salad:      { aliases: ["salad","lettuce","greens"], defaultGrams: 120 },
  chicken:    { aliases: ["chicken","chicken breast"], defaultGrams: 120 },
  beef:       { aliases: ["beef","steak"], defaultGrams: 150 },
  fries:      { aliases: ["fries","french fries","chips"], defaultGrams: 90 },
  burger:     { aliases: ["burger"], defaultGrams: 180 },
  sandwich:   { aliases: ["sandwich"], defaultGrams: 170 },
  eggs:       { aliases: ["egg","eggs","omelet","omelette"], defaultGrams: 100 },
  pancakes:   { aliases: ["pancake","pancakes","waffle"], defaultGrams: 150 },
  sushi:      { aliases: ["sushi"], defaultGrams: 140 },
  soup:       { aliases: ["soup"], defaultGrams: 300 },
  bread:      { aliases: ["bread","toast","bun"], defaultGrams: 60 },
};

function toCanonical(s: string): string | null {
  const t = s.toLowerCase();
  for (const k of Object.keys(FOOD)) {
    if (FOOD[k].aliases.some(a => t.includes(a))) return k;
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { image_base64 } = await req.json();
    const key = Deno.env.get("GOOGLE_VISION_API_KEY");
    
    if (!key) {
      throw new Error("Missing GOOGLE_VISION_API_KEY");
    }
    
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
    if (!r.ok) {
      throw new Error(`Vision error ${r.status}: ${text}`);
    }
    
    const json = JSON.parse(text);
    const resp = json?.responses?.[0] ?? {};
    const objs = resp?.localizedObjectAnnotations ?? [];
    const labels = (resp?.labelAnnotations ?? []).map((x: any) => (x.description || "").toLowerCase());

    // candidate boxes → foods
    const boxes = objs.map((o: any) => {
      const vs = o.boundingPoly?.normalizedVertices ?? [];
      const xs = vs.map((v: any) => v.x ?? 0);
      const ys = vs.map((v: any) => v.y ?? 0);
      const x = Math.max(0, Math.min(...xs));
      const y = Math.max(0, Math.min(...ys));
      const w = Math.max(0, Math.max(...xs) - x);
      const h = Math.max(0, Math.max(...ys) - y);
      const raw = (o.name || "").toLowerCase();
      
      let name = toCanonical(raw);
      if (!name) {
        const guess = labels.map(toCanonical).find(Boolean);
        if (guess) name = guess;
      }
      return { name, score: o.score || 0, x, y, w, h, area: Math.max(w*h, 0) };
    }).filter(c => c.name && c.score >= 0.55);

    let items: any[] = [];
    if (boxes.length) {
      const areaSum = boxes.reduce((s,c) => s + c.area, 0) || 1;
      items = boxes
        .sort((a,b) => b.score - a.score)
        .slice(0, 4)
        .map(c => {
          const ratio = c.area / areaSum;
          const base = FOOD[c.name!].defaultGrams;
          const grams = Math.max(20, Math.round(base * (ratio / 0.6))); // normalize main item ~60%
          return {
            name: c.name,
            confidence: c.score,
            box: { x:c.x, y:c.y, w:c.w, h:c.h },
            areaRatio: Number(ratio.toFixed(3)),
            grams
          };
        });
    }

    // Fallback: if no boxes mapped to foods, use global labels
    if (!items.length) {
      const labelFoods = labels
        .map(toCanonical)
        .filter(Boolean)
        .slice(0, 3)
        .map((name: string, i: number) => ({
          name,
          confidence: 0.6 - i * 0.05,
          box: null,
          areaRatio: 1 / Math.max(1, i + 1),
          grams: Math.round(FOOD[name!].defaultGrams * (i === 0 ? 1 : 0.6)),
        }));
      
      return new Response(JSON.stringify({ items: labelFoods }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ items }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    // fail soft (client shows retry UI)
    return new Response(JSON.stringify({ error: String(e), items: [] }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
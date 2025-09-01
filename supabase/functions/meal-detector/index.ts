import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const VISION_URL = "https://vision.googleapis.com/v1/images:annotate";

const FOOD: Record<string, { aliases: string[] }> = {
  salmon:     { aliases: ["salmon","grilled salmon","salmon steak","fish fillet","fish"] },
  asparagus:  { aliases: ["asparagus"] },
  tomato:     { aliases: ["tomato","cherry tomato"] },
  lemon:      { aliases: ["lemon","lemon slice"] },
  pasta:      { aliases: ["pasta","spaghetti","noodles"] },
  rice:       { aliases: ["rice","fried rice","pilaf"] },
  salad:      { aliases: ["salad","lettuce","greens"] },
  chicken:    { aliases: ["chicken","chicken breast"] },
  beef:       { aliases: ["beef","steak"] },
  fries:      { aliases: ["fries","french fries","chips"] },
  burger:     { aliases: ["burger"] },
  sandwich:   { aliases: ["sandwich"] },
  eggs:       { aliases: ["egg","eggs","omelet","omelette"] },
  pancakes:   { aliases: ["pancake","pancakes","waffle"] },
  sushi:      { aliases: ["sushi"] },
  soup:       { aliases: ["soup"] },
  bread:      { aliases: ["bread","toast","bun"] },
};
const NEG = ["plate","dish","tableware","cutlery","spoon","fork","bowl","sleeve","white"];

function toCanonical(s: string): string | null {
  const t = (s||"").toLowerCase();
  if (!t || NEG.some(n => t.includes(n))) return null;
  for (const k of Object.keys(FOOD)) if (FOOD[k].aliases.some(a => t.includes(a))) return k;
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { image_base64 } = await req.json();
    const key = Deno.env.get("GOOGLE_VISION_API_KEY");
    if (!key) throw new Error("Missing GOOGLE_VISION_API_KEY");
    const content = (image_base64 || "").split(",").pop();

    const body = { requests: [{ image: { content }, features: [
      { type: "OBJECT_LOCALIZATION", maxResults: 20 },
      { type: "LABEL_DETECTION",     maxResults: 15 },
      { type: "WEB_DETECTION",       maxResults: 10 },
    ]}]};

    const r = await fetch(`${VISION_URL}?key=${key}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const raw = await r.text();
    if (!r.ok) throw new Error(`Vision ${r.status}: ${raw}`);

    const json = JSON.parse(raw);
    const resp = json?.responses?.[0] ?? {};
    const objs = resp?.localizedObjectAnnotations ?? [];
    const labels = (resp?.labelAnnotations ?? []).map((x:any)=> (x.description||"").toLowerCase());
    const web = (resp?.webDetection?.webEntities ?? []).map((e:any)=> (e.description||"").toLowerCase());

    // Objects first
    const boxed = objs.map((o:any) => {
      const vs = o.boundingPoly?.normalizedVertices ?? [];
      const xs = vs.map((v:any)=>v.x??0), ys = vs.map((v:any)=>v.y??0);
      const x = Math.max(0, Math.min(...xs)), y = Math.max(0, Math.min(...ys));
      const w = Math.max(0, Math.max(...xs) - x), h = Math.max(0, Math.max(...ys) - y);
      let name = toCanonical(o.name || "");
      if (!name) name = labels.map(toCanonical).find(Boolean) || web.map(toCanonical).find(Boolean);
      return { name, score: o.score || 0, box: {x,y,w,h} };
    }).filter((c:any)=> c.name && c.score >= 0.55);

    let items = boxed.map((c:any)=> ({ name: c.name, confidence: Number(c.score.toFixed(3)), box: c.box }));

    // Fallback to labels/web if no boxes mapped
    if (!items.length) {
      const merged = [...labels, ...web];
      const uniq = Array.from(new Set(merged)).filter(s => s && s.length > 2); // basic filter
      const bestGuessLabels = resp?.webDetection?.bestGuessLabels ?? [];
      const bestGuess = bestGuessLabels.map((g:any) => (g.label||"").toLowerCase()).filter(Boolean);
      
      const allCandidates = [...uniq, ...bestGuess];
      const finalUniq = Array.from(new Set(allCandidates)).slice(0,10);
      
      items = finalUniq.map((name:string,i:number)=>({
        name, confidence: Number((0.7 - i*0.05).toFixed(3)), box: null
      }));
      
      return new Response(JSON.stringify({ 
        items, 
        _debug:{
          from:"labels/web/bestGuess", 
          labels: labels.slice(0,15), 
          web: web.slice(0,15),
          bestGuess: bestGuess.slice(0,10),
          finalCandidates: finalUniq
        } 
      }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ items, _debug:{from:"objects", count: items.length} }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e), items: [] }), {
      status: 200, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
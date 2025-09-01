import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const VISION_URL = "https://vision.googleapis.com/v1/images:annotate";

const FOOD_MAP: Record<string, number> = {
  salmon: 140, fish: 140, "fish fillet": 140,
  asparagus: 85, tomato: 50, "cherry tomato": 30, lemon: 20,
  pasta: 140, spaghetti: 140, noodles: 140,
  rice: 150, "fried rice": 150,
  salad: 120, lettuce: 30, greens: 50,
  chicken: 120, "chicken breast": 120,
  beef: 150, steak: 150,
  fries: 90, "french fries": 90, chips: 90,
  burger: 180, sandwich: 170,
  egg: 100, omelet: 100, omelette: 100,
  pancake: 150, pancakes: 150, waffle: 150,
  sushi: 140, soup: 300, bread: 60, toast: 60,
  pizza: 200, carrot: 60, broccoli: 90,
  potato: 150, cheese: 30, yogurt: 170
};

function getFoodInfo(label: string): { name: string; grams: number } | null {
  const lower = label.toLowerCase();
  for (const [food, grams] of Object.entries(FOOD_MAP)) {
    if (lower.includes(food)) {
      return { name: food, grams };
    }
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { image_base64 } = await req.json();
    const apiKey = Deno.env.get("GOOGLE_VISION_API_KEY");
    
    if (!apiKey) {
      console.log("[meal-detector] Missing API key");
      return new Response(JSON.stringify({ items: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const content = (image_base64 || "").split(",").pop();
    
    const requestBody = {
      requests: [{
        image: { content },
        features: [
          { type: "OBJECT_LOCALIZATION", maxResults: 15 },
          { type: "LABEL_DETECTION", maxResults: 10 }
        ]
      }]
    };

    const response = await fetch(`${VISION_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[meal-detector] Vision API error ${response.status}: ${errorText}`);
      return new Response(JSON.stringify({ items: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const result = data?.responses?.[0] || {};
    
    const objects = result?.localizedObjectAnnotations || [];
    const labels = (result?.labelAnnotations || []).map((l: any) => l.description || "");
    
    const detectedItems: any[] = [];
    
    // Process objects first
    for (const obj of objects) {
      const foodInfo = getFoodInfo(obj.name || "");
      if (foodInfo && obj.score >= 0.6) {
        detectedItems.push({
          name: foodInfo.name,
          confidence: obj.score,
          grams: foodInfo.grams,
          source: "object"
        });
      }
    }
    
    // If no objects found, try labels
    if (detectedItems.length === 0) {
      for (const label of labels) {
        const foodInfo = getFoodInfo(label);
        if (foodInfo) {
          detectedItems.push({
            name: foodInfo.name,
            confidence: 0.7,
            grams: foodInfo.grams,
            source: "label"
          });
        }
      }
    }

    // Remove duplicates and take top 3
    const uniqueItems = detectedItems
      .filter((item, index, self) => 
        index === self.findIndex(t => t.name === item.name)
      )
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3);

    console.log(`[meal-detector] Detected ${uniqueItems.length} food items:`, uniqueItems.map(i => i.name));

    return new Response(JSON.stringify({ items: uniqueItems }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[meal-detector] Error:", error);
    return new Response(JSON.stringify({ error: String(error), items: [] }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
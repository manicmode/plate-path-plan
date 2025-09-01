// Google Vision Food Detector - Uses label detection instead of OpenAI
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, x-client, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const VISION_URL = "https://vision.googleapis.com/v1/images:annotate";

const FOOD_MAP: Record<string, string> = {
  pasta: "pasta", spaghetti: "pasta", noodles: "noodles",
  pizza: "pizza", sandwich: "sandwich", burger: "burger",
  salad: "salad", lettuce: "salad", tomato: "salad",
  rice: "rice", curry: "curry", chicken: "chicken",
  beef: "beef", steak: "beef", egg: "eggs", omelet: "eggs",
  pancake: "pancakes", waffle: "pancakes", sushi: "sushi",
  soup: "soup", bread: "bread", fries: "fries",
  apple: "apple", banana: "banana", orange: "orange",
  broccoli: "broccoli", carrot: "carrots", potato: "potato",
  fish: "fish", salmon: "salmon", tuna: "tuna",
  cheese: "cheese", yogurt: "yogurt", milk: "milk",
  beans: "beans", lentils: "lentils", nuts: "nuts",
  avocado: "avocado", spinach: "spinach", kale: "kale"
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { image_base64, imageBase64 } = await req.json();
    const base64Data = image_base64 || imageBase64;
    
    if (!base64Data) {
      return new Response(JSON.stringify({ 
        error: "image_base64 is required",
        items: []
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("GOOGLE_VISION_API_KEY");
    if (!apiKey) {
      console.error("[gpt5-vision-food-detector] Missing GOOGLE_VISION_API_KEY");
      return new Response(JSON.stringify({ 
        error: "Missing GOOGLE_VISION_API_KEY",
        items: []
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Sanitize base64 data
    const content = (base64Data || "").split(",").pop();
    
    const visionBody = {
      requests: [{
        image: { content },
        features: [{ type: "LABEL_DETECTION", maxResults: 15 }]
      }]
    };

    const visionResponse = await fetch(`${VISION_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(visionBody),
    });

    const responseText = await visionResponse.text();
    if (!visionResponse.ok) {
      console.error(`[gpt5-vision-food-detector] Vision error ${visionResponse.status}: ${responseText}`);
      return new Response(JSON.stringify({ 
        error: `Vision error ${visionResponse.status}: ${responseText}`,
        items: []
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const visionData = JSON.parse(responseText);
    const annotations = visionData?.responses?.[0]?.labelAnnotations ?? [];
    
    const foods = annotations
      .map((annotation: any) => ({
        raw: (annotation.description || "").toLowerCase(),
        score: annotation.score || 0
      }))
      .map((item: any) => ({
        name: FOOD_MAP[item.raw] || item.raw,
        confidence: item.score
      }))
      .filter((item: any) => item.confidence >= 0.55)
      .slice(0, 3);

    console.log(`[gpt5-vision-food-detector] Detected ${foods.length} food items:`, foods.map(f => f.name));

    return new Response(JSON.stringify({
      items: foods,
      foodItems: foods.map(f => f.name) // Legacy compatibility
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[gpt5-vision-food-detector] Error:", error);
    return new Response(JSON.stringify({ 
      error: "Failed to process image",
      details: error.message,
      items: []
    }), {
      status: 200, // Return 200 with empty items so client can show retry UI
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
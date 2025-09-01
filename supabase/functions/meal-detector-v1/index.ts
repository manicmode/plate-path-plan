import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const VISION_URL = "https://vision.googleapis.com/v1/images:annotate";

// Food dictionary for label extraction
const FOOD_DICTIONARY = new Set([
  'salmon', 'asparagus', 'chicken', 'beef', 'pork', 'tuna', 'shrimp', 'egg', 'eggs',
  'bread', 'bun', 'baguette', 'tortilla', 'pasta', 'noodles', 'rice', 'quinoa',
  'potato', 'potatoes', 'tomato', 'tomatoes', 'lettuce', 'spinach', 'kale', 'broccoli',
  'carrot', 'carrots', 'onion', 'onions', 'pepper', 'peppers', 'apple', 'apples',
  'banana', 'bananas', 'orange', 'oranges', 'lemon', 'lemons', 'lime', 'limes',
  'grape', 'grapes', 'strawberry', 'strawberries', 'blueberry', 'blueberries',
  'yogurt', 'cheese', 'butter', 'oil', 'donut', 'donuts', 'muffin', 'muffins',
  'cookie', 'cookies', 'cake', 'cakes', 'sandwich', 'sandwiches', 'burger', 'burgers',
  'pizza', 'soup', 'curry', 'stew', 'hummus', 'falafel', 'kebab', 'tofu', 'tempeh',
  'sushi', 'sashimi', 'udon', 'ramen', 'pho', 'naan', 'pita', 'couscous', 'avocado',
  'mushroom', 'mushrooms', 'corn', 'beans', 'lentils', 'chickpeas', 'nuts', 'almonds',
  'walnuts', 'cashews', 'peanuts', 'seeds', 'sunflower', 'chia', 'flax', 'oats',
  'cereal', 'milk', 'cream', 'fish', 'lobster', 'crab', 'scallops', 'mussels',
  'clams', 'oysters', 'turkey', 'duck', 'lamb', 'bacon', 'ham', 'sausage', 'salami'
]);

// Generic terms that indicate food but aren't specific (for fallback detection)
const GENERIC_FOOD_TERMS = /\b(plate|dishware|utensil|cutlery|table|recipe|cooking|cuisine|kitchen|food|dish|meal|produce|ingredient|logo|brand|text)\b/i;

const extractFoodNouns = (labels: string[]): string[] => {
  const foodNouns: string[] = [];
  
  for (const label of labels) {
    const words = label.toLowerCase().split(/\s+/);
    for (const word of words) {
      const cleanWord = word.replace(/[^a-z]/g, '');
      if (FOOD_DICTIONARY.has(cleanWord)) {
        foodNouns.push(cleanWord);
      }
    }
  }
  
  return [...new Set(foodNouns)]; // dedupe
};

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
    
    // Parse objects with minScore filtering
    const rawObjects = resp?.localizedObjectAnnotations ?? [];
    const objects = rawObjects
      .filter((o: any) => (o.score || 0) >= 0.55) // Apply minScore filter
      .map((o: any) => (o.name || "").toLowerCase().trim())
      .filter(s => s);
    
    const rawLabels = resp?.labelAnnotations ?? [];
    const labels = rawLabels.map((l: any) => (l.description || "").toLowerCase().trim()).filter(s => s);
    
    // Check if objects contain only generic terms
    const hasSpecificObjects = objects.some(obj => !GENERIC_FOOD_TERMS.test(obj));
    
    let chosen: string[];
    let chosenFrom: string;
    
    if (hasSpecificObjects) {
      // Use objects if they contain specific food items
      chosen = objects.filter(obj => !GENERIC_FOOD_TERMS.test(obj));
      chosenFrom = 'objects';
    } else {
      // Fallback to label food extraction
      const extractedFoods = extractFoodNouns(labels);
      if (extractedFoods.length > 0) {
        chosen = extractedFoods;
        chosenFrom = 'labels';
      } else {
        chosen = [];
        chosenFrom = 'none';
      }
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
        objCount: objects.length,
        labelCount: labels.length
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
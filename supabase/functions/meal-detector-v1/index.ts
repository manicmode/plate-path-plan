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
    
    // Filtering logic
    const NEG = /\b(plate|tableware|fork|spoon|knife|napkin|logo|brand|font|text|cutlery|table|placemat|bowl|glass|cup|tray)\b/i;
    const GENERIC = /\b(food|foods|dish|meal|snack|cuisine|produce|ingredient|vegetable|vegetables|fruit|fruits|meat|seafood|dairy)\b/i;
    
    const keep = (s: string) => !NEG.test(s);
    const isGeneric = (s: string) => GENERIC.test(s);

    // Build filtered arrays
    const objectsKept = objects.filter(keep);
    const objectsSpecific = objectsKept.filter(s => !isGeneric(s));
    const labelsKept = labels.filter(keep);
    const labelsSpecific = labelsKept.filter(s => !isGeneric(s));

    let chosen: string[];
    let chosenFrom: string;
    
    // Choosing logic (this is the fix):
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
      imageWH: { width: 1200, height: 800 }, // Placeholder - would come from Vision API
      plateBBox: undefined, // Placeholder - would need object detection for plates
      objects: rawObjects.map((o: any) => ({ name: o.name, score: o.score })),
      labels: rawLabels.map((l: any) => ({ name: l.description, score: l.score })),
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
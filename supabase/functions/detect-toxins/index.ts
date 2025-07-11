import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ToxinDetectionRules {
  [key: string]: {
    name: string;
    icon: string;
    threshold: number;
    unit: string;
    keywords: string[];
  };
}

const TOXIN_RULES: ToxinDetectionRules = {
  inflammatory_foods: {
    name: "Inflammatory Foods",
    icon: "🔥",
    threshold: 2,
    unit: "servings",
    keywords: [
      // Processed meats
      'processed meat', 'hot dog', 'sausage', 'bacon', 'pepperoni', 'salami', 'deli meat',
      'lunch meat', 'ham', 'bologna', 'chorizo', 'bratwurst',
      // Refined sugars
      'high fructose corn syrup', 'corn syrup', 'refined sugar', 'white sugar',
      'cane sugar', 'sucrose', 'dextrose', 'maltose',
      // Trans fats
      'trans fat', 'partially hydrogenated', 'hydrogenated oil', 'margarine',
      'shortening', 'vegetable shortening',
      // Fried foods
      'fried', 'deep fried', 'french fries', 'chips', 'potato chips', 'tortilla chips',
      'fried chicken', 'onion rings', 'tempura', 'donuts', 'doughnuts',
      // Sodas and sugary drinks
      'soda', 'cola', 'soft drink', 'energy drink', 'sports drink',
      'fruit punch', 'sweetened beverage'
    ]
  },
  artificial_sweeteners: {
    name: "Artificial Sweeteners",
    icon: "🧪",
    threshold: 1,
    unit: "servings",
    keywords: [
      'aspartame', 'sucralose', 'saccharin', 'acesulfame k', 'acesulfame potassium',
      'neotame', 'advantame', 'splenda', 'equal', 'sweet n low', 'nutrasweet',
      'artificial sweetener', 'sugar substitute', 'stevia', 'monk fruit extract'
    ]
  },
  preservatives: {
    name: "Preservatives",
    icon: "⚗️",
    threshold: 3,
    unit: "servings",
    keywords: [
      'sodium benzoate', 'potassium benzoate', 'bha', 'bht', 'butylated hydroxyanisole',
      'butylated hydroxytoluene', 'sodium nitrate', 'sodium nitrite', 'potassium nitrate',
      'potassium nitrite', 'sulfur dioxide', 'potassium sorbate', 'calcium propionate',
      'sodium propionate', 'tbhq', 'tert-butylhydroquinone', 'edta', 'citric acid',
      'ascorbic acid', 'tocopherols', 'rosemary extract'
    ]
  },
  dyes: {
    name: "Dyes",
    icon: "🎨",
    threshold: 1,
    unit: "servings",
    keywords: [
      'red 40', 'allura red', 'red dye 40', 'yellow 5', 'tartrazine', 'yellow dye 5',
      'yellow 6', 'sunset yellow', 'yellow dye 6', 'blue 1', 'brilliant blue',
      'blue dye 1', 'blue 2', 'indigotine', 'blue dye 2', 'green 3', 'fast green',
      'red 3', 'erythrosine', 'artificial color', 'artificial coloring', 'fd&c',
      'food dye', 'food coloring'
    ]
  },
  seed_oils: {
    name: "Seed Oils",
    icon: "🌻",
    threshold: 2,
    unit: "servings",
    keywords: [
      'canola oil', 'soybean oil', 'corn oil', 'sunflower oil', 'safflower oil',
      'grapeseed oil', 'cottonseed oil', 'rice bran oil', 'peanut oil',
      'vegetable oil', 'rapeseed oil'
    ]
  },
  gmos: {
    name: "GMOs",
    icon: "🧬",
    threshold: 2,
    unit: "servings",
    keywords: [
      'corn', 'soy', 'soybean', 'papaya', 'cottonseed', 'canola', 'sugar beet',
      'alfalfa', 'potato', 'squash', 'zucchini', 'yellow squash', 'corn syrup',
      'corn starch', 'soy lecithin', 'soy protein', 'textured vegetable protein',
      'high fructose corn syrup'
    ]
  }
};

function detectToxins(foodName: string, ingredients?: string): { [key: string]: string[] } {
  const detections: { [key: string]: string[] } = {};
  const searchText = `${foodName} ${ingredients || ''}`.toLowerCase();

  for (const [toxinType, rules] of Object.entries(TOXIN_RULES)) {
    const foundKeywords: string[] = [];
    
    for (const keyword of rules.keywords) {
      if (searchText.includes(keyword.toLowerCase())) {
        foundKeywords.push(keyword);
      }
    }
    
    if (foundKeywords.length > 0) {
      detections[toxinType] = foundKeywords;
    }
  }

  return detections;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { nutrition_log_id, food_name, ingredients, user_id } = await req.json();

    if (!nutrition_log_id || !food_name || !user_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Detecting toxins for food: ${food_name}, ingredients: ${ingredients}`);

    // Detect toxins in the food
    const detections = detectToxins(food_name, ingredients);
    
    console.log(`Found detections:`, detections);

    // Store detections in the database
    const insertPromises = Object.entries(detections).map(async ([toxinType, detectedIngredients]) => {
      const { data, error } = await supabase
        .from('toxin_detections')
        .insert({
          user_id,
          nutrition_log_id,
          toxin_type: toxinType,
          detected_ingredients: detectedIngredients,
          serving_count: 1 // Default to 1 serving, can be adjusted later
        });

      if (error) {
        console.error(`Error inserting ${toxinType} detection:`, error);
        throw error;
      }

      return data;
    });

    await Promise.all(insertPromises);

    return new Response(
      JSON.stringify({ 
        success: true, 
        detections: Object.keys(detections),
        detected_count: Object.keys(detections).length
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in detect-toxins function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface IngredientFlag {
  ingredient: string;
  reason: string;
  severity: 'low' | 'medium' | 'high';
}

interface FoodAnalysisResult {
  flaggedIngredients: IngredientFlag[];
  warningCount: number;
  highRiskCount: number;
  recommendations: string[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, foodName, ingredients, nutritionData } = await req.json();

    if (!userId || !foodName || !ingredients) {
      return new Response(
        JSON.stringify({ error: 'User ID, food name, and ingredients are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`Analyzing food ingredients for user: ${userId}, food: ${foodName}`);

    // Get user profile to determine health conditions
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('health_conditions')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile) {
      console.error('Profile fetch error:', profileError);
      return new Response(
        JSON.stringify({ error: 'User profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's flagged ingredients from daily targets
    const today = new Date().toISOString().split('T')[0];
    const { data: targets, error: targetsError } = await supabase
      .from('daily_nutrition_targets')
      .select('flagged_ingredients')
      .eq('user_id', userId)
      .eq('target_date', today)
      .single();

    if (targetsError && targetsError.code !== 'PGRST116') {
      console.error('Targets fetch error:', targetsError);
    }

    // Get flagged ingredients from targets or calculate them
    let userFlaggedIngredients: IngredientFlag[] = [];
    if (targets?.flagged_ingredients) {
      userFlaggedIngredients = targets.flagged_ingredients as IngredientFlag[];
    } else {
      // Fallback: calculate flagged ingredients
      userFlaggedIngredients = getFlaggedIngredients(profile.health_conditions || []);
    }

    // Analyze ingredients
    const analysisResult = analyzeIngredients(ingredients, nutritionData, userFlaggedIngredients);

    // Log the analysis if there are flagged ingredients
    if (analysisResult.flaggedIngredients.length > 0) {
      const { error: logError } = await supabase
        .from('nutrition_logs')
        .update({
          flagged_ingredients_analysis: analysisResult.flaggedIngredients
        })
        .eq('user_id', userId)
        .eq('food_name', foodName)
        .order('created_at', { ascending: false })
        .limit(1);

      if (logError) {
        console.error('Failed to update nutrition log with flagged ingredients:', logError);
      }
    }

    console.log(`Analysis complete. Found ${analysisResult.flaggedIngredients.length} flagged ingredients`);

    return new Response(
      JSON.stringify({
        success: true,
        analysis: analysisResult,
        message: analysisResult.flaggedIngredients.length > 0 
          ? `Found ${analysisResult.flaggedIngredients.length} ingredients of concern based on your health profile`
          : 'No concerning ingredients detected for your health profile'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-food-ingredients:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function analyzeIngredients(
  ingredients: string[], 
  nutritionData: any, 
  flaggedIngredients: IngredientFlag[]
): FoodAnalysisResult {
  const foundFlags: IngredientFlag[] = [];
  const recommendations: string[] = [];

  // Normalize ingredients for comparison
  const normalizedIngredients = ingredients.map(ing => ing.toLowerCase().trim());

  // Check each flagged ingredient against the food ingredients
  flaggedIngredients.forEach(flag => {
    const isFound = normalizedIngredients.some(ingredient => 
      ingredient.includes(flag.ingredient.toLowerCase()) ||
      flag.ingredient.toLowerCase().includes(ingredient)
    );

    if (isFound) {
      foundFlags.push(flag);
    }
  });

  // Additional nutritional checks based on values
  if (nutritionData) {
    // High sodium check (>400mg for hypertension)
    if (nutritionData.sodium && nutritionData.sodium > 400) {
      const existingSodiumFlag = foundFlags.find(f => f.ingredient === 'sodium');
      if (!existingSodiumFlag) {
        foundFlags.push({
          ingredient: 'sodium',
          reason: `High sodium content (${nutritionData.sodium}mg) may affect blood pressure`,
          severity: 'high'
        });
      }
    }

    // High saturated fat check (>8g for cholesterol)
    if (nutritionData.saturatedFat && nutritionData.saturatedFat > 8) {
      foundFlags.push({
        ingredient: 'saturated fat',
        reason: `High saturated fat content (${nutritionData.saturatedFat}g) may affect cholesterol levels`,
        severity: 'medium'
      });
    }

    // High protein check (>30g/serving for kidney issues)
    if (nutritionData.protein && nutritionData.protein > 30) {
      foundFlags.push({
        ingredient: 'excess protein',
        reason: `Very high protein content (${nutritionData.protein}g) may strain kidney function`,
        severity: 'medium'
      });
    }

    // High sugar check (>25g for diabetes)
    if (nutritionData.sugar && nutritionData.sugar > 25) {
      foundFlags.push({
        ingredient: 'added sugar',
        reason: `High sugar content (${nutritionData.sugar}g) may spike blood glucose`,
        severity: 'high'
      });
    }
  }

  // Generate recommendations based on flagged ingredients
  const highRiskFlags = foundFlags.filter(f => f.severity === 'high');
  const mediumRiskFlags = foundFlags.filter(f => f.severity === 'medium');

  if (highRiskFlags.length > 0) {
    recommendations.push('Consider avoiding this food due to high-risk ingredients for your health conditions');
  } else if (mediumRiskFlags.length > 0) {
    recommendations.push('Consume in moderation due to potentially concerning ingredients');
  }

  if (foundFlags.length > 2) {
    recommendations.push('This food contains multiple ingredients that may not align with your health goals');
  }

  return {
    flaggedIngredients: foundFlags,
    warningCount: foundFlags.length,
    highRiskCount: highRiskFlags.length,
    recommendations
  };
}

function getFlaggedIngredients(healthConditions: string[] = []): IngredientFlag[] {
  const flaggedIngredients: IngredientFlag[] = [];
  
  const conditionFlags: Record<string, IngredientFlag[]> = {
    'hypertension': [
      { ingredient: 'sodium', reason: 'High sodium intake can worsen hypertension', severity: 'high' },
      { ingredient: 'monosodium glutamate', reason: 'MSG can contribute to blood pressure elevation', severity: 'medium' },
      { ingredient: 'sodium benzoate', reason: 'Preservative that may affect blood pressure', severity: 'medium' },
      { ingredient: 'sodium nitrate', reason: 'Preservative linked to cardiovascular issues', severity: 'medium' },
      { ingredient: 'sodium nitrite', reason: 'Preservative linked to cardiovascular issues', severity: 'medium' }
    ],
    'diabetes': [
      { ingredient: 'high fructose corn syrup', reason: 'Rapidly spikes blood glucose levels', severity: 'high' },
      { ingredient: 'corn syrup', reason: 'Can cause rapid blood sugar spikes', severity: 'high' },
      { ingredient: 'maltodextrin', reason: 'Has higher glycemic index than table sugar', severity: 'high' },
      { ingredient: 'fruit juice concentrate', reason: 'Concentrated sugars without fiber', severity: 'medium' },
      { ingredient: 'sugar', reason: 'Direct impact on blood glucose', severity: 'medium' },
      { ingredient: 'glucose', reason: 'Rapidly absorbed, spikes blood sugar', severity: 'high' },
      { ingredient: 'dextrose', reason: 'Rapidly absorbed, spikes blood sugar', severity: 'high' }
    ],
    'inflammation': [
      { ingredient: 'soybean oil', reason: 'High omega-6 content promotes inflammation', severity: 'medium' },
      { ingredient: 'canola oil', reason: 'Processed seed oil that may promote inflammation', severity: 'medium' },
      { ingredient: 'sunflower oil', reason: 'High omega-6 content when refined', severity: 'medium' },
      { ingredient: 'trans fats', reason: 'Directly promotes systemic inflammation', severity: 'high' },
      { ingredient: 'partially hydrogenated oils', reason: 'Contains trans fats that cause inflammation', severity: 'high' },
      { ingredient: 'gluten', reason: 'Can trigger inflammatory response in sensitive individuals', severity: 'medium' },
      { ingredient: 'sucralose', reason: 'Artificial sweetener that may disrupt gut microbiome', severity: 'low' },
      { ingredient: 'aspartame', reason: 'May trigger inflammatory responses in some people', severity: 'low' }
    ],
    'digestive_issues': [
      { ingredient: 'lactose', reason: 'Can cause digestive distress in lactose intolerant individuals', severity: 'medium' },
      { ingredient: 'milk', reason: 'Contains lactose and casein that may cause digestive issues', severity: 'medium' },
      { ingredient: 'sorbitol', reason: 'Sugar alcohol that can cause digestive upset', severity: 'medium' },
      { ingredient: 'mannitol', reason: 'Sugar alcohol that may cause digestive distress', severity: 'medium' },
      { ingredient: 'carrageenan', reason: 'Additive that may cause intestinal inflammation', severity: 'medium' }
    ],
    'high_cholesterol': [
      { ingredient: 'trans fats', reason: 'Directly raises LDL cholesterol', severity: 'high' },
      { ingredient: 'partially hydrogenated oils', reason: 'Contains trans fats that worsen cholesterol profile', severity: 'high' },
      { ingredient: 'hydrogenated oils', reason: 'May contain trans fats that affect cholesterol', severity: 'high' },
      { ingredient: 'palm kernel oil', reason: 'Very high in saturated fat', severity: 'medium' },
      { ingredient: 'coconut oil', reason: 'High in saturated fat, use in moderation', severity: 'low' }
    ],
    'pcos': [
      { ingredient: 'refined flour', reason: 'High glycemic index can worsen insulin resistance', severity: 'medium' },
      { ingredient: 'white rice', reason: 'Refined carb that spikes insulin', severity: 'medium' },
      { ingredient: 'sugar', reason: 'Worsens insulin resistance common in PCOS', severity: 'high' },
      { ingredient: 'soy protein isolate', reason: 'Highly processed soy may affect hormones', severity: 'medium' },
      { ingredient: 'conventional dairy', reason: 'May contain hormones that affect PCOS', severity: 'low' }
    ],
    'hormonal_imbalance': [
      { ingredient: 'BPA', reason: 'Endocrine disruptor that mimics estrogen', severity: 'high' },
      { ingredient: 'soy isolate', reason: 'Concentrated isoflavones may affect hormone balance', severity: 'medium' },
      { ingredient: 'conventional dairy', reason: 'May contain added hormones', severity: 'low' },
      { ingredient: 'conventional meat', reason: 'May contain growth hormones', severity: 'low' }
    ],
    'kidney_disease': [
      { ingredient: 'phosphorus', reason: 'Kidneys may struggle to filter excess phosphorus', severity: 'high' },
      { ingredient: 'potassium', reason: 'Can accumulate to dangerous levels with kidney disease', severity: 'high' },
      { ingredient: 'sodium phosphate', reason: 'Additive that adds extra phosphorus load', severity: 'high' },
      { ingredient: 'potassium chloride', reason: 'Salt substitute that may be dangerous for kidney patients', severity: 'high' }
    ]
  };
  
  healthConditions.forEach(condition => {
    if (conditionFlags[condition]) {
      flaggedIngredients.push(...conditionFlags[condition]);
    }
  });
  
  // Remove duplicates based on ingredient name
  const uniqueFlags = flaggedIngredients.reduce((acc, current) => {
    const existing = acc.find(item => item.ingredient === current.ingredient);
    if (!existing) {
      acc.push(current);
    } else if (current.severity === 'high' && existing.severity !== 'high') {
      // Keep the higher severity version
      const index = acc.indexOf(existing);
      acc[index] = current;
    }
    return acc;
  }, [] as IngredientFlag[]);
  
  return uniqueFlags;
}

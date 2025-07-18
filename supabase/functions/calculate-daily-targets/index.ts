import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DatabaseClient {
  from: (table: string) => any;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, targetDate } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`Calculating daily targets for user: ${userId}, date: ${targetDate || 'today'}`);

    // Get user profile data
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile) {
      console.error('Profile fetch error:', profileError);
      return new Response(
        JSON.stringify({ error: 'User profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate nutrition targets using the same logic as frontend
    const nutritionTargets = calculateNutritionTargets(profile);

    // Prepare target date
    const date = targetDate || new Date().toISOString().split('T')[0];

    // Upsert daily nutrition targets
    const targetData = {
      user_id: userId,
      target_date: date,
      calories: nutritionTargets.calories,
      protein: nutritionTargets.protein,
      carbs: nutritionTargets.carbs,
      fat: nutritionTargets.fat,
      fiber: nutritionTargets.fiber,
      hydration_ml: nutritionTargets.hydrationMl,
      supplement_count: nutritionTargets.supplementCount,
      priority_micronutrients: nutritionTargets.priorityMicronutrients,
      flagged_ingredients: nutritionTargets.flaggedIngredients,
      calculated_at: new Date().toISOString(),
      profile_version: 1,
    };

    const { data: savedTargets, error: saveError } = await supabase
      .from('daily_nutrition_targets')
      .upsert(targetData, { onConflict: 'user_id,target_date' })
      .select()
      .single();

    if (saveError) {
      console.error('Save targets error:', saveError);
      return new Response(
        JSON.stringify({ error: 'Failed to save nutrition targets' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Daily targets calculated and saved successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        targets: savedTargets,
        message: 'Daily nutrition targets calculated and saved successfully'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in calculate-daily-targets:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Enhanced nutrition calculation functions (duplicated from frontend for edge function use)
function calculateBMR(weight: number, height: number, age: number, gender: string): number {
  const baseRate = 10 * weight + 6.25 * height - 5 * age;
  return gender === 'male' ? baseRate + 5 : baseRate - 161;
}

function getActivityMultiplier(
  activityLevel: string,
  dailyLifestyle?: string,
  exerciseFrequency?: string
): number {
  const baseMultipliers: Record<string, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    very_active: 1.725,
    extra_active: 1.9
  };

  let multiplier = baseMultipliers[activityLevel] || 1.2;

  if (dailyLifestyle === 'very_active_job') multiplier += 0.1;
  if (dailyLifestyle === 'sedentary_job') multiplier -= 0.05;

  if (exerciseFrequency === 'daily') multiplier += 0.1;
  if (exerciseFrequency === 'twice_daily') multiplier += 0.2;

  return Math.max(1.2, Math.min(2.0, multiplier));
}

function calculateCalorieTarget(
  tdee: number,
  weightGoalType: string,
  timeline?: string
): number {
  const baseCalories = tdee;
  
  switch (weightGoalType) {
    case 'lose_weight':
      const deficit = timeline === '3_months' ? 750 : 500;
      return Math.max(1200, baseCalories - deficit);
    
    case 'gain_weight':
      const surplus = timeline === '3_months' ? 500 : 300;
      return baseCalories + surplus;
    
    case 'body_recomposition':
      return baseCalories - 200;
    
    default:
      return baseCalories;
  }
}

function calculateMacroTargets(
  calories: number,
  weightGoalType: string,
  healthConditions: string[],
  activityLevel: string
): { protein: number; carbs: number; fat: number; fiber: number } {
  let proteinPercent = 0.25;
  if (weightGoalType === 'gain_weight' || weightGoalType === 'body_recomposition') {
    proteinPercent = 0.30;
  }
  if (activityLevel === 'very_active') proteinPercent += 0.05;

  let carbPercent = 0.40;
  let fatPercent = 0.35;

  if (healthConditions?.includes('diabetes')) {
    carbPercent = 0.30;
    fatPercent = 0.40;
  }
  
  if (healthConditions?.includes('pcos')) {
    carbPercent = 0.25;
    fatPercent = 0.45;
  }

  const total = proteinPercent + carbPercent + fatPercent;
  proteinPercent = proteinPercent / total;
  carbPercent = carbPercent / total;
  fatPercent = fatPercent / total;

  return {
    protein: Math.round((calories * proteinPercent) / 4),
    carbs: Math.round((calories * carbPercent) / 4),
    fat: Math.round((calories * fatPercent) / 9),
    fiber: Math.max(25, Math.round(calories / 1000 * 14))
  };
}

function calculateHydrationTarget(weight: number, weightUnit: string = 'lb'): number {
  const weightInPounds = weightUnit === 'kg' ? weight * 2.20462 : weight;
  const dailyOunces = weightInPounds * 0.67;
  const dailyMl = Math.round(dailyOunces * 29.5735);
  return dailyMl;
}

function calculateSupplementRecommendations(
  age: number,
  gender: string,
  healthConditions: string[] = [],
  dietStyles: string[] = [],
  activityLevel: string = 'moderate',
  weightGoalType: string = 'maintain'
): { name: string; reasoning: string }[] {
  const recommendations: { name: string; reasoning: string }[] = [];
  
  // Multivitamin - if vegan/keto or excluding food groups
  if (dietStyles.includes('vegan') || dietStyles.includes('keto')) {
    recommendations.push({
      name: 'Multivitamin',
      reasoning: `Recommended for ${dietStyles.join('/')} diet to cover potential nutrient gaps`
    });
  }
  
  // Vitamin D - general recommendation (future: add sunlight exposure flag)
  if (recommendations.length < 3) {
    recommendations.push({
      name: 'Vitamin D3',
      reasoning: 'Essential for bone health and immune function, many people have insufficient levels'
    });
  }
  
  // Omega-3 - if vegan or rarely eats fish
  if ((dietStyles.includes('vegan') || dietStyles.includes('vegetarian')) && recommendations.length < 3) {
    recommendations.push({
      name: 'Omega-3 (Algae-based)',
      reasoning: 'Plant-based omega-3 for heart and brain health on vegan/vegetarian diet'
    });
  } else if (recommendations.length < 3) {
    recommendations.push({
      name: 'Omega-3 Fish Oil',
      reasoning: 'Supports heart and brain health, reduces inflammation'
    });
  }
  
  // Magnesium - if high activity or stress/insomnia
  if ((activityLevel === 'very_active' || activityLevel === 'extra_active' || 
       healthConditions.includes('anxiety') || healthConditions.includes('insomnia')) && 
      recommendations.length < 3) {
    recommendations.push({
      name: 'Magnesium',
      reasoning: 'Supports muscle recovery, sleep quality, and stress management'
    });
  }
  
  // B12 - if vegan/vegetarian or fatigue
  if ((dietStyles.includes('vegan') || dietStyles.includes('vegetarian') || 
       healthConditions.includes('fatigue') || healthConditions.includes('anemia')) && 
      recommendations.length < 3) {
    recommendations.push({
      name: 'Vitamin B12',
      reasoning: 'Essential for energy and nervous system, often deficient in plant-based diets'
    });
  }
  
  // Iron - if female under 50 and low energy
  if (gender === 'female' && age < 50 && 
      (healthConditions.includes('anemia') || healthConditions.includes('fatigue')) && 
      recommendations.length < 3) {
    recommendations.push({
      name: 'Iron',
      reasoning: 'Supports healthy iron levels for women of reproductive age'
    });
  }
  
  // Creatine - if muscle gain goal and male (or very active female)
  if ((weightGoalType === 'gain_weight' || weightGoalType === 'body_recomposition') && 
      (gender === 'male' || activityLevel === 'very_active' || activityLevel === 'extra_active') && 
      recommendations.length < 3) {
    recommendations.push({
      name: 'Creatine Monohydrate',
      reasoning: 'Enhances muscle strength and power for resistance training'
    });
  }
  
  // Collagen - if female over 30
  if (gender === 'female' && age > 30 && recommendations.length < 3) {
    recommendations.push({
      name: 'Collagen Peptides',
      reasoning: 'Supports skin elasticity and joint health as collagen production declines with age'
    });
  }
  
  // Calcium - if lactose intolerant or avoids dairy
  if (healthConditions.includes('lactose_intolerance') && recommendations.length < 3) {
    recommendations.push({
      name: 'Calcium',
      reasoning: 'Essential for bone health when dairy intake is limited'
    });
  }
  
  // Zinc - if immune support or intense training
  if ((healthConditions.includes('frequent_illness') || 
       activityLevel === 'very_active' || activityLevel === 'extra_active') && 
      recommendations.length < 3) {
    recommendations.push({
      name: 'Zinc',
      reasoning: 'Supports immune function and recovery from intense training'
    });
  }
  
  // Probiotic - if digestive issues
  if ((healthConditions.includes('ibs') || healthConditions.includes('digestive_issues')) && 
      recommendations.length < 3) {
    recommendations.push({
      name: 'Probiotic',
      reasoning: 'Supports digestive health and gut microbiome balance'
    });
  }
  
  return recommendations.slice(0, 3);
}

function calculateSupplementTarget(
  age: number,
  gender: string,
  healthConditions: string[] = [],
  dietStyles: string[] = []
): number {
  let baseSupplementCount = 1;
  
  if (age > 50) baseSupplementCount += 1;
  if (age > 65) baseSupplementCount += 1;
  
  if (gender === 'female' && age < 50) baseSupplementCount += 1;
  if (gender === 'female') baseSupplementCount += 1;
  
  const conditionSupplements: Record<string, number> = {
    'diabetes': 1,
    'hypertension': 1,
    'heart_disease': 2,
    'osteoporosis': 2,
    'anemia': 1,
    'thyroid_disorders': 1,
    'depression': 1,
    'anxiety': 1,
  };
  
  healthConditions.forEach(condition => {
    if (conditionSupplements[condition]) {
      baseSupplementCount += conditionSupplements[condition];
    }
  });
  
  const dietSupplements: Record<string, number> = {
    'vegan': 2,
    'vegetarian': 1,
    'keto': 1,
    'paleo': 1,
  };
  
  dietStyles.forEach(diet => {
    if (dietSupplements[diet]) {
      baseSupplementCount += dietSupplements[diet];
    }
  });
  
  return Math.min(baseSupplementCount, 8);
}

function getFlaggedIngredients(healthConditions: string[] = []): string[] {
  const flaggedIngredients: string[] = [];
  
  const conditionFlags: Record<string, string[]> = {
    'diabetes': ['high fructose corn syrup', 'sugar', 'glucose', 'sucrose', 'dextrose'],
    'hypertension': ['sodium', 'salt', 'monosodium glutamate', 'sodium chloride'],
    'heart_disease': ['trans fats', 'partially hydrogenated oils', 'saturated fats'],
    'celiac_disease': ['wheat', 'gluten', 'barley', 'rye', 'malt'],
    'lactose_intolerance': ['lactose', 'milk', 'dairy', 'whey', 'casein'],
    'kidney_disease': ['phosphorus', 'potassium', 'sodium'],
    'gout': ['purines', 'fructose', 'alcohol'],
    'ibs': ['artificial sweeteners', 'sorbitol', 'mannitol', 'xylitol'],
  };
  
  healthConditions.forEach(condition => {
    if (conditionFlags[condition]) {
      flaggedIngredients.push(...conditionFlags[condition]);
    }
  });
  
  return [...new Set(flaggedIngredients)];
}

function getPriorityMicronutrients(
  age: number,
  gender: string,
  healthConditions: string[],
  dietStyles: string[]
): string[] {
  const micronutrients: string[] = [];
  
  micronutrients.push('Vitamin D', 'Vitamin B12', 'Omega-3');
  
  if (age > 50) {
    micronutrients.push('Calcium', 'Vitamin B6');
  }
  if (age > 65) {
    micronutrients.push('Vitamin K', 'Magnesium');
  }
  
  if (gender === 'female') {
    if (age < 50) {
      micronutrients.push('Iron', 'Folate');
    } else {
      micronutrients.push('Calcium', 'Vitamin K');
    }
  }
  
  const conditionMicronutrients: Record<string, string[]> = {
    'diabetes': ['Chromium', 'Alpha-lipoic acid', 'Vitamin C'],
    'hypertension': ['Magnesium', 'Potassium', 'CoQ10'],
    'heart_disease': ['Omega-3', 'CoQ10', 'Vitamin E'],
    'osteoporosis': ['Calcium', 'Vitamin D', 'Vitamin K'],
    'anemia': ['Iron', 'Vitamin B12', 'Folate'],
    'thyroid_disorders': ['Selenium', 'Iodine', 'Zinc'],
    'depression': ['Omega-3', 'Vitamin D', 'B-complex'],
    'anxiety': ['Magnesium', 'B-complex', 'Vitamin C'],
  };
  
  healthConditions.forEach(condition => {
    if (conditionMicronutrients[condition]) {
      micronutrients.push(...conditionMicronutrients[condition]);
    }
  });
  
  const dietMicronutrients: Record<string, string[]> = {
    'vegan': ['Vitamin B12', 'Iron', 'Zinc', 'Vitamin D'],
    'vegetarian': ['Vitamin B12', 'Iron', 'Zinc'],
    'keto': ['Electrolytes', 'Magnesium', 'Potassium'],
    'paleo': ['Vitamin D', 'Calcium'],
  };
  
  dietStyles.forEach(diet => {
    if (dietMicronutrients[diet]) {
      micronutrients.push(...dietMicronutrients[diet]);
    }
  });
  
  return [...new Set(micronutrients)].slice(0, 8);
}

function calculateNutritionTargets(profile: any) {
  // Calculate height in cm
  let heightCm = profile.height_cm || 0;
  if (!heightCm && profile.height_feet && profile.height_inches) {
    heightCm = (profile.height_feet * 12 + profile.height_inches) * 2.54;
  }
  
  // Calculate BMR and TDEE
  const bmr = calculateBMR(profile.weight, heightCm, profile.age, profile.gender);
  const activityMultiplier = getActivityMultiplier(
    profile.activity_level,
    profile.daily_lifestyle,
    profile.exercise_frequency
  );
  const tdee = bmr * activityMultiplier;
  
  // Calculate calorie target
  const calories = calculateCalorieTarget(tdee, profile.weight_goal_type || 'maintain', profile.weight_goal_timeline);
  
  // Calculate macro targets
  const macros = calculateMacroTargets(
    calories,
    profile.weight_goal_type || 'maintain',
    profile.health_conditions || [],
    profile.activity_level
  );
  
  // Calculate hydration target
  const hydrationMl = calculateHydrationTarget(profile.weight, profile.weight_unit);
  
  // Calculate supplement recommendations and target count
  const supplementRecommendations = calculateSupplementRecommendations(
    profile.age,
    profile.gender,
    profile.health_conditions || [],
    profile.diet_styles || [],
    profile.activity_level,
    profile.weight_goal_type
  );
  
  const supplementCount = calculateSupplementTarget(
    profile.age,
    profile.gender,
    profile.health_conditions,
    profile.diet_styles
  );
  
  // Get priority micronutrients
  const priorityMicronutrients = getPriorityMicronutrients(
    profile.age,
    profile.gender,
    profile.health_conditions || [],
    profile.diet_styles || []
  );
  
  // Get flagged ingredients
  const flaggedIngredients = getFlaggedIngredients(profile.health_conditions);
  
  return {
    bmr,
    tdee,
    calories,
    protein: macros.protein,
    carbs: macros.carbs,
    fat: macros.fat,
    fiber: macros.fiber,
    hydrationMl,
    supplementCount,
    supplementRecommendations,
    priorityMicronutrients,
    flaggedIngredients,
  };
}
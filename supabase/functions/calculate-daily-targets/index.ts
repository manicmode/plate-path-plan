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
    const { userId, targetDate, testProfile } = await req.json();

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
    console.log('Test profile provided:', testProfile ? 'Yes' : 'No');

    let profile;

    if (testProfile) {
      // Use provided test profile for testing purposes
      profile = testProfile;
      console.log('Using test profile for calculations');
    } else {
      // Get user profile data from database
      const { data: dbProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileError || !dbProfile) {
        console.error('Profile fetch error:', profileError);
        return new Response(
          JSON.stringify({ error: 'User profile not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      profile = dbProfile;
    }

    console.log('Profile data for calculations:', {
      age: profile.age,
      gender: profile.gender,
      weight: profile.weight,
      height_cm: profile.height_cm,
      height_feet: profile.height_feet,
      height_inches: profile.height_inches,
      activity_level: profile.activity_level,
      weight_goal_type: profile.weight_goal_type,
      main_health_goal: profile.main_health_goal,
      health_conditions: profile.health_conditions,
      diet_styles: profile.diet_styles
    });

    // Validate required profile data
    const requiredFields = ['age', 'gender', 'weight', 'activity_level'];
    const missingFields = requiredFields.filter(field => !profile[field]);
    
    if (missingFields.length > 0) {
      console.error(`Missing required profile data: ${missingFields.join(', ')}`);
      return new Response(
        JSON.stringify({ 
          error: `Missing required profile data: ${missingFields.join(', ')}`,
          profile: profile 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate nutrition targets using the same logic as frontend
    const nutritionTargets = calculateNutritionTargets(profile);
    
    console.log('Calculated targets:', nutritionTargets);

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
      sugar: nutritionTargets.sugar,
      sodium: nutritionTargets.sodium,
      saturated_fat: nutritionTargets.saturatedFat,
      hydration_ml: nutritionTargets.hydrationMl,
      supplement_count: nutritionTargets.supplementCount,
      supplement_recommendations: nutritionTargets.supplementRecommendations,
      priority_micronutrients: nutritionTargets.priorityMicronutrients,
      flagged_ingredients: nutritionTargets.flaggedIngredients.map(f => f.ingredient),
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

function getFlaggedIngredients(healthConditions: string[] = []): { ingredient: string; reason: string; severity: 'low' | 'medium' | 'high' }[] {
  const flaggedIngredients: { ingredient: string; reason: string; severity: 'low' | 'medium' | 'high' }[] = [];
  
  const conditionFlags: Record<string, { ingredient: string; reason: string; severity: 'low' | 'medium' | 'high' }[]> = {
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
  }, [] as { ingredient: string; reason: string; severity: 'low' | 'medium' | 'high' }[]);
  
  return uniqueFlags;
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
  
  // Get flagged ingredients with detailed info
  const flaggedIngredients = getFlaggedIngredients(profile.health_conditions);
  
  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    calories: Math.round(calories),
    protein: macros.protein,
    carbs: macros.carbs,
    fat: macros.fat,
    fiber: macros.fiber,
    sugar: Math.round(calories * 0.10 / 4), // 10% of calories as sugar max
    sodium: (profile.health_conditions?.includes('hypertension')) ? 1500 : 2300, // mg
    saturatedFat: Math.round((calories * 0.10) / 9), // 10% of calories as saturated fat max
    hydrationMl,
    supplementCount,
    supplementRecommendations,
    priorityMicronutrients,
    flaggedIngredients,
  };
}
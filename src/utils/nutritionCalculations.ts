// Nutrition calculation utilities for comprehensive onboarding

export interface NutritionTargets {
  bmr: number;
  tdee: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  priorityMicronutrients: string[];
}

export interface EnhancedNutritionTargets extends NutritionTargets {
  hydrationMl: number;
  supplementCount: number;
  flaggedIngredients: string[];
}

// BMR calculation using Mifflin-St Jeor equation
export const calculateBMR = (weight: number, height: number, age: number, gender: string): number => {
  const baseRate = 10 * weight + 6.25 * height - 5 * age;
  return gender === 'male' ? baseRate + 5 : baseRate - 161;
};

// Activity multipliers based on lifestyle and exercise
export const getActivityMultiplier = (
  activityLevel: string,
  dailyLifestyle?: string,
  exerciseFrequency?: string
): number => {
  const baseMultipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    very_active: 1.725,
    extra_active: 1.9
  };

  let multiplier = baseMultipliers[activityLevel as keyof typeof baseMultipliers] || 1.2;

  // Adjust for daily lifestyle
  if (dailyLifestyle === 'very_active_job') multiplier += 0.1;
  if (dailyLifestyle === 'sedentary_job') multiplier -= 0.05;

  // Adjust for exercise frequency
  if (exerciseFrequency === 'daily') multiplier += 0.1;
  if (exerciseFrequency === 'twice_daily') multiplier += 0.2;

  return Math.max(1.2, Math.min(2.0, multiplier));
};

// Calculate calorie target based on goals
export const calculateCalorieTarget = (
  tdee: number,
  weightGoalType: string,
  timeline?: string
): number => {
  const baseCalories = tdee;
  
  switch (weightGoalType) {
    case 'lose_weight':
      // Create moderate deficit
      const deficit = timeline === '3_months' ? 750 : 500;
      return Math.max(1200, baseCalories - deficit);
    
    case 'gain_weight':
      // Create moderate surplus
      const surplus = timeline === '3_months' ? 500 : 300;
      return baseCalories + surplus;
    
    case 'body_recomposition':
      // Slight deficit or maintenance
      return baseCalories - 200;
    
    case 'maintain_weight':
    default:
      return baseCalories;
  }
};

// Calculate macro distribution based on goals and health conditions
export const calculateMacroTargets = (
  calories: number,
  weightGoalType: string,
  healthConditions: string[],
  activityLevel: string
): { protein: number; carbs: number; fat: number; fiber: number } => {
  // Base protein target (higher for muscle building/preservation)
  let proteinPercent = 0.25;
  if (weightGoalType === 'gain_weight' || weightGoalType === 'body_recomposition') {
    proteinPercent = 0.30;
  }
  if (activityLevel === 'very_active') proteinPercent += 0.05;

  // Adjust for health conditions
  let carbPercent = 0.40;
  let fatPercent = 0.35;

  if (healthConditions.includes('diabetes')) {
    carbPercent = 0.30;
    fatPercent = 0.40;
  }
  
  if (healthConditions.includes('pcos')) {
    carbPercent = 0.25;
    fatPercent = 0.45;
  }

  // Ensure percentages add up to 100%
  const total = proteinPercent + carbPercent + fatPercent;
  proteinPercent = proteinPercent / total;
  carbPercent = carbPercent / total;
  fatPercent = fatPercent / total;

  return {
    protein: Math.round((calories * proteinPercent) / 4), // 4 cal/g
    carbs: Math.round((calories * carbPercent) / 4), // 4 cal/g
    fat: Math.round((calories * fatPercent) / 9), // 9 cal/g
    fiber: Math.max(25, Math.round(calories / 1000 * 14)) // 14g per 1000 cal
  };
};

// Calculate hydration target in ml based on weight
export const calculateHydrationTarget = (weight: number, weightUnit: string = 'lb'): number => {
  // Convert weight to pounds if needed
  const weightInPounds = weightUnit === 'kg' ? weight * 2.20462 : weight;
  
  // Formula: weight (lbs) × 0.67 = daily ounces, then convert to ml
  const dailyOunces = weightInPounds * 0.67;
  const dailyMl = Math.round(dailyOunces * 29.5735); // 1 fl oz = 29.5735 ml
  
  return dailyMl;
};

// Calculate supplement recommendations based on health conditions and demographics
export const calculateSupplementTarget = (
  age: number,
  gender: string,
  healthConditions: string[] = [],
  dietStyles: string[] = []
): number => {
  let baseSupplementCount = 1; // Basic multivitamin
  
  // Age-based supplements
  if (age > 50) baseSupplementCount += 1; // Vitamin D, B12
  if (age > 65) baseSupplementCount += 1; // Calcium, additional support
  
  // Gender-based supplements
  if (gender === 'female' && age < 50) baseSupplementCount += 1; // Iron
  if (gender === 'female') baseSupplementCount += 1; // Folate/B9
  
  // Health condition-based supplements
  const conditionSupplements: Record<string, number> = {
    'diabetes': 1, // Chromium, Alpha-lipoic acid
    'hypertension': 1, // Magnesium, CoQ10
    'heart_disease': 2, // Omega-3, CoQ10
    'osteoporosis': 2, // Calcium, Vitamin D
    'anemia': 1, // Iron
    'thyroid_disorders': 1, // Selenium, Iodine
    'depression': 1, // Omega-3, Vitamin D
    'anxiety': 1, // Magnesium, B-complex
  };
  
  healthConditions.forEach(condition => {
    if (conditionSupplements[condition]) {
      baseSupplementCount += conditionSupplements[condition];
    }
  });
  
  // Diet-based supplements
  const dietSupplements: Record<string, number> = {
    'vegan': 2, // B12, Iron
    'vegetarian': 1, // B12
    'keto': 1, // Electrolytes
    'paleo': 1, // Vitamin D
  };
  
  dietStyles.forEach(diet => {
    if (dietSupplements[diet]) {
      baseSupplementCount += dietSupplements[diet];
    }
  });
  
  return Math.min(baseSupplementCount, 8); // Cap at 8 supplements
};

// Get flagged ingredients based on health conditions
export const getFlaggedIngredients = (healthConditions: string[] = []): string[] => {
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
  
  return [...new Set(flaggedIngredients)]; // Remove duplicates
};

// Determine priority micronutrients based on profile
export const getPriorityMicronutrients = (
  age: number,
  gender: string,
  healthConditions: string[],
  dietStyles: string[]
): string[] => {
  const micronutrients: string[] = [];
  
  // Base micronutrients for everyone
  micronutrients.push('Vitamin D', 'Vitamin B12', 'Omega-3');
  
  // Age-based micronutrients
  if (age > 50) {
    micronutrients.push('Calcium', 'Vitamin B6');
  }
  if (age > 65) {
    micronutrients.push('Vitamin K', 'Magnesium');
  }
  
  // Gender-based micronutrients
  if (gender === 'female') {
    if (age < 50) {
      micronutrients.push('Iron', 'Folate');
    } else {
      micronutrients.push('Calcium', 'Vitamin K');
    }
  }
  
  // Health condition-based micronutrients
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
  
  // Diet-based micronutrients
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
  
  // Remove duplicates and limit to top 8
  return [...new Set(micronutrients)].slice(0, 8);
};

// Calculate complete nutrition targets including hydration and supplements
export const calculateNutritionTargets = (profileData: {
  age: number;
  gender: string;
  weight: number;
  height_cm?: number;
  height_feet?: number;
  height_inches?: number;
  activityLevel: string;
  weightGoalType?: string;
  timeline?: string;
  healthConditions?: string[];
  dietStyles?: string[];
  dailyLifestyle?: string;
  exerciseFrequency?: string;
  weightUnit?: string;
}): EnhancedNutritionTargets => {
  // Calculate height in cm
  let heightCm = profileData.height_cm || 0;
  if (!heightCm && profileData.height_feet && profileData.height_inches) {
    heightCm = (profileData.height_feet * 12 + profileData.height_inches) * 2.54;
  }
  
  // Calculate BMR and TDEE
  const bmr = calculateBMR(profileData.weight, heightCm, profileData.age, profileData.gender);
  const activityMultiplier = getActivityMultiplier(
    profileData.activityLevel,
    profileData.dailyLifestyle,
    profileData.exerciseFrequency
  );
  const tdee = bmr * activityMultiplier;
  
  // Calculate calorie target
  const calories = calculateCalorieTarget(tdee, profileData.weightGoalType || 'maintain', profileData.timeline);
  
  // Calculate macro targets
  const macros = calculateMacroTargets(
    calories,
    profileData.weightGoalType || 'maintain',
    profileData.healthConditions || [],
    profileData.activityLevel
  );
  
  // Calculate hydration target
  const hydrationMl = calculateHydrationTarget(profileData.weight, profileData.weightUnit);
  
  // Calculate supplement target
  const supplementCount = calculateSupplementTarget(
    profileData.age,
    profileData.gender,
    profileData.healthConditions,
    profileData.dietStyles
  );
  
  // Get priority micronutrients
  const priorityMicronutrients = getPriorityMicronutrients(
    profileData.age,
    profileData.gender,
    profileData.healthConditions || [],
    profileData.dietStyles || []
  );
  
  // Get flagged ingredients
  const flaggedIngredients = getFlaggedIngredients(profileData.healthConditions);
  
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
    priorityMicronutrients,
    flaggedIngredients,
  };
};
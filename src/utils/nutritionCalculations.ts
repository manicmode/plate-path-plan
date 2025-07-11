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

// Determine priority micronutrients based on profile
export const getPriorityMicronutrients = (
  age: number,
  gender: string,
  healthConditions: string[],
  dietStyles: string[]
): string[] => {
  const priorities: string[] = [];

  // Age-based priorities
  if (age > 50) {
    priorities.push('vitamin_b12', 'vitamin_d', 'calcium');
  }
  if (age > 65) {
    priorities.push('vitamin_b6', 'folate');
  }

  // Gender-based priorities
  if (gender === 'female') {
    priorities.push('iron', 'folate', 'calcium');
  }

  // Health condition priorities
  if (healthConditions.includes('inflammation')) {
    priorities.push('omega_3', 'vitamin_c', 'vitamin_e');
  }
  if (healthConditions.includes('diabetes')) {
    priorities.push('chromium', 'magnesium', 'alpha_lipoic_acid');
  }
  if (healthConditions.includes('digestive_issues')) {
    priorities.push('fiber', 'probiotics', 'vitamin_d');
  }

  // Diet-based priorities
  if (dietStyles.includes('vegan')) {
    priorities.push('vitamin_b12', 'iron', 'vitamin_d', 'omega_3');
  }
  if (dietStyles.includes('keto')) {
    priorities.push('electrolytes', 'magnesium', 'potassium');
  }

  return [...new Set(priorities)]; // Remove duplicates
};

// Calculate complete nutrition targets
export const calculateNutritionTargets = (profileData: {
  weight: number;
  height: number;
  age: number;
  gender: string;
  activityLevel: string;
  weightGoalType?: string;
  weightGoalTimeline?: string;
  healthConditions: string[];
  dietStyles: string[];
  dailyLifestyle?: string;
  exerciseFrequency?: string;
}): NutritionTargets => {
  const bmr = calculateBMR(profileData.weight, profileData.height, profileData.age, profileData.gender);
  const activityMultiplier = getActivityMultiplier(
    profileData.activityLevel,
    profileData.dailyLifestyle,
    profileData.exerciseFrequency
  );
  const tdee = bmr * activityMultiplier;
  
  const calories = calculateCalorieTarget(
    tdee,
    profileData.weightGoalType || 'maintain_weight',
    profileData.weightGoalTimeline
  );
  
  const macros = calculateMacroTargets(
    calories,
    profileData.weightGoalType || 'maintain_weight',
    profileData.healthConditions,
    profileData.activityLevel
  );
  
  const priorityMicronutrients = getPriorityMicronutrients(
    profileData.age,
    profileData.gender,
    profileData.healthConditions,
    profileData.dietStyles
  );

  return {
    bmr,
    tdee,
    calories,
    ...macros,
    priorityMicronutrients
  };
};
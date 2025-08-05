// Micronutrient calculation utilities
interface FoodMicronutrients {
  iron: number;
  magnesium: number;
  calcium: number;
  zinc: number;
  vitaminA: number;
  vitaminB12: number;
  vitaminC: number;
  vitaminD: number;
}

interface FoodItem {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
}

// Comprehensive micronutrient database for common foods
const FOOD_MICRONUTRIENT_DB: { [key: string]: Partial<FoodMicronutrients> } = {
  // Proteins
  'chicken breast': { iron: 1.5, magnesium: 25, calcium: 15, zinc: 1.8, vitaminB12: 0.8, vitaminA: 12 },
  'salmon': { iron: 1.2, magnesium: 29, calcium: 59, zinc: 0.6, vitaminB12: 4.9, vitaminD: 11, vitaminA: 58 },
  'beef': { iron: 2.9, magnesium: 21, calcium: 18, zinc: 4.8, vitaminB12: 2.6, vitaminA: 7 },
  'eggs': { iron: 1.8, magnesium: 12, calcium: 56, zinc: 1.3, vitaminB12: 0.9, vitaminA: 140, vitaminD: 2 },
  'tuna': { iron: 1.3, magnesium: 30, calcium: 38, zinc: 0.8, vitaminB12: 2.5, vitaminA: 16 },
  'turkey': { iron: 1.4, magnesium: 24, calcium: 20, zinc: 2.1, vitaminB12: 1.1, vitaminA: 5 },
  'greek yogurt': { calcium: 150, vitaminB12: 1.2, zinc: 0.9, magnesium: 17 },
  'cheese': { calcium: 200, vitaminB12: 0.8, zinc: 3.1, vitaminA: 75 },
  
  // Vegetables
  'spinach': { iron: 2.7, magnesium: 79, calcium: 99, vitaminA: 469, vitaminC: 28 },
  'broccoli': { iron: 0.7, magnesium: 21, calcium: 47, vitaminC: 89, vitaminA: 31 },
  'kale': { iron: 1.5, magnesium: 34, calcium: 150, vitaminA: 885, vitaminC: 120 },
  'carrots': { iron: 0.3, magnesium: 12, calcium: 33, vitaminA: 835, vitaminC: 6 },
  'sweet potato': { iron: 0.6, magnesium: 25, calcium: 30, vitaminA: 709, vitaminC: 2 },
  'tomato': { iron: 0.3, magnesium: 11, calcium: 10, vitaminA: 42, vitaminC: 14 },
  'bell pepper': { iron: 0.4, magnesium: 12, calcium: 7, vitaminA: 157, vitaminC: 127 },
  
  // Fruits
  'orange': { iron: 0.1, magnesium: 10, calcium: 40, vitaminC: 53, vitaminA: 11 },
  'banana': { iron: 0.3, magnesium: 27, calcium: 5, vitaminC: 9, vitaminA: 3 },
  'apple': { iron: 0.1, magnesium: 5, calcium: 6, vitaminC: 5, vitaminA: 3 },
  'strawberries': { iron: 0.4, magnesium: 13, calcium: 16, vitaminC: 59, vitaminA: 1 },
  'blueberries': { iron: 0.3, magnesium: 6, calcium: 6, vitaminC: 10, vitaminA: 3 },
  
  // Grains & Legumes
  'oatmeal': { iron: 1.7, magnesium: 63, calcium: 23, zinc: 1.5 },
  'quinoa': { iron: 1.5, magnesium: 64, calcium: 17, zinc: 1.1 },
  'brown rice': { iron: 0.8, magnesium: 43, calcium: 10, zinc: 1.2 },
  'lentils': { iron: 3.3, magnesium: 36, calcium: 19, zinc: 1.3 },
  'chickpeas': { iron: 2.9, magnesium: 48, calcium: 49, zinc: 1.5 },
  'black beans': { iron: 1.8, magnesium: 60, calcium: 23, zinc: 0.9 },
  
  // Nuts & Seeds
  'almonds': { iron: 3.7, magnesium: 270, calcium: 269, zinc: 3.1 },
  'walnuts': { iron: 2.9, magnesium: 158, calcium: 98, zinc: 3.1 },
  'pumpkin seeds': { iron: 8.8, magnesium: 592, calcium: 46, zinc: 7.8 },
  'chia seeds': { iron: 7.7, magnesium: 335, calcium: 631, zinc: 4.6 },
  'sunflower seeds': { iron: 5.2, magnesium: 325, calcium: 78, zinc: 5.0 },
  
  // Dairy
  'milk': { calcium: 113, vitaminB12: 0.5, vitaminA: 46, vitaminD: 1.2 },
  'yogurt': { calcium: 110, vitaminB12: 0.5, zinc: 0.6, magnesium: 12 },
  
  // Seafood
  'sardines': { iron: 2.9, magnesium: 39, calcium: 382, zinc: 1.3, vitaminB12: 8.9, vitaminD: 4.8 },
  'mackerel': { iron: 1.6, magnesium: 97, calcium: 66, zinc: 0.9, vitaminB12: 19, vitaminD: 16 },
};

// Fuzzy matching for food names
function findBestFoodMatch(foodName: string): string | null {
  const normalizedInput = foodName.toLowerCase().trim();
  
  // Direct match
  if (FOOD_MICRONUTRIENT_DB[normalizedInput]) {
    return normalizedInput;
  }
  
  // Partial matches
  for (const dbFood of Object.keys(FOOD_MICRONUTRIENT_DB)) {
    if (normalizedInput.includes(dbFood) || dbFood.includes(normalizedInput)) {
      return dbFood;
    }
  }
  
  // Word-based matching
  const inputWords = normalizedInput.split(/\s+/);
  for (const dbFood of Object.keys(FOOD_MICRONUTRIENT_DB)) {
    const dbWords = dbFood.split(/\s+/);
    if (inputWords.some(word => dbWords.some(dbWord => 
      word === dbWord || word.includes(dbWord) || dbWord.includes(word)
    ))) {
      return dbFood;
    }
  }
  
  return null;
}

// Calculate micronutrients for a single food item
export function calculateFoodMicronutrients(food: FoodItem): FoodMicronutrients {
  const bestMatch = findBestFoodMatch(food.name);
  
  if (!bestMatch) {
    // Return estimated values based on macros when no direct match
    return estimateMicronutrientsFromMacros(food);
  }
  
  const baseMicronutrients = FOOD_MICRONUTRIENT_DB[bestMatch];
  const scalingFactor = food.calories / 100; // Scale based on calories (assuming DB values are per 100g)
  
  return {
    iron: (baseMicronutrients.iron || 0) * scalingFactor,
    magnesium: (baseMicronutrients.magnesium || 0) * scalingFactor,
    calcium: (baseMicronutrients.calcium || 0) * scalingFactor,
    zinc: (baseMicronutrients.zinc || 0) * scalingFactor,
    vitaminA: (baseMicronutrients.vitaminA || 0) * scalingFactor,
    vitaminB12: (baseMicronutrients.vitaminB12 || 0) * scalingFactor,
    vitaminC: (baseMicronutrients.vitaminC || 0) * scalingFactor,
    vitaminD: (baseMicronutrients.vitaminD || 0) * scalingFactor,
  };
}

// Estimate micronutrients from macronutrients when no specific data is available
function estimateMicronutrientsFromMacros(food: FoodItem): FoodMicronutrients {
  const { calories, protein, carbs, fat, fiber } = food;
  
  // Rough estimations based on food macros
  const proteinRatio = protein / calories;
  const carbRatio = carbs / calories;
  const fatRatio = fat / calories;
  const fiberRatio = fiber / calories;
  
  return {
    iron: Math.max(0, (protein * 0.15 + fiber * 0.3) * (calories / 100)),
    magnesium: Math.max(0, (fiber * 8 + protein * 2) * (calories / 100)),
    calcium: Math.max(0, (protein * 5 + carbs * 0.5) * (calories / 100)),
    zinc: Math.max(0, (protein * 0.08 + fat * 0.02) * (calories / 100)),
    vitaminA: Math.max(0, (carbRatio > 0.4 ? carbs * 2 : protein * 1) * (calories / 100)),
    vitaminB12: Math.max(0, protein * 0.02 * (calories / 100)),
    vitaminC: Math.max(0, (carbRatio > 0.6 ? carbs * 0.8 : 0) * (calories / 100)),
    vitaminD: Math.max(0, (fat * 0.05 + protein * 0.02) * (calories / 100)),
  };
}

// Calculate total micronutrients for an array of foods
export function calculateTotalMicronutrients(foods: FoodItem[]): FoodMicronutrients {
  // Add type guard to prevent reduce crashes
  if (!Array.isArray(foods)) {
    console.warn('🚨 Foods data is not an array in micronutrient calculation:', foods);
    return {
      iron: 0,
      magnesium: 0,
      calcium: 0,
      zinc: 0,
      vitaminA: 0,
      vitaminB12: 0,
      vitaminC: 0,
      vitaminD: 0,
    };
  }

  return foods.reduce((totals, food) => {
    const foodMicros = calculateFoodMicronutrients(food);
    return {
      iron: totals.iron + foodMicros.iron,
      magnesium: totals.magnesium + foodMicros.magnesium,
      calcium: totals.calcium + foodMicros.calcium,
      zinc: totals.zinc + foodMicros.zinc,
      vitaminA: totals.vitaminA + foodMicros.vitaminA,
      vitaminB12: totals.vitaminB12 + foodMicros.vitaminB12,
      vitaminC: totals.vitaminC + foodMicros.vitaminC,
      vitaminD: totals.vitaminD + foodMicros.vitaminD,
    };
  }, {
    iron: 0,
    magnesium: 0,
    calcium: 0,
    zinc: 0,
    vitaminA: 0,
    vitaminB12: 0,
    vitaminC: 0,
    vitaminD: 0,
  });
}

export type { FoodMicronutrients };
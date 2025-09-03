/**
 * Health Report Generation
 * Generates comprehensive health analysis from detected food items
 */
import { ReviewItem } from '@/components/camera/ReviewItemsScreen';

export interface HealthReportData {
  overallScore: number;
  totalCalories: number;
  macroBalance: {
    protein: number;
    carbs: number;
    fat: number;
  };
  flags: Array<{
    type: 'warning' | 'info' | 'positive';
    message: string;
    severity: 'low' | 'medium' | 'high';
  }>;
  itemAnalysis: Array<{
    name: string;
    score: number;
    calories: number;
    healthRating: 'excellent' | 'good' | 'fair' | 'poor';
    benefits: string[];
    concerns: string[];
  }>;
  recommendations: string[];
}

// Basic nutrition database for common foods (calories per 100g)
const NUTRITION_DB: Record<string, {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  score: number;
  benefits: string[];
  concerns: string[];
}> = {
  salmon: {
    calories: 208, protein: 22, carbs: 0, fat: 13, score: 85,
    benefits: ['High in omega-3 fatty acids', 'Excellent protein source', 'Rich in B vitamins'],
    concerns: ['May contain mercury', 'High in calories if large portion']
  },
  chicken: {
    calories: 165, protein: 25, carbs: 0, fat: 7, score: 80,
    benefits: ['Lean protein source', 'Low in saturated fat', 'Good source of niacin'],
    concerns: ['Quality depends on preparation method']
  },
  broccoli: {
    calories: 34, protein: 3, carbs: 7, fat: 0, score: 95,
    benefits: ['High in vitamin C', 'Rich in fiber', 'Contains antioxidants'],
    concerns: []
  },
  rice: {
    calories: 130, protein: 3, carbs: 28, fat: 0, score: 65,
    benefits: ['Good energy source', 'Gluten-free', 'Easy to digest'],
    concerns: ['High glycemic index', 'Low in essential nutrients']
  },
  avocado: {
    calories: 160, protein: 2, carbs: 9, fat: 15, score: 90,
    benefits: ['Healthy monounsaturated fats', 'High in fiber', 'Rich in potassium'],
    concerns: ['High in calories', 'May cause digestive issues for some']
  },
  pizza: {
    calories: 266, protein: 11, carbs: 33, fat: 10, score: 35,
    benefits: ['Contains some protein', 'May include vegetables'],
    concerns: ['High in refined carbs', 'Often high in sodium', 'Processed ingredients']
  },
  // Add more foods as needed
};

// Add a helper to map photo report to nutrition_logs format
export function mapPhotoReportToNutritionLog(report: HealthReportData, items: ReviewItem[]): any {
  // Combine all items into a single meal entry for nutrition_logs
  const combinedName = items.map(item => item.name).join(', ');
  
  return {
    name: combinedName,
    food_name: combinedName,
    calories: report.totalCalories,
    protein: Math.round((report.totalCalories * report.macroBalance.protein) / 400), // 4 cal per gram
    carbs: Math.round((report.totalCalories * report.macroBalance.carbs) / 400), // 4 cal per gram  
    fat: Math.round((report.totalCalories * report.macroBalance.fat) / 900), // 9 cal per gram
    fiber: Math.round(report.totalCalories * 0.02), // rough estimate
    sugar: Math.round(report.totalCalories * 0.05), // rough estimate
    sodium: Math.round(report.totalCalories * 2), // rough estimate mg
    quality_score: report.overallScore,
    quality_verdict: getQualityVerdict(report.overallScore),
    quality_reasons: report.flags.map(flag => flag.message),
    serving_size: `${items.reduce((sum, item) => sum + (item.grams || 100), 0)}g`,
    source: 'photo_health_scan',
    processing_level: 'minimally_processed', // default for whole foods
    ingredient_analysis: {
      items: report.itemAnalysis,
      flags: report.flags,
      recommendations: report.recommendations
    },
    confidence: 85, // Default confidence for photo health scans
    nutritionData: {
      calories: report.totalCalories,
      protein: Math.round((report.totalCalories * report.macroBalance.protein) / 400),
      carbs: Math.round((report.totalCalories * report.macroBalance.carbs) / 400),
      fat: Math.round((report.totalCalories * report.macroBalance.fat) / 900)
    }
  };
}

function getQualityVerdict(score: number): string {
  if (score >= 80) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 50) return 'moderate';
  return 'poor';
}

export async function generateHealthReport(items: ReviewItem[]): Promise<HealthReportData> {
  console.log('[HEALTH_REPORT] Generating report for', items.length, 'items');
  
  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;
  const itemAnalysis = [];
  const flags = [];
  const recommendations = [];

  // Analyze each item using V2 scoring system when available
  for (const item of items) {
    const grams = item.grams || 100;
    const foodKey = item.name.toLowerCase();
    
    // Try to resolve from GenericFoods first
    let nutritionData = null;
    let healthScore = 60; // Default fallback score
    
    try {
      const { resolveGenericFood } = await import('@/health/generic/resolveGenericFood');
      const genericFood = resolveGenericFood(item.name);
      
      if (genericFood) {
        // Use GenericFoods data and V2 scoring
        const { scoreFood } = await import('@/health/scoring');
        
        // Build ScoreContext for V2 scoring
        const scoreContext = {
          name: item.name,
          source: 'photo_item' as const,
          genericSlug: genericFood.slug,
          nutrients: {
            calories: genericFood.nutrients.calories,
            protein_g: genericFood.nutrients.protein_g,
            carbs_g: genericFood.nutrients.carbs_g,
            fat_g: genericFood.nutrients.fat_g,
            fiber_g: genericFood.nutrients.fiber_g,
            sodium_mg: genericFood.nutrients.sodium_mg,
            sugars_g: null, // GenericFoods don't have sugar data yet
            satfat_g: null
          }
        };
        
        // Get V2 score (0-10 scale)
        healthScore = scoreFood(scoreContext);
        
        // Convert to 0-100 for consistency with existing logic
        const score100 = healthScore * 10;
        
        console.info('[HEALTH][REPORT][V2_SCORE]', { 
          name: item.name, 
          genericSlug: genericFood.slug,
          score10: healthScore,
          score100 
        });
        
        nutritionData = {
          calories: genericFood.nutrients.calories || 100,
          protein: genericFood.nutrients.protein_g || 5,
          carbs: genericFood.nutrients.carbs_g || 15,
          fat: genericFood.nutrients.fat_g || 3,
          score: score100,
          benefits: score100 >= 85 ? ['Excellent nutritional choice', 'High in beneficial nutrients'] :
                   score100 >= 70 ? ['Good nutritional value', 'Provides essential nutrients'] :
                   ['Provides energy'],
          concerns: score100 < 50 ? ['Low nutritional value', 'Consider healthier alternatives'] : []
        };
      }
    } catch (error) {
      console.warn('[HEALTH][REPORT][GENERIC_FALLBACK]', { name: item.name, error: error.message });
    }
    
    // Fallback to NUTRITION_DB if GenericFoods resolution failed
    if (!nutritionData) {
      let staticData = NUTRITION_DB[foodKey];
      if (!staticData) {
        // Try partial matching
        const partialMatch = Object.keys(NUTRITION_DB).find(key => 
          foodKey.includes(key) || key.includes(foodKey)
        );
        if (partialMatch) {
          staticData = NUTRITION_DB[partialMatch];
        }
      }
      
      // Use defaults if no match found
      if (!staticData) {
        staticData = {
          calories: 100, protein: 5, carbs: 15, fat: 3, score: 60,
          benefits: ['Provides energy'],
          concerns: ['Nutritional data not available']
        };
      }
      
      nutritionData = staticData;
      healthScore = staticData.score / 10; // Convert to 0-10 scale
    }

    // Scale nutrition to actual portion
    const scaledCalories = Math.round((nutritionData.calories * grams) / 100);
    const scaledProtein = Math.round((nutritionData.protein * grams) / 100);
    const scaledCarbs = Math.round((nutritionData.carbs * grams) / 100);
    const scaledFat = Math.round((nutritionData.fat * grams) / 100);

    totalCalories += scaledCalories;
    totalProtein += scaledProtein;
    totalCarbs += scaledCarbs;
    totalFat += scaledFat;

    // Determine health rating based on score
    let healthRating: 'excellent' | 'good' | 'fair' | 'poor';
    if (nutritionData.score >= 85) healthRating = 'excellent';
    else if (nutritionData.score >= 70) healthRating = 'good';
    else if (nutritionData.score >= 50) healthRating = 'fair';
    else healthRating = 'poor';

    itemAnalysis.push({
      name: item.name,
      score: nutritionData.score,
      calories: scaledCalories,
      healthRating,
      benefits: nutritionData.benefits,
      concerns: nutritionData.concerns
    });

    // Generate flags based on item analysis
    if (scaledCalories > 400) {
      flags.push({
        type: 'warning' as const,
        message: `${item.name} is high in calories (${scaledCalories} cal)`,
        severity: 'medium' as const
      });
    }

    if (nutritionData.score < 40) {
      flags.push({
        type: 'warning' as const,
        message: `${item.name} has low nutritional value`,
        severity: 'high' as const
      });
    }

    if (nutritionData.score >= 85) {
      flags.push({
        type: 'positive' as const,
        message: `${item.name} is an excellent nutritional choice`,
        severity: 'low' as const
      });
    }
  }

  // Calculate overall score
  const averageItemScore = itemAnalysis.reduce((sum, item) => sum + item.score, 0) / itemAnalysis.length;
  let overallScore = averageItemScore;

  // Adjust score based on total calories and balance
  if (totalCalories > 800) overallScore -= 10;
  if (totalCalories < 200) overallScore -= 5;

  // Check macro balance
  const totalMacros = totalProtein + totalCarbs + totalFat;
  const proteinPercent = totalMacros > 0 ? (totalProtein / totalMacros) * 100 : 0;
  const carbPercent = totalMacros > 0 ? (totalCarbs / totalMacros) * 100 : 0;
  const fatPercent = totalMacros > 0 ? (totalFat / totalMacros) * 100 : 0;

  // Generate recommendations
  if (proteinPercent < 15) {
    recommendations.push('Consider adding more protein sources like lean meat, fish, or legumes');
  }
  if (carbPercent > 65) {
    recommendations.push('Try to balance with more protein and healthy fats');
  }
  if (totalCalories > 600) {
    recommendations.push('Consider portion control to manage calorie intake');
  }
  if (itemAnalysis.some(item => item.healthRating === 'excellent')) {
    recommendations.push('Great choice including nutrient-dense foods!');
  }
  if (itemAnalysis.length === 1) {
    recommendations.push('Consider adding variety with vegetables or fruits');
  }

  // Additional flags based on overall meal
  if (totalCalories > 1000) {
    flags.push({
      type: 'warning',
      message: 'High calorie meal - consider portion sizes',
      severity: 'high'
    });
  }

  if (proteinPercent < 10) {
    flags.push({
      type: 'info',
      message: 'Low protein content - consider adding protein sources',
      severity: 'medium'
    });
  }

  const result: HealthReportData = {
    overallScore: Math.max(0, Math.min(100, Math.round(overallScore))),
    totalCalories,
    macroBalance: {
      protein: Math.round(proteinPercent),
      carbs: Math.round(carbPercent),
      fat: Math.round(fatPercent)
    },
    flags,
    itemAnalysis,
    recommendations
  };

  console.log('[HEALTH_REPORT] Generated report:', result);
  return result;
}
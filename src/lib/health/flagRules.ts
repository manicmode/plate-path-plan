/**
 * Deterministic flag rules for ingredient and nutrition analysis
 * Each rule returns a flag object if conditions are met
 */

export interface HealthFlag {
  key: string;
  label: string;
  severity: 'good' | 'warning' | 'danger';
  description?: string;
}

export interface NutritionThresholds {
  sodium_mg_100g?: number;
  sugar_g_100g?: number;
  satfat_g_100g?: number;
  fiber_g_100g?: number;
  protein_g_100g?: number;
}

/**
 * Ingredient-based flag rules
 */
export const INGREDIENT_RULES = [
  {
    key: 'artificial_sweeteners',
    test: (text: string) => /aspartame|sucralose|acesulfame|saccharin|neotame|advantame/i.test(text),
    flag: {
      key: 'artificial_sweeteners',
      label: 'Contains artificial sweeteners',
      severity: 'warning' as const,
      description: 'Contains synthetic sugar substitutes'
    }
  },
  {
    key: 'artificial_colors',
    test: (text: string) => /red.*40|yellow.*5|yellow.*6|blue.*1|fd&c|artificial.*color/i.test(text),
    flag: {
      key: 'artificial_colors', 
      label: 'Contains artificial colors',
      severity: 'warning' as const,
      description: 'Contains synthetic food coloring'
    }
  },
  {
    key: 'preservatives',
    test: (text: string) => /sodium benzoate|potassium sorbate|bht|bha|tbhq|sodium nitrite/i.test(text),
    flag: {
      key: 'preservatives',
      label: 'Contains preservatives',
      severity: 'warning' as const,
      description: 'Contains chemical preservatives'
    }
  },
  {
    key: 'high_fructose_corn_syrup',
    test: (text: string) => /high fructose corn syrup|hfcs/i.test(text),
    flag: {
      key: 'high_fructose_corn_syrup',
      label: 'Contains high fructose corn syrup',
      severity: 'danger' as const,
      description: 'Contains processed corn syrup linked to health concerns'
    }
  },
  {
    key: 'msg',
    test: (text: string) => /monosodium glutamate|msg\b/i.test(text),
    flag: {
      key: 'msg',
      label: 'Contains MSG',
      severity: 'warning' as const,
      description: 'Contains monosodium glutamate flavor enhancer'
    }
  },
  {
    key: 'trans_fats',
    test: (text: string) => /partially hydrogenated|trans fat/i.test(text),
    flag: {
      key: 'trans_fats',
      label: 'Contains trans fats',
      severity: 'danger' as const,
      description: 'Contains harmful trans fatty acids'
    }
  }
];

/**
 * Nutrition-based flag rules with thresholds per 100g
 */
export const NUTRITION_RULES = [
  {
    key: 'high_sodium',
    test: (nutrition: NutritionThresholds) => (nutrition.sodium_mg_100g || 0) >= 600,
    flag: {
      key: 'high_sodium',
      label: 'High in sodium',
      severity: 'warning' as const,
      description: 'Contains high levels of sodium (≥600mg per 100g)'
    }
  },
  {
    key: 'very_high_sodium',
    test: (nutrition: NutritionThresholds) => (nutrition.sodium_mg_100g || 0) >= 1500,
    flag: {
      key: 'very_high_sodium', 
      label: 'Very high in sodium',
      severity: 'danger' as const,
      description: 'Contains very high levels of sodium (≥1500mg per 100g)'
    }
  },
  {
    key: 'high_sugar',
    test: (nutrition: NutritionThresholds) => (nutrition.sugar_g_100g || 0) >= 22.5,
    flag: {
      key: 'high_sugar',
      label: 'High in sugar',
      severity: 'warning' as const, 
      description: 'Contains high levels of sugar (≥22.5g per 100g)'
    }
  },
  {
    key: 'high_saturated_fat',
    test: (nutrition: NutritionThresholds) => (nutrition.satfat_g_100g || 0) >= 5,
    flag: {
      key: 'high_saturated_fat',
      label: 'High in saturated fat',
      severity: 'warning' as const,
      description: 'Contains high levels of saturated fat (≥5g per 100g)'
    }
  },
  {
    key: 'high_fiber',
    test: (nutrition: NutritionThresholds) => (nutrition.fiber_g_100g || 0) >= 6,
    flag: {
      key: 'high_fiber',
      label: 'High in fiber',
      severity: 'good' as const,
      description: 'Good source of dietary fiber (≥6g per 100g)'
    }
  },
  {
    key: 'high_protein',
    test: (nutrition: NutritionThresholds) => (nutrition.protein_g_100g || 0) >= 12,
    flag: {
      key: 'high_protein',
      label: 'High in protein', 
      severity: 'good' as const,
      description: 'Good source of protein (≥12g per 100g)'
    }
  }
];
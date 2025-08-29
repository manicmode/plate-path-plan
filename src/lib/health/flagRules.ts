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
 * Ingredient-based flag rules with US FD&C color names
 */
export const INGREDIENT_RULES = [
  {
    key: 'aspartame',
    test: (text: string) => /\b(aspartame|e951)\b/i.test(text),
    flag: {
      key: 'aspartame',
      label: 'Artificial sweetener (Aspartame)',
      severity: 'danger' as const,
      description: 'Contains aspartame artificial sweetener'
    }
  },
  {
    key: 'acesulfame_k',
    test: (text: string) => /\b(acesulfame[-\s]?k|e950)\b/i.test(text),
    flag: {
      key: 'acesulfame_k',
      label: 'Artificial sweetener (Acesulfame K)',
      severity: 'warning' as const,
      description: 'Contains acesulfame K artificial sweetener'
    }
  },
  {
    key: 'sucralose',
    test: (text: string) => /\b(sucralose|splenda|e955)\b/i.test(text),
    flag: {
      key: 'sucralose',
      label: 'Artificial sweetener (Sucralose)',
      severity: 'warning' as const,
      description: 'Contains sucralose artificial sweetener'
    }
  },
  {
    key: 'saccharin',
    test: (text: string) => /\b(saccharin|e954)\b/i.test(text),
    flag: {
      key: 'saccharin',
      label: 'Artificial sweetener (Saccharin)',
      severity: 'warning' as const,
      description: 'Contains saccharin artificial sweetener'
    }
  },
  {
    key: 'nitrites',
    test: (text: string) => /\b(sodium nitrite|potassium nitrite|sodium nitrate|potassium nitrate|e249|e250|e251|e252)\b/i.test(text),
    flag: {
      key: 'nitrites',
      label: 'Nitrites/nitrates',
      severity: 'danger' as const,
      description: 'Contains nitrites or nitrates'
    }
  },
  {
    key: 'artificial_colors',
    test: (text: string) => /\b(e10[2-5]|tartrazine|sunset yellow|azorubine|ponceau 4r|allura red|red\s*40|yellow\s*5|yellow\s*6|blue\s*1|fd&c\s*(red|yellow|blue)\s*\d+)\b/i.test(text),
    flag: {
      key: 'artificial_colors',
      label: 'Artificial colors',
      severity: 'warning' as const,
      description: 'Contains artificial food coloring'
    }
  },
  {
    key: 'trans_fats',
    test: (text: string) => /\b(partially hydrogenated)\b/i.test(text),
    flag: {
      key: 'trans_fats',
      label: 'Trans fats',
      severity: 'danger' as const,
      description: 'Contains harmful trans fatty acids'
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
  }
];

/**
 * Nutrition-based flag rules with thresholds per 100g
 */
export const NUTRITION_RULES = [
  {
    key: 'high_sugar',
    test: (nutrition: NutritionThresholds) => (nutrition.sugar_g_100g || 0) >= 22.5,
    flag: {
      key: 'high_sugar',
      label: 'Sugar ≥22.5 g/100g',
      severity: 'warning' as const, 
      description: 'Contains high levels of sugar (≥22.5g per 100g)'
    }
  },
  {
    key: 'high_saturated_fat',
    test: (nutrition: NutritionThresholds) => (nutrition.satfat_g_100g || 0) >= 5,
    flag: {
      key: 'high_saturated_fat',
      label: 'Sat fat ≥5 g/100g',
      severity: 'warning' as const,
      description: 'Contains high levels of saturated fat (≥5g per 100g)'
    }
  },
  {
    key: 'high_sodium',
    test: (nutrition: NutritionThresholds) => (nutrition.sodium_mg_100g || 0) >= 600,
    flag: {
      key: 'high_sodium',
      label: 'Sodium ≥600 mg/100g',
      severity: 'danger' as const,
      description: 'Contains high levels of sodium (≥600mg per 100g)'
    }
  },
  {
    key: 'very_high_sodium',
    test: (nutrition: NutritionThresholds) => (nutrition.sodium_mg_100g || 0) >= 1500,
    flag: {
      key: 'very_high_sodium', 
      label: 'Sodium ≥1500 mg/100g',
      severity: 'danger' as const,
      description: 'Contains very high levels of sodium (≥1500mg per 100g)'
    }
  },
  {
    key: 'low_fiber',
    test: (nutrition: NutritionThresholds) => (nutrition.fiber_g_100g || 0) <= 2,
    flag: {
      key: 'low_fiber',
      label: 'Low fiber ≤2 g/100g',
      severity: 'warning' as const,
      description: 'Low in dietary fiber (≤2g per 100g)'
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
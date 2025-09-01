/**
 * Photo Flow V2 Utilities
 * Enhanced portion handling, nutrition scaling, and scoring functions
 */

export interface NormalizedResponse {
  text: string;
  labels: string[];
  portion: string | null;
  servings: number | null;
  imageUrl?: string;
}

export interface ServingNutrition {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  [key: string]: number;
}

/**
 * Normalize OCR response to standard format
 */
export function normalizeOcrResponse(response: any): NormalizedResponse {
  const text = response?.summary?.text_joined || response?.text || '';
  const labels = response?.labels || [];
  const portion = extractPortion(response) || null;
  const servings = extractServings(response) || null;
  const imageUrl = response?.imageUrl || response?.image_url || undefined;

  return {
    text,
    labels,
    portion,
    servings,
    imageUrl
  };
}

/**
 * Extract portion information from OCR response
 */
export function extractPortion(response: any): string | null {
  // Look for portion indicators in text
  const text = response?.summary?.text_joined || response?.text || '';
  
  // Pattern matches: "30g", "1 serving", "240ml", etc.
  const portionMatch = text.match(/(\d+(?:\.\d+)?)\s*(g|ml|oz|cup|serving|portion|piece)/i);
  if (portionMatch) {
    return `${portionMatch[1]}${portionMatch[2].toLowerCase()}`;
  }
  
  return null;
}

/**
 * Extract servings information from OCR response
 */
export function extractServings(response: any): number | null {
  const text = response?.summary?.text_joined || response?.text || '';
  
  // Look for "servings per container" or similar
  const servingsMatch = text.match(/servings?\s+per\s+container[:\s]*(\d+)/i) ||
                       text.match(/(\d+)\s+servings?/i);
  
  if (servingsMatch) {
    const num = parseInt(servingsMatch[1], 10);
    return isFinite(num) && num > 0 ? num : null;
  }
  
  return null;
}

/**
 * Scale nutrition data to serving size using toServingNutrition
 */
export function toServingNutrition(per100g: any, servingG: number): ServingNutrition {
  if (!per100g || !servingG || servingG <= 0) {
    return {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      sugar: 0,
      sodium: 0
    };
  }

  const scaleFactor = servingG / 100;
  
  return {
    calories: Math.round((per100g.calories || per100g.energyKcal || 0) * scaleFactor),
    protein: Math.round((per100g.protein || per100g.protein_g || 0) * scaleFactor * 10) / 10,
    carbs: Math.round((per100g.carbs || per100g.carbs_g || 0) * scaleFactor * 10) / 10,
    fat: Math.round((per100g.fat || per100g.fat_g || 0) * scaleFactor * 10) / 10,
    fiber: Math.round((per100g.fiber || per100g.fiber_g || 0) * scaleFactor * 10) / 10,
    sugar: Math.round((per100g.sugar || per100g.sugar_g || 0) * scaleFactor * 10) / 10,
    sodium: Math.round((per100g.sodium || per100g.sodium_mg || 0) * scaleFactor)
  };
}

/**
 * Compute health flags from ingredients and additives
 */
export function computeFlags(ingredientsText: string, additives: string[] = []): Array<{
  key: string;
  label: string;
  severity: 'low' | 'medium' | 'high';
  description?: string;
}> {
  const flags: Array<{
    key: string;
    label: string;
    severity: 'low' | 'medium' | 'high';
    description?: string;
  }> = [];

  if (!ingredientsText) return flags;

  const text = ingredientsText.toLowerCase();

  // High severity flags
  const highSeverityFlags = [
    { pattern: /artificial.*color|fd&c|yellow.*[456]|red.*[34]|blue.*[12]/i, key: 'artificial_colors', label: 'Artificial Colors' },
    { pattern: /trans.*fat|partially.*hydrogenated/i, key: 'trans_fat', label: 'Trans Fat' },
    { pattern: /high.*fructose.*corn.*syrup|hfcs/i, key: 'hfcs', label: 'High Fructose Corn Syrup' }
  ];

  // Medium severity flags
  const mediumSeverityFlags = [
    { pattern: /sodium.*nitrite|sodium.*nitrate/i, key: 'nitrates', label: 'Nitrates/Nitrites' },
    { pattern: /msg|monosodium.*glutamate/i, key: 'msg', label: 'MSG' },
    { pattern: /artificial.*flavor|natural.*flavor/i, key: 'artificial_flavors', label: 'Artificial Flavors' }
  ];

  // Low severity flags
  const lowSeverityFlags = [
    { pattern: /preservative|bht|bha/i, key: 'preservatives', label: 'Preservatives' },
    { pattern: /emulsifier|lecithin/i, key: 'emulsifiers', label: 'Emulsifiers' }
  ];

  // Check high severity
  highSeverityFlags.forEach(({ pattern, key, label }) => {
    if (pattern.test(text)) {
      flags.push({ key, label, severity: 'high' });
    }
  });

  // Check medium severity
  mediumSeverityFlags.forEach(({ pattern, key, label }) => {
    if (pattern.test(text)) {
      flags.push({ key, label, severity: 'medium' });
    }
  });

  // Check low severity
  lowSeverityFlags.forEach(({ pattern, key, label }) => {
    if (pattern.test(text)) {
      flags.push({ key, label, severity: 'low' });
    }
  });

  // Add flags from additives array
  additives.forEach(additive => {
    const key = additive.toLowerCase().replace(/\s+/g, '_');
    flags.push({
      key,
      label: additive,
      severity: 'medium'
    });
  });

  return flags;
}

/**
 * Recalibrated scoring function with bounded penalties
 */
export function computeScore(nutrition: ServingNutrition, flags: any[] = [], ingredientsText = ''): number {
  let score = 50; // Start at neutral

  // Positive factors (scaled by serving)
  const protein = nutrition.protein || 0;
  const fiber = nutrition.fiber || 0;
  
  if (protein > 0) {
    score += Math.min(protein * 2, 20); // Max +20 for protein
  }
  
  if (fiber > 0) {
    score += Math.min(fiber * 3, 15); // Max +15 for fiber
  }

  // Negative factors (scaled by serving, bounded penalties)
  const sugar = nutrition.sugar || 0;
  const sodium = nutrition.sodium || 0;
  const calories = nutrition.calories || 0;

  // Sugar penalty: bounded to max -25 points
  if (sugar > 5) {
    const sugarPenalty = Math.min((sugar - 5) * 1.5, 25);
    score -= sugarPenalty;
  }

  // Sodium penalty: bounded to max -20 points
  if (sodium > 400) {
    const sodiumPenalty = Math.min((sodium - 400) * 0.02, 20);
    score -= sodiumPenalty;
  }

  // High calorie penalty: bounded to max -15 points
  if (calories > 300) {
    const caloriePenalty = Math.min((calories - 300) * 0.03, 15);
    score -= caloriePenalty;
  }

  // Flag penalties (bounded)
  flags.forEach(flag => {
    const severity = flag.severity || 'low';
    switch (severity) {
      case 'high':
        score -= 15; // Max penalty per flag
        break;
      case 'medium':
        score -= 8;
        break;
      case 'low':
        score -= 3;
        break;
    }
  });

  // Processing level penalty based on ingredients
  if (ingredientsText) {
    const ingredientCount = ingredientsText.split(',').length;
    if (ingredientCount > 10) {
      score -= Math.min((ingredientCount - 10) * 0.5, 10); // Max -10 for many ingredients
    }
  }

  // Final clamp to 0-100 range
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Determine portion precedence: OCR → user pref → stated serving → estimate → 30g
 */
export function determinePortionPrecedence(
  ocrPortion: string | null,
  userPreference: string | null,
  statedServing: string | null,
  estimate: string | null
): { portion: string; source: string } {
  // OCR has highest precedence
  if (ocrPortion) {
    return { portion: ocrPortion, source: 'OCR' };
  }
  
  // User preference second
  if (userPreference) {
    return { portion: userPreference, source: 'User' };
  }
  
  // Stated serving third
  if (statedServing) {
    return { portion: statedServing, source: 'Label' };
  }
  
  // Estimate fourth
  if (estimate) {
    return { portion: estimate, source: 'Estimate' };
  }
  
  // Default fallback
  return { portion: '30g', source: 'Default' };
}

/**
 * Parse portion string to grams for calculations
 */
export function parsePortionToGrams(portion: string): number {
  const match = portion.match(/(\d+(?:\.\d+)?)\s*(g|ml|oz|cup)/i);
  if (!match) return 30; // Default fallback
  
  const value = parseFloat(match[1]);
  const unit = match[2].toLowerCase();
  
  switch (unit) {
    case 'g':
    case 'ml': // Treat ml as grams for food
      return value;
    case 'oz':
      return value * 28.35; // 1 oz = 28.35g
    case 'cup':
      return value * 240; // Approximate cup to grams
    default:
      return value;
  }
}
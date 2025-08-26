// Stable schema for both Health Scan and Log flows
export interface NormalizedProduct {
  barcode: string;
  name: string;
  brand?: string;
  imageUrl?: string;

  // Nutrition in plain units per serving (not per 100g)
  nutrition: {
    calories?: number;
    protein_g?: number;
    carbs_g?: number;
    fat_g?: number;
    sugar_g?: number;
    fiber_g?: number;
    sodium_mg?: number;
    serving_size?: string; // e.g., "39 g"
  };

  // Parsed ingredients, already tokenized
  ingredients: string[];             // e.g., ["Sugar", "Corn syrup", "Red 40", ...]
  ingredients_text?: string;         // original string for display
  additives?: string[];              // ["e110", "e129", ...] normalized lower-case
  allergens?: string[];              // ["milk", "soy"] lower-case

  // Health
  health: {
    score?: number;                  // 0–100
    flags: Array<{
      id: string;                    // "high_sugar" | "artificial_colors" | ...
      level: "danger" | "warning" | "info" | "ok";
      label: string;                 // "High Sugar"
      details?: string;              // optional explanation
    }>;
  };
}

/**
 * Normalize OFF product to stable schema
 */
export function normalizeToConfirmFood(offProduct: any, barcode: string = ''): NormalizedProduct {
  const product = offProduct?.product ?? offProduct;
  
  // Handle ingredients with locale fallbacks
  const ingredientsText = product?.ingredients_text_en || 
                         product?.ingredients_text || 
                         product?.ingredients_text_es ||
                         product?.ingredients_text_fr ||
                         '';
  
  // Parse ingredients
  const ingredients = Array.isArray(product?.ingredients) 
    ? product.ingredients.map((ing: any) => ing.text || ing.id || String(ing)).filter(Boolean)
    : splitIngredientsList(ingredientsText);

  // Parse additives - strip prefixes and normalize
  const additives = (product?.additives_tags || product?.additives_original_tags || [])
    .map((tag: string) => tag.replace(/^en:|^fr:|^es:/, '').toLowerCase())
    .filter(Boolean);

  // Parse allergens - strip prefixes and normalize  
  const allergens = (product?.allergens_tags || [])
    .map((tag: string) => tag.replace(/^en:|^fr:|^es:/, '').toLowerCase())
    .filter(Boolean);

  // Nutrition handling with serving size conversion
  const nutriments = product?.nutriments || {};
  const perServing = product?.nutrition_data_per === 'serving';
  const servingRaw = (product?.serving_size || '').trim();
  const servingMatch = servingRaw.match(/([\d.]+)\s*([a-zA-Z]+)?/);
  const servingAmount = servingMatch ? parseFloat(servingMatch[1]) : undefined;
  const servingUnit = servingMatch?.[2]?.toLowerCase() || (perServing ? 'serving' : '100g');

  const pickNutrient = (key100: string, keyServing: string) =>
    perServing ? (nutriments[keyServing] ?? nutriments[key100]) : nutriments[key100];

  // Convert energy to kcal if needed  
  const energyKcal = pickNutrient('energy-kcal_100g', 'energy-kcal_serving') ??
                    (pickNutrient('energy_100g', 'energy_serving') && 
                     Number(pickNutrient('energy_100g', 'energy_serving')) / 4.184);

  const nutrition = {
    calories: energyKcal ? Math.round(Number(energyKcal)) : undefined,
    protein_g: coerceNum(pickNutrient('proteins_100g', 'proteins_serving')),
    carbs_g: coerceNum(pickNutrient('carbohydrates_100g', 'carbohydrates_serving')),
    fat_g: coerceNum(pickNutrient('fat_100g', 'fat_serving')),
    sugar_g: coerceNum(pickNutrient('sugars_100g', 'sugars_serving')),
    fiber_g: coerceNum(pickNutrient('fiber_100g', 'fiber_serving')),
    sodium_mg: toMg(coerceNum(pickNutrient('sodium_100g', 'sodium_serving'))) ??
               fromSaltToSodiumMg(coerceNum(pickNutrient('salt_100g', 'salt_serving'))),
    serving_size: servingAmount ? `${servingAmount} ${servingUnit}` : undefined
  };

  // Compute health flags and score
  const health = computeHealthData(ingredients, ingredientsText, nutrition, additives);

  return {
    barcode: barcode || product?.code || '',
    name: product?.product_name || product?.generic_name || 'Unknown product',
    brand: product?.brands?.split(',')[0]?.trim(),
    imageUrl: product?.image_front_small_url || product?.image_url,
    nutrition,
    ingredients,
    ingredients_text: ingredientsText,
    additives,
    allergens,
    health
  };
}

/**
 * Shared health calculator for both flows
 */
export function computeHealthData(
  ingredients: string[], 
  ingredientsText: string, 
  nutrition: any,
  additives: string[] = []
): { score?: number; flags: Array<{ id: string; level: "danger" | "warning" | "info" | "ok"; label: string; details?: string }> } {
  const flags: Array<{ id: string; level: "danger" | "warning" | "info" | "ok"; label: string; details?: string }> = [];
  const ingredientLower = (ingredientsText || ingredients.join(' ')).toLowerCase();

  // High sugar check
  const sugar = nutrition?.sugar_g;
  if (sugar && sugar >= 18) {
    flags.push({
      id: 'high_sugar',
      level: sugar >= 25 ? 'danger' : 'warning',
      label: 'High Sugar',
      details: `${sugar}g sugar per serving`
    });
  }

  // Artificial colors detection
  const colorRegex = /(red\s?40|allura\s?red|yellow\s?5|tartrazine|yellow\s?6|sunset\s?yellow|blue\s?1|blue\s?2|green\s?3)/i;
  if (colorRegex.test(ingredientLower)) {
    flags.push({
      id: 'artificial_colors',
      level: 'warning',
      label: 'Artificial Colors',
      details: 'Contains Red 40, Yellow 5/6, Blue 1, or other artificial colors'
    });
  }

  // Preservatives of concern
  const preservativeRegex = /(bha|bht|tbhq|sodium\s+benzoate|potassium\s+sorbate)/i;
  if (preservativeRegex.test(ingredientLower)) {
    flags.push({
      id: 'preservatives',
      level: 'warning', 
      label: 'Preservatives of Concern',
      details: 'Contains BHA, BHT, TBHQ, or other concerning preservatives'
    });
  }

  // Artificial sweeteners
  const sweetenerRegex = /(aspartame|acesulfame\s*k|sucralose|saccharin)/i;
  if (sweetenerRegex.test(ingredientLower)) {
    flags.push({
      id: 'artificial_sweeteners',
      level: 'warning',
      label: 'Artificial Sweeteners',
      details: 'Contains aspartame, sucralose, or other artificial sweeteners'
    });
  }

  // High sodium
  const sodium = nutrition?.sodium_mg;
  if (sodium && sodium > 800) {
    flags.push({
      id: 'high_sodium',
      level: sodium > 1200 ? 'danger' : 'warning',
      label: 'High Sodium',
      details: `${sodium}mg sodium per serving`
    });
  }

  // Positive flags
  if (ingredientLower.includes('whole grain') && (!sugar || sugar < 10)) {
    flags.push({
      id: 'whole_grains',
      level: 'ok',
      label: 'Whole Grains',
      details: 'Contains whole grain ingredients'
    });
  }

  if (sodium && sodium < 140) {
    flags.push({
      id: 'low_sodium',
      level: 'ok', 
      label: 'Low Sodium',
      details: 'Low in sodium'
    });
  }

  // Calculate health score if we have enough data
  let score: number | undefined = undefined;
  if (nutrition && (nutrition.calories || nutrition.sugar_g || nutrition.sodium_mg)) {
    score = 70; // Base score
    
    // Deduct for concerning ingredients
    flags.forEach(flag => {
      switch (flag.level) {
        case 'danger': score! -= 20; break;
        case 'warning': score! -= 10; break;
        case 'ok': score! += 10; break;
      }
    });
    
    score = Math.max(0, Math.min(100, score));
  }

  return { score, flags };
}

// Helper functions
function coerceNum(v: any): number | undefined {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function toMg(g?: number): number | undefined {
  return g == null ? undefined : Math.round(g * 1000);
}

function fromSaltToSodiumMg(g?: number): number | undefined {
  return g == null ? undefined : Math.round(g * 1000 * 0.393);
}

function splitIngredientsList(text?: string): string[] {
  if (!text) return [];
  return text.split(/[,;•·()]/).map(s => s.trim()).filter(Boolean);
}
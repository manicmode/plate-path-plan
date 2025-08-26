import { HealthFlag, HealthFlagLevel, NormalizedProduct } from '@/lib/food/types';

/**
 * Shared health calculator for both Health Scan and Log flows
 */
export function computeHealth(product: NormalizedProduct): { score?: number; flags: HealthFlag[] } {
  if (!product) return { flags: [] };
  
  const flags: HealthFlag[] = [];
  const ingredientText = (product.ingredients_text || product.ingredients.join(' ')).toLowerCase();
  const { nutrition } = product;

  // High sugar check
  const sugar = nutrition?.sugar_g;
  if (sugar && sugar >= 18) {
    flags.push({
      id: 'high_sugar',
      level: (sugar >= 25 ? 'danger' : 'warning') as HealthFlagLevel,
      label: 'High Sugar',
      details: `${sugar}g sugar per serving`
    });
  }

  // Artificial colors detection
  const colorRegex = /(red\s?40|allura\s?red|yellow\s?5|tartrazine|yellow\s?6|sunset\s?yellow|blue\s?1|blue\s?2|green\s?3)/i;
  if (colorRegex.test(ingredientText)) {
    flags.push({
      id: 'artificial_colors',
      level: 'warning',
      label: 'Artificial Colors',
      details: 'Contains Red 40, Yellow 5/6, Blue 1, or other artificial colors'
    });
  }

  // Preservatives of concern
  const preservativeRegex = /(bha|bht|tbhq|sodium\s+benzoate|potassium\s+sorbate)/i;
  if (preservativeRegex.test(ingredientText)) {
    flags.push({
      id: 'preservatives',
      level: 'warning',
      label: 'Preservatives of Concern',
      details: 'Contains BHA, BHT, TBHQ, or other concerning preservatives'
    });
  }

  // Artificial sweeteners
  const sweetenerRegex = /(aspartame|acesulfame\s*k|sucralose|saccharin)/i;
  if (sweetenerRegex.test(ingredientText)) {
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
      level: (sodium > 1200 ? 'danger' : 'warning') as HealthFlagLevel,
      label: 'High Sodium',
      details: `${sodium}mg sodium per serving`
    });
  }

  // Positive flags
  if (ingredientText.includes('whole grain') && (!sugar || sugar < 10)) {
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
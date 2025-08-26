import { LogProduct } from './types';

/**
 * Normalize OpenFoodFacts product to LogProduct schema
 */
export function normalizeOFFProduct(product: any, barcode: string): LogProduct {
  const n = product?.nutriments ?? {};

  // Serving math - prefer serving data, fallback to 100g
  const perServing = product?.nutrition_data_per === 'serving';
  const svRaw = (product?.serving_size || '').trim();
  const m = svRaw.match(/([\d.]+)\s*([a-zA-Z]+)?/);
  const svAmount = m ? parseFloat(m[1]) : undefined;

  const pick = (key100: string, keyServ: string) =>
    perServing ? n[keyServ] ?? n[key100] : n[key100];

  const kcal = pick('energy-kcal_100g','energy-kcal_serving') ??
               (pick('energy_100g','energy_serving') && 
                 Number(pick('energy_100g','energy_serving')) / 4.184);

  const nutrition = {
    calories: kcal ? Math.round(Number(kcal)) : 0,
    protein_g: num(pick('proteins_100g','proteins_serving')) || 0,
    carbs_g: num(pick('carbohydrates_100g','carbohydrates_serving')) || 0,
    fat_g: num(pick('fat_100g','fat_serving')) || 0,
    fiber_g: num(pick('fiber_100g','fiber_serving')) || 0,
    sugar_g: num(pick('sugars_100g','sugars_serving')) || 0,
    sodium_mg: (toMg(num(pick('sodium_100g','sodium_serving'))) 
               ?? fromSaltToSodiumMg(num(pick('salt_100g','salt_serving')))) || 0
  };

  // Parse ingredients
  const ingredients = parseIngredients(product);

  // Generate health flags
  const health = generateHealthFlags(ingredients, nutrition);

  return {
    productName: product?.product_name || product?.generic_name || 'Unknown product',
    barcode,
    imageUrl: product?.image_front_small_url || product?.image_url,
    nutrition,
    ingredients,
    health
  };

  function num(v: any) { return v == null ? undefined : Number(v); }
  function toMg(g?: number) { return g == null ? undefined : Math.round(g * 1000); }
  function fromSaltToSodiumMg(g?: number) { return g == null ? undefined : Math.round(g * 1000 * 0.393); }
}

function parseIngredients(product: any): string[] {
  // Try ingredients array first
  if (Array.isArray(product?.ingredients)) {
    return product.ingredients.map((i: any) => i.text || i.id || String(i)).filter(Boolean);
  }
  
  // Fallback to ingredients_text with various locale attempts
  const textOptions = [
    product?.ingredients_text_en,
    product?.ingredients_text,
    product?.ingredients_text_fr,
    product?.ingredients_text_es
  ].filter(Boolean);

  if (textOptions.length > 0) {
    const text = textOptions[0];
    return text.split(/[·•,;()\[\]]/)
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 0);
  }
  
  return [];
}

function generateHealthFlags(ingredients: string[], nutrition: any): { score: number; flags: any[] } {
  const flags: any[] = [];
  const ingredientText = ingredients.join(' ').toLowerCase();

  // High sugar flag (warning) - per serving
  if (nutrition.sugar_g >= 22.5) {
    flags.push({
      id: 'high_sugar',
      label: 'High Sugar',
      level: 'warning',
      emoji: '🍭',
      details: 'High in added sugars; limit portion size.'
    });
  }

  // High sodium flag (warning) - per serving  
  if (nutrition.sodium_mg >= 600) {
    flags.push({
      id: 'high_sodium',
      label: 'High Sodium',
      level: 'warning',
      emoji: '🧂',
      details: 'High sodium content may contribute to high blood pressure.'
    });
  }

  // Good fiber flag
  if (nutrition.fiber_g >= 5) {
    flags.push({
      id: 'good_fiber',
      label: 'Good Fiber',
      level: 'good',
      emoji: '🌾',
      details: 'Good source of dietary fiber.'
    });
  }

  // Artificial colors detection
  const artificialColors = ['red 40', 'yellow 5', 'yellow 6', 'blue 1', 'blue 2'];
  const hasArtificialColors = artificialColors.some(color => 
    ingredientText.includes(color) || ingredientText.includes(color.replace(' ', ''))
  );
  
  if (hasArtificialColors || ingredientText.includes('artificial color')) {
    flags.push({
      id: 'artificial_colors',
      label: 'Artificial Colors',
      level: 'warning',
      emoji: '🎨',
      details: 'Contains artificial colors (e.g., Red 40, Yellow 5/6, Blue 1).'
    });
  }

  // Preservatives detection
  const preservatives = ['bha', 'bht', 'sodium benzoate', 'potassium sorbate', 'tbhq'];
  const hasPreservatives = preservatives.some(pres => ingredientText.includes(pres));
  
  if (hasPreservatives) {
    flags.push({
      id: 'preservatives',
      label: 'Preservatives',
      level: 'warning',
      emoji: '⚗️',
      details: 'Contains preservatives - some linked to allergic reactions.'
    });
  }

  // Calculate health score
  let score = 80; // Base score
  flags.forEach(flag => {
    switch (flag.level) {
      case 'danger':
        score -= 20;
        break;
      case 'warning':
        score -= 10;
        break;
      case 'good':
        score += 5;
        break;
    }
  });

  score = Math.max(0, Math.min(100, score));

  return { score, flags };
}
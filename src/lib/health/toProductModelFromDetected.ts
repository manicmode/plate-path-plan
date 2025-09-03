/**
 * Mapper to transform detected photo items into the product model format 
 * expected by the full HealthCheckModal with GenericFoods integration
 */

import { resolveGenericFood } from '@/health/generic/resolveGenericFood';

export interface ProductModel {
  id: string;
  name: string;
  brand?: string | null;
  image_url?: string | null;
  serving?: {
    grams?: number | null;
    label?: string;
  };
  nutrients?: {
    calories?: number | null;
    protein_g?: number | null;
    carbs_g?: number | null;
    fat_g?: number | null;
    fiber_g?: number | null;
    sugar_g?: number | null;
    sodium_mg?: number | null;
  };
  barcode?: string;
  source?: string;
  meta?: {
    portion?: {
      grams: number | null;
      label: string | null;
      isEstimated: boolean;
    };
    per100g?: any;
    perPortion?: any;
  };
}

/**
 * Transform a detected item from photo analysis into the product model format
 * that HealthCheckModal expects, using GenericFoods data for nutrition
 */
export function toProductModelFromDetected(item: any): ProductModel {
  console.info('[HEALTH][PHOTO_ITEM]->[FULL_REPORT]', { name: item.name });
  
  // Extract estimated grams from detected item
  const grams = item.grams ?? item.portionGrams ?? item.estGrams ?? item.estimated_grams ?? null;
  const portionLabel = item.portionLabel ?? item.portion ?? (grams ? `${grams}g` : null);
  
  console.info('[HEALTH][PHOTO_ITEM][PORTION]', { name: item.name, grams, portionLabel });

  // Try to resolve from GenericFoods
  const genericFood = resolveGenericFood(item.name);
  console.info('[GENERIC][RESOLVE]', { q: item.name, found: !!genericFood });

  if (genericFood) {
    const per100g = {
      kcal: genericFood.nutrients.calories ?? 0,
      protein: genericFood.nutrients.protein_g ?? 0,
      carbs: genericFood.nutrients.carbs_g ?? 0,
      fat: genericFood.nutrients.fat_g ?? 0,
      fiber: genericFood.nutrients.fiber_g ?? null,
      sodium: genericFood.nutrients.sodium_mg ?? null,
    };

    console.info('[HEALTH][GENERIC][PER100G]', per100g);

    // Calculate per-portion if grams available
    const factor = grams ? grams / 100 : null;
    const perPortion = factor ? {
      kcal: Math.round(per100g.kcal * factor),
      protein: Math.round(per100g.protein * factor * 10) / 10,
      carbs: Math.round(per100g.carbs * factor * 10) / 10,
      fat: Math.round(per100g.fat * factor * 10) / 10,
      fiber: per100g.fiber != null ? Math.round(per100g.fiber * factor * 10) / 10 : null,
      sodium: per100g.sodium != null ? Math.round(per100g.sodium * factor) : null,
      grams,
    } : null;

    console.info('[HEALTH][GENERIC][PORTION]', perPortion);

    return {
      id: `detected:${item.id ?? item.name}`,
      name: genericFood.display_name,
      brand: null,
      image_url: item.imageUrl ?? null,
      source: 'generic',
      serving: {
        grams: grams ?? genericFood.serving.grams,
        label: portionLabel ?? genericFood.serving.label,
      },
      nutrients: {
        calories: perPortion?.kcal ?? per100g.kcal,
        protein_g: perPortion?.protein ?? per100g.protein,
        carbs_g: perPortion?.carbs ?? per100g.carbs,
        fat_g: perPortion?.fat ?? per100g.fat,
        fiber_g: perPortion?.fiber ?? per100g.fiber,
        sugar_g: null, // Generic foods don't have sugar data yet
        sodium_mg: perPortion?.sodium ?? per100g.sodium,
      },
      meta: {
        portion: {
          grams,
          label: portionLabel,
          isEstimated: true,
        },
        per100g,
        perPortion,
      }
    };
  }

  // Fallback to detected item data if no GenericFood match
  console.warn('[GENERIC][FALLBACK] Using detected item data for:', item.name);
  return {
    id: `detected:${item.id ?? item.name}`,
    name: item.name,
    brand: null,
    image_url: item.imageUrl ?? null,
    serving: {
      grams: grams ?? 100,
      label: portionLabel ?? 'per item',
    },
    nutrients: {
      calories: item.calories ?? null,
      protein_g: item.nutrition?.protein ?? null,
      carbs_g: item.nutrition?.carbs ?? null,
      fat_g: item.nutrition?.fat ?? null,
      fiber_g: item.nutrition?.fiber ?? null,
      sugar_g: item.nutrition?.sugar ?? null,
      sodium_mg: item.nutrition?.sodium ?? null,
    }
  };
}
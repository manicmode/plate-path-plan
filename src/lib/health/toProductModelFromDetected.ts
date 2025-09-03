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
    healthScore?: number; // Add health score to meta
    ingredients?: string[]; // Basic ingredient list for whole foods
    flags?: Array<{
      ingredient: string;
      flag: string;
      severity: 'low' | 'medium' | 'high';
      reason?: string;
    }>; // Generated flags for the modal
  };
}

/**
 * Transform a detected item from photo analysis into the product model format
 * that HealthCheckModal expects, using GenericFoods data for nutrition
 */
export async function toProductModelFromDetected(item: any): Promise<ProductModel> {
  console.info('[HEALTH][PHOTO_ITEM]->[FULL_REPORT]', { name: item.name });
  
  // Enhanced mapper that includes scoring context for photo items
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

    // Calculate health score using new V2 scoring system
    const { scoreFood } = await import('@/health/scoring');
    const healthScore10 = scoreFood({
      name: genericFood.display_name,
      source: 'photo_item',
      genericSlug: genericFood.slug,
      nutrients: {
        calories: per100g.kcal,
        protein_g: per100g.protein,
        carbs_g: per100g.carbs,
        fat_g: per100g.fat,
        fiber_g: per100g.fiber,
        sodium_mg: per100g.sodium,
        sugars_g: null, // Not available in generic foods yet
      }
    });

    // Generate basic ingredient list and flags for whole foods
    const capitalizeWords = (str: string) => str.replace(/\b\w/g, l => l.toUpperCase());
    const ingredientsList = [capitalizeWords(genericFood.display_name)];
    
    // Generate basic flags based on nutritional content and health score
    const flags = [];
    const score100 = healthScore10 * 10; // Convert to 0-100 scale for flag thresholds
    
    if (score100 >= 85) {
      flags.push({
        ingredient: genericFood.display_name,
        flag: 'Excellent nutritional choice',
        severity: 'low' as const,
        reason: 'High overall health score'
      });
    }
    
    if (per100g.fiber && per100g.fiber >= 3) {
      flags.push({
        ingredient: genericFood.display_name,
        flag: 'Good source of fiber',
        severity: 'low' as const,
        reason: `Contains ${per100g.fiber}g fiber per 100g`
      });
    }
    
    if (per100g.protein >= 15) {
      flags.push({
        ingredient: genericFood.display_name,
        flag: 'High protein content',
        severity: 'low' as const,
        reason: `Contains ${per100g.protein}g protein per 100g`
      });
    }
    
    if (per100g.sodium && per100g.sodium > 600) {
      flags.push({
        ingredient: genericFood.display_name,
        flag: 'High sodium content',
        severity: 'medium' as const,
        reason: `Contains ${per100g.sodium}mg sodium per 100g`
      });
    }

    console.info('[GENERIC][MAP_OUT]', { 
      name: genericFood.display_name, 
      grams, 
      hasPer100g: !!per100g, 
      flagsCount: flags.length,
      ingredients: ingredientsList
    });

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
        healthScore: healthScore10, // Include calculated health score
        ingredients: ingredientsList, // Basic ingredient list for whole foods
        flags, // Generated flags for the modal
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
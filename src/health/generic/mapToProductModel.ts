import type { ProductModel } from '@/lib/health/toProductModelFromDetected';
import type { GenericFood } from './resolveGenericFood';

export function productFromGeneric(g: GenericFood): ProductModel {
  return {
    id: `generic:${g.slug}`,
    name: g.display_name,
    brand: null,
    image_url: null,
    serving: { grams: g.serving.grams, label: g.serving.label },
    nutrients: {
      calories: g.nutrients.calories ?? null,
      protein_g: g.nutrients.protein_g ?? null,
      carbs_g: g.nutrients.carbs_g ?? null,
      fat_g: g.nutrients.fat_g ?? null,
      fiber_g: g.nutrients.fiber_g ?? null,
      sugar_g: null, // Generic foods don't have sugar data yet
      sodium_mg: g.nutrients.sodium_mg ?? null
    }
  };
}
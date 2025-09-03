/**
 * Mapper to transform detected photo items into the product model format 
 * expected by the full HealthCheckModal
 */

import { ReviewItem } from '@/components/camera/ReviewItemsScreen';

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
}

/**
 * Transform a detected item from photo analysis into the product model format
 * that HealthCheckModal expects
 */
export function toProductModelFromDetected(item: any): ProductModel {
  console.info('[HEALTH][PHOTO_ITEM]->[FULL_REPORT]', { name: item.name });
  
  return {
    id: `detected:${item.id ?? item.name}`,
    name: item.name,
    brand: null,
    image_url: item.imageUrl ?? null,
    serving: {
      grams: item.grams ?? item.portionGrams ?? 100,
      label: item.portionLabel ?? 'per item',
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
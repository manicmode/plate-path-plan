/**
 * Health Report -> Log Food prefill system
 * Shared types and utilities for passing report data to confirmation modal
 */

export type LogPrefill = {
  source: 'health-report';
  item: {
    itemName: string;
    brand?: string;
    imageUrl?: string;
    ingredientsText?: string;
    allergens?: string[];
    additives?: string[];
    categories?: string[];
    nutrientsScaled: {
      calories?: number; 
      fat_g?: number; 
      sat_fat_g?: number; 
      carbs_g?: number;
      sugar_g?: number; 
      fiber_g?: number; 
      protein_g?: number; 
      sodium_mg?: number;
      factor: number;
    };
    portionGrams: number | null;
    requiresConfirmation: boolean;
  };
  ts?: number; // optional timestamp for the log
};

// Simple helper to build the prefill from normalized product in the report
export function buildLogPrefill(
  itemName: string,
  brand: string | undefined,
  imageUrl: string | undefined,
  ingredientsText: string | undefined,
  allergens: string[] | undefined,
  additives: string[] | undefined,
  categories: string[] | undefined,
  nutrientsScaled: {
    calories?: number; 
    fat_g?: number; 
    sat_fat_g?: number; 
    carbs_g?: number;
    sugar_g?: number; 
    fiber_g?: number; 
    protein_g?: number; 
    sodium_mg?: number;
    factor: number;
  },
  portionGrams: number | null,
  requiresConfirmation: boolean
): LogPrefill {
  return {
    source: 'health-report',
    item: {
      itemName,
      brand,
      imageUrl,
      ingredientsText: ingredientsText || '',
      allergens: allergens || [],
      additives: additives || [],
      categories: categories || [],
      nutrientsScaled,
      portionGrams,
      requiresConfirmation,
    },
    ts: Date.now(),
  };
}
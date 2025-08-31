/**
 * Health Report -> Log Food prefill system
 * Shared types and utilities for passing report data to confirmation modal
 */

import type { NormalizedProduct } from '@/shared/search-to-analysis';

export type PortionHint = { grams: number; source: 'ocr'|'user'|'label'|'estimate'|'fallback' };

export type LogPrefill = {
  source: 'health-report'|'barcode'|'photo';
  // Keep both the normalized product and the UI-ready item
  norm?: NormalizedProduct;                 // <-- add (lets us recompute portion)
  providerRaw?: any;                        // <-- add (the OFF product data)
  item: {
    itemName: string;
    brand?: string;
    imageUrl?: string;                      // primary
    image?: string;                         // fallbacks
    photoUrl?: string;
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
    portionGrams: number;                   // what report used
    portionHint?: PortionHint;              // <-- add (what chip said)
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
  portionGrams: number
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
    },
    ts: Date.now(),
  };
}
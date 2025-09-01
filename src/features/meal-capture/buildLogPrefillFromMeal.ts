/**
 * Build LogPrefill from Meal Analysis
 * Deterministic mapping from HealthAnalysisResult to LogPrefill
 */

import { buildLogPrefill, LogPrefill } from '@/lib/health/logPrefill';
import { httpOnly } from './httpOnly';

export interface HealthAnalysisResult {
  itemName: string;
  healthScore: number;
  nutritionData: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g: number;
    sugar_g: number;
    sodium_mg: number;
  };
  healthProfile: any;
  personalizedWarnings: string[];
  suggestions: string[];
  overallRating: string;
  analysisData: {
    source: string;
  };
}

export function buildLogPrefillFromMeal(
  result: HealthAnalysisResult,
  imageUrl?: string
): LogPrefill {
  const safeImageUrl = httpOnly(imageUrl);
  
  // Build prefill using existing utility
  const prefill = buildLogPrefill(
    result.itemName,
    undefined, // brand
    safeImageUrl, // imageUrl (HTTP-only)
    undefined, // ingredientsText
    [], // allergens
    [], // additives  
    [], // categories
    result.nutritionData,
    100, // default portion grams
    true // requiresConfirmation
  );

  return prefill;
}
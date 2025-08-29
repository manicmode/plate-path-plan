/**
 * Photo → legacy/adapter mapping for unified output
 * Builds the exact legacy/adapter shape used by barcode/manual flows
 */

import { parseNutritionFromOCR } from '@/lib/health/parseNutritionPanel';
import { detectFlags } from '@/lib/health/flagger';
import { calculateHealthScore, toFinal10 } from '@/score/ScoreEngine';

export function toLegacyFromPhoto(ocrText: string) {
  const parsed = parseNutritionFromOCR(ocrText);
  const per100 = parsed.per100 || {};
  const perServing = parsed.perServing;

  // Flags (ingredients + thresholds). Ensure exact per-100g keys expected by flagger:
  const flags = detectFlags(parsed.ingredients_text || '', {
    sugar_g_100g: per100.sugar_g,
    satfat_g_100g: per100.satfat_g,
    fiber_g_100g: per100.fiber_g,
    sodium_mg_100g: per100.sodium_mg,
  });

  // ScoreEngine only when inputs exist; no fallback constants
  const hasAny = ['energyKcal', 'sugar_g', 'sodium_mg', 'satfat_g', 'fiber_g', 'protein_g']
    .some(k => per100?.[k as keyof typeof per100] != null && !Number.isNaN(+(per100?.[k as keyof typeof per100] || 0)));
  
  let score10: number | undefined;
  if (import.meta.env.VITE_SCORE_ENGINE_V1 === 'true' && hasAny) {
    const res = calculateHealthScore({
      nutrition: {
        calories: per100.energyKcal,
        sugar_g: per100.sugar_g,
        sodium_mg: per100.sodium_mg,
        saturated_fat_g: per100.satfat_g,
        fiber_g: per100.fiber_g,
        protein_g: per100.protein_g,
        carbs_g: per100.carbs_g,
        fat_g: per100.fat_g,
      },
      ingredientsText: parsed.ingredients_text,
      engineFixes: import.meta.env.VITE_ENGINE_V1_FIXES === 'true'
    });
    score10 = toFinal10(res.final);
  }

  const nutritionData = {
    ...per100,
    // legacy/aliases for UI safety
    calories: per100.energyKcal,
    protein: per100.protein_g,
    carbs: per100.carbs_g,
    sugars_g: per100.sugar_g,
    fat: per100.fat_g,
    saturated_fat_g: per100.satfat_g,
    fiber: per100.fiber_g,
    sodium: per100.sodium_mg,
  };

  return {
    productName: 'Captured label',
    nutritionData,
    nutritionDataPerServing: perServing,
    serving_size: parsed.serving_size_raw,
    flags,
    healthScore: score10,
    ingredients_text: parsed.ingredients_text,
    _dataSource: 'photo/ocr',
  };
}
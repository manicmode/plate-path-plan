/**
 * Unified search result to health analysis handler
 * Ensures voice and manual search selections use identical analysis pipeline
 */

import { analyzeFromProduct } from '@/services/healthAnalysis';
import type { ScanSource, NormalizedProduct } from '@/types/health';

export type SearchSource = ScanSource;

/**
 * Normalize any search result item to canonical product format
 * Maps every possible shape to the format expected by the analyzer
 */
export function normalizeSearchItem(item: any): NormalizedProduct {
  return {
    id: item.id ?? item.productId ?? null,
    barcode: item.barcode ?? item.code ?? null,
    name: item.name ?? item.product_name ?? item.title ?? item.displayName ?? item.productName ?? 'Unknown Product',
    brand: item.brand ?? item.brands ?? item.manufacturer ?? null,
    imageUrl: item.image_url ?? item.imageUrl ?? item.front_image_url ?? null,
    nutriments: {
      // Prefer serving values, fallback to per 100g to match manual flow
      energy_kcal: item.calories ?? item.nutriments?.energy_kcal ?? item.nutriments?.energy_kcal_100g ?? item.nutrition?.calories,
      proteins: item.protein ?? item.nutriments?.proteins ?? item.nutriments?.proteins_100g,
      carbohydrates: item.carbs ?? item.nutriments?.carbohydrates ?? item.nutriments?.carbohydrates_100g,
      fat: item.fat ?? item.nutriments?.fat ?? item.nutriments?.fat_100g,
      fiber: item.fiber ?? item.nutriments?.fiber ?? item.nutriments?.fiber_100g,
      sugars: item.sugar ?? item.nutriments?.sugars ?? item.nutriments?.sugars_100g,
      sodium: item.sodium ?? item.nutriments?.sodium ?? 
        (item.nutriments?.salt_100g ? item.nutriments.salt_100g * 400 : null),
      saturated_fat: item.saturated_fat ?? item.nutriments?.saturated_fat ?? item.nutriments?.saturated_fat_100g,
    },
    ingredients: item.ingredients ?? item.ingredient_analysis ?? null,
    novaGroup: item.nova_group ?? item.novaGroup ?? null,
    serving: item.serving_size ?? item.serving ?? item.servingHint ?? null,
  };
}

// analyzeFromProduct is now imported from the unified service

/**
 * Unified handler for search result selection
 * Both manual and voice search should call this with identical parameters
 */
export async function handleSearchPick({
  item,
  source,
  setAnalysisData,
  setStep,
  onError,
}: {
  item: any;
  source: ScanSource;
  setAnalysisData: (data: any) => void;
  setStep: (step: string) => void;
  onError?: (error: any) => void;
}) {
  try {
    const product = normalizeSearchItem(item);
    console.log(`[SEARCH→ANALYSIS] ${source} selection:`, product.name);

    // IMPORTANT: Call the SAME analyzer used by manual entry
    const analysis = await analyzeFromProduct(product, { source });

    // Transform analysis to Health Analysis result format
    const analysisResult = {
      product: {
        productName: product.name,
        barcode: product.barcode,
        brand: product.brand,
        imageUrl: product.imageUrl,
        nutrition: {
          calories: product.nutriments?.energy_kcal || 0,
          protein: product.nutriments?.proteins || 0,
          carbs: product.nutriments?.carbohydrates || 0,
          fat: product.nutriments?.fat || 0,
          fiber: product.nutriments?.fiber || 0,
          sugar: product.nutriments?.sugars || 0,
          sodium: product.nutriments?.sodium || 0,
          saturated_fat: product.nutriments?.saturated_fat || 0,
        }
      },
      analysis: analysis,
      source: source,
      confidence: item.confidence || 0.8
    };

    console.log(`[SEARCH→ANALYSIS] ${source} analysis complete:`, analysisResult);
    setAnalysisData(analysisResult);
    setStep('report');
  } catch (error) {
    console.error(`[SEARCH→ANALYSIS] ${source} error:`, error);
    onError?.(error);
  }
}
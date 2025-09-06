/**
 * Nutrition hydrator for v3 manual/voice items
 * Resolves generic nutrition data with fallbacks and timeout handling
 */

import { supabase } from '@/integrations/supabase/client';
import { fetchMacrosByCanonicalKey, legacyHydrateByName } from '@/lib/food/nutrition/hydrateCanonical';
import { FOOD_CLASS_MAP } from '@/lib/food/portion/portionDefaults';
import { CANONICAL_BY_CORE_NOUN } from '@/lib/food/text/canonicalMap';
import type { CanonicalKey } from '@/lib/food/text/canonicalMap';

export const ENABLE_V3_NUTRITION = 
  import.meta.env.VITE_FOOD_TEXT_V3_NUTR !== '0'; // default on unless explicitly 0

export type V3NutritionResult = {
  perGramKeys: string[];
  fromStore: boolean;
  dataSource: string;
  isEstimated: boolean;
  perGram: {
    kcal: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber?: number;
    sugar?: number;
    sodium?: number;
  };
};

/**
 * Main hydration function for v3 manual/voice items
 */
export async function hydrateNutritionV3(
  item: any, 
  opts: { signal?: AbortSignal; preferGeneric?: boolean } = {}
): Promise<V3NutritionResult> {
  const { signal, preferGeneric = true } = opts;
  
  console.log('[NUTR][V3][START]', {
    title: item.title || item.name,
    canonicalKey: item.canonicalKey,
    classId: item.classId,
    nutritionKey: item.nutritionKey
  });

  // Fast path: already has store data
  if (item.hasStoreData) {
    console.log('[NUTR][V3][FAST_PATH] hasStoreData=true');
    return {
      perGramKeys: ['kcal', 'protein', 'carbs', 'fat'],
      fromStore: true,
      dataSource: 'store',
      isEstimated: false,
      perGram: {
        kcal: item.calories / 100,
        protein: item.protein / 100,
        carbs: item.carbs / 100,
        fat: item.fat / 100,
        fiber: item.fiber / 100,
        sugar: item.sugar / 100,
        sodium: item.sodium / 100
      }
    };
  }

  // Set up timeout
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Nutrition hydration timeout')), 6000);
  });

  try {
    const result = await Promise.race([
      performHydration(item, { signal, preferGeneric }),
      timeoutPromise
    ]);
    
    if (signal?.aborted) {
      throw new Error('Aborted');
    }
    
    console.log('[NUTR][V3][OK]', { 
      dataSource: result.dataSource, 
      perGramKeys: result.perGramKeys.length 
    });
    
    return result;
    
  } catch (error) {
    if (signal?.aborted) {
      throw error;
    }
    
    if (error.message === 'Nutrition hydration timeout') {
      console.log('[NUTR][V3][TIMEOUT]', { classId: item.classId });
      return createEstimatedResult(item);
    }
    
    console.log('[NUTR][V3][ERR]', { message: error.message });
    return createEstimatedResult(item);
  }
}

/**
 * Core hydration logic with multiple fallback strategies
 */
async function performHydration(
  item: any, 
  { signal, preferGeneric }: { signal?: AbortSignal; preferGeneric?: boolean }
): Promise<V3NutritionResult> {
  
  // Step 1: Try canonical key from item
  if (item.canonicalKey || item.nutritionKey) {
    const key = item.canonicalKey || item.nutritionKey;
    try {
      const result = await fetchMacrosByCanonicalKey(key as CanonicalKey);
      if (signal?.aborted) throw new Error('Aborted');
      
      if (result?.perGram) {
        console.log('[NUTR][V3][GENERIC_HIT]', { slug: key, from: 'canonicalKey' });
        return {
          perGramKeys: Object.keys(result.perGram),
          fromStore: false,
          dataSource: 'canonical',
          isEstimated: false,
          perGram: result.perGram
        };
      }
    } catch (error) {
      if (signal?.aborted) throw error;
      console.warn('[NUTR][V3] Canonical key lookup failed:', error);
    }
  }

  // Step 2: Derive generic slug from parsed core noun
  const title = item.title || item.name || '';
  const coreNoun = deriveCoreNoun(title);
  if (coreNoun) {
    const canonicalKey = CANONICAL_BY_CORE_NOUN[coreNoun];
    if (canonicalKey) {
      try {
        const result = await fetchMacrosByCanonicalKey(canonicalKey.canonical);
        if (signal?.aborted) throw new Error('Aborted');
        
        if (result?.perGram) {
          console.log('[NUTR][V3][GENERIC_HIT]', { slug: canonicalKey.canonical, from: 'map' });
          return {
            perGramKeys: Object.keys(result.perGram),
            fromStore: false,
            dataSource: 'canonical',
            isEstimated: false,
            perGram: result.perGram
          };
        }
      } catch (error) {
        if (signal?.aborted) throw error;
        console.warn('[NUTR][V3] Core noun lookup failed:', error);
      }
    }
  }

  // Step 3: Handle barcode-looking itemId mapped to generic
  if (item.itemId && /^\d{8,14}$/.test(item.itemId) && item.classId) {
    const genericSlug = mapClassToGeneric(item.classId);
    if (genericSlug) {
      try {
        const result = await fetchMacrosByCanonicalKey(genericSlug);
        if (signal?.aborted) throw new Error('Aborted');
        
        if (result?.perGram) {
          console.log('[NUTR][V3][BRAND_TO_GENERIC]', { 
            itemId: item.itemId, 
            mapped: genericSlug 
          });
          return {
            perGramKeys: Object.keys(result.perGram),
            fromStore: false,
            dataSource: 'canonical',
            isEstimated: false,
            perGram: result.perGram
          };
        }
      } catch (error) {
        if (signal?.aborted) throw error;
        console.warn('[NUTR][V3] Brand to generic lookup failed:', error);
      }
    }
  }

  // Step 4: Final attempt with legacy text lookup
  try {
    const result = await legacyHydrateByName(title);
    if (signal?.aborted) throw new Error('Aborted');
    
    if (result?.perGram) {
      console.log('[NUTR][V3][GENERIC_HIT]', { slug: title, from: 'text' });
      return {
        perGramKeys: Object.keys(result.perGram),
        fromStore: false,
        dataSource: 'legacy_text_lookup',
        isEstimated: false,
        perGram: result.perGram
      };
    }
  } catch (error) {
    if (signal?.aborted) throw error;
    console.warn('[NUTR][V3] Legacy text lookup failed:', error);
  }

  // If all else fails, create estimated result
  throw new Error('No nutrition data found');
}

/**
 * Create estimated nutrition result as fallback
 */
function createEstimatedResult(item: any): V3NutritionResult {
  const classId = item.classId || 'generic_food';
  
  // Basic heuristics based on food class
  const heuristics: Record<string, any> = {
    hot_dog_link: { kcal: 2.9, protein: 0.10, carbs: 0.02, fat: 0.26 },
    pizza_slice: { kcal: 2.66, protein: 0.11, carbs: 0.33, fat: 0.10 },
    teriyaki_bowl: { kcal: 1.63, protein: 0.12, carbs: 0.21, fat: 0.04 },
    california_roll: { kcal: 1.29, protein: 0.04, carbs: 0.18, fat: 0.06 },
    rice_cooked: { kcal: 1.30, protein: 0.027, carbs: 0.28, fat: 0.003 },
    egg_large: { kcal: 1.55, protein: 0.13, carbs: 0.011, fat: 0.11 },
    oatmeal_cooked: { kcal: 0.68, protein: 0.024, carbs: 0.12, fat: 0.014 }
  };
  
  const macros = heuristics[classId] || { kcal: 2.0, protein: 0.08, carbs: 0.25, fat: 0.08 };
  
  return {
    perGramKeys: ['kcal', 'protein', 'carbs', 'fat'],
    fromStore: false,
    dataSource: 'Estimated',
    isEstimated: true,
    perGram: {
      kcal: macros.kcal,
      protein: macros.protein,
      carbs: macros.carbs,
      fat: macros.fat,
      fiber: macros.fiber || 0.02,
      sugar: macros.sugar || 0.05,
      sodium: macros.sodium || 0.4
    }
  };
}

/**
 * Derive core noun from food title for canonical mapping
 */
function deriveCoreNoun(title: string): string | null {
  const normalized = title.toLowerCase().trim();
  
  // Direct matches
  for (const [foodName, classId] of Object.entries(FOOD_CLASS_MAP)) {
    if (normalized.includes(foodName)) {
      // Convert class ID to core noun format
      return classId.replace(/_/g, '_');
    }
  }
  
  // Tokenize and find core terms
  const tokens = normalized.split(/\s+/);
  for (const token of tokens) {
    if (CANONICAL_BY_CORE_NOUN[token]) {
      return token;
    }
    
    // Handle compound terms
    if (token.includes('pizza')) return 'pizza';
    if (token.includes('dog')) return 'hot_dog';
    if (token.includes('teriyaki')) return 'teriyaki_bowl';
    if (token.includes('california')) return 'california_roll';
    if (token.includes('rice')) return 'rice_cooked';
    if (token.includes('egg')) return 'egg';
    if (token.includes('oatmeal')) return 'oatmeal';
  }
  
  return null;
}

/**
 * Map class ID to generic canonical key
 */
function mapClassToGeneric(classId: string): CanonicalKey | null {
  const mapping: Record<string, CanonicalKey> = {
    hot_dog_link: 'generic_hot_dog',
    pizza_slice: 'generic_pizza_slice',
    teriyaki_bowl: 'generic_teriyaki_chicken_bowl',
    california_roll: 'generic_california_roll',
    rice_cooked: 'generic_white_rice_cooked',
    egg_large: 'generic_egg_large',
    oatmeal_cooked: 'generic_oatmeal_dry'
  };
  
  return mapping[classId] || null;
}
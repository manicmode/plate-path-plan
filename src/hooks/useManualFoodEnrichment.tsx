import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { NV_WRITE_THROUGH } from '@/lib/flags';
import { nvWrite } from '@/lib/nutritionVault';
import { enrichFromGeneric } from '@/lib/food/generic';
import { normalizeIngredients } from '@/utils/normalizeIngredients';
import { fetchCanonicalNutrition } from '@/lib/food/fetchCanonicalNutrition';

// Whole food fallback nutrition data per 100g
const WHOLE_FOOD_PER100: Record<string, {p:number;c:number;f:number;k:number}> = {
  salmon:     { p: 20.0, c: 0.0, f: 13.0, k: 208 },
  "atlantic salmon": { p: 20.4, c: 0.0, f: 13.4, k: 208 },
  asparagus:  { p: 2.2,  c: 3.9, f: 0.1,  k: 20  },
  broccoli:   { p: 2.8,  c: 7.0, f: 0.4,  k: 35  },
  spinach:    { p: 2.9,  c: 3.6, f: 0.4,  k: 23  },
  avocado:    { p: 2.0,  c: 9.0, f: 15.0, k: 160 },
  egg:        { p: 12.6, c: 1.1, f: 10.6, k: 155 },
  banana:     { p: 1.1,  c: 23.0,f: 0.3,  k: 89  },
  apple:      { p: 0.3,  c: 14.0,f: 0.2,  k: 52  },
  rice:       { p: 2.7,  c: 28.0,f: 0.3,  k: 130 },
  "chicken breast": { p: 23.0, c: 0.0, f: 3.6, k: 165 },
  steak:      { p: 26.0, c: 0.0, f: 15.0, k: 250 },
  tuna:       { p: 30.0, c: 0.0, f: 1.0,  k: 132 },
  oats:       { p: 10.8, c: 66.3,f: 6.9,  k: 389 }
};

function fillMacrosFromPer100(name: string, grams: number) {
  const key = name.toLowerCase().trim();
  const hit = Object.keys(WHOLE_FOOD_PER100).find(k => key === k || key.startsWith(k));
  if (!hit) return null;
  const ref = WHOLE_FOOD_PER100[hit];
  const scale = (grams || 100) / 100;
  return {
    macros: {
      protein: +(ref.p * scale).toFixed(2),
      carbs:   +(ref.c * scale).toFixed(2),
      fat:     +(ref.f * scale).toFixed(2),
    },
    calories: Math.round(ref.k * scale),
    macrosMode: 'PER_100G' as const,
  };
}

function isWholeFoodName(name?: string) {
  if (!name) return false;
  const n = name.toLowerCase().trim();
  return [
    'salmon','atlantic salmon','asparagus','broccoli','spinach',
    'avocado','egg','banana','apple','rice','chicken breast','steak','tuna','oats'
  ].some(k => n === k || n.startsWith(k));
}

interface Nutrients {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber?: number;
  sugar?: number;
  saturated_fat?: number;
  sodium?: number;
  potassium?: number;
  calcium?: number;
  iron?: number;
}

interface EnrichedFood {
  name: string;
  displayName?: string; // Add displayName property
  selectionFlags?: { generic?: boolean; brand?: boolean; restaurant?: boolean }; // Add selectionFlags
  selectionId?: string; // Add selectionId
  canonicalKey?: string; // Add canonicalKey
  aliases: string[];
  locale: string;
  ingredients: { name: string; grams?: number; amount?: string }[];
  ingredientsList?: string[]; // Add ingredientsList field
  per100g: Nutrients;
  perServing?: Nutrients & { serving_grams?: number };
  source: "FDC" | "EDAMAM" | "NUTRITIONIX" | "CURATED" | "ESTIMATED" | "GENERIC";
  source_id?: string;
  confidence: number;
}

export type { EnrichedFood };

export interface EnrichmentResult {
  data: EnrichedFood | null;
  error: string | null;
  loading: boolean;
}

export function useManualFoodEnrichment() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enrich = useCallback(async (query: string, locale: string = 'auto', selectedCandidate?: any, item?: any): Promise<EnrichedFood | null> => {
    if (!query?.trim()) {
      setError('Query is required');
      return null;
    }

    // Check if this is a detected item needing nutrition hydration
    const isDetect = (item?.id || '').startsWith('detect-');
    const missingMacros =
      !item?.macros ||
      ((item.macros.protein ?? 0) === 0 &&
       (item.macros.carbs ?? 0) === 0 &&
       (item.macros.fat ?? 0) === 0);
    const missingKcal = !item?.calories || item.calories === 0;
    
    // 🔓 force hydration for detect items with missing nutrition
    const shouldHydrate = isDetect && (missingMacros || missingKcal);
    
    console.log('[ENRICH][DETECT_CHECK]', { 
      isDetect, 
      missingMacros, 
      missingKcal, 
      itemId: item?.id,
      shouldHydrate: isDetect && (missingMacros || missingKcal)
    });

    // PATCH: Handle generic candidates locally - preserve selection identity
    if (selectedCandidate?.flags?.generic === true) {
      console.info('[ENRICH][GENERIC]', { 
        name: selectedCandidate.name, 
        classId: selectedCandidate.classId 
      });
      
      const genericData = enrichFromGeneric(
        selectedCandidate.classId || 'generic_food', 
        selectedCandidate.canonicalKey || selectedCandidate.name
      );
      
      // Fetch canonical ingredients for all generic items
      let ingredientsList: string[] = [];
      if (selectedCandidate.canonicalKey) {
        try {
          const canonicalData = await fetchCanonicalNutrition(selectedCandidate.canonicalKey);
          ingredientsList = normalizeIngredients(canonicalData);
          console.log('[ENRICH][GENERIC][CANONICAL]', { 
            canonicalKey: selectedCandidate.canonicalKey,
            ingredientsFound: ingredientsList.length,
            first3: ingredientsList.slice(0, 3)
          });
        } catch (error) {
          console.warn('[ENRICH][GENERIC][CANONICAL-FAILED]', error);
        }
      }
      
      // Convert to ingredient objects format
      const baseIngredients = ingredientsList.map(name => ({ name }));
      
      return {
        name: selectedCandidate.name, // Keep exact name from selection
        displayName: selectedCandidate.displayName ?? selectedCandidate.name,
        selectionFlags: selectedCandidate.flags,
        selectionId: selectedCandidate.id,
        canonicalKey: selectedCandidate.canonicalKey,
        aliases: [],
        locale: locale || 'en',
        ingredients: baseIngredients, // Preserve canonical ingredients
        ingredientsList, // Add normalized list for adapter
        per100g: {
          calories: genericData.per100g.kcal,
          protein: genericData.per100g.protein_g,
          fat: genericData.per100g.fat_g,
          carbs: genericData.per100g.carbs_g,
          fiber: genericData.per100g.fiber_g,
          sugar: genericData.per100g.sugar_g,
          sodium: genericData.per100g.sodium_mg
        },
        perServing: genericData.portions?.[1] ? {
          serving_grams: genericData.portions[1].g,
          calories: Math.round(genericData.per100g.kcal * genericData.portions[1].g / 100),
          protein: Math.round(genericData.per100g.protein_g * genericData.portions[1].g / 100),
          fat: Math.round(genericData.per100g.fat_g * genericData.portions[1].g / 100),
          carbs: Math.round(genericData.per100g.carbs_g * genericData.portions[1].g / 100),
          fiber: genericData.per100g.fiber_g ? Math.round(genericData.per100g.fiber_g * genericData.portions[1].g / 100) : undefined,
          sugar: genericData.per100g.sugar_g ? Math.round(genericData.per100g.sugar_g * genericData.portions[1].g / 100) : undefined,
          sodium: genericData.per100g.sodium_mg ? Math.round(genericData.per100g.sodium_mg * genericData.portions[1].g / 100) : undefined
        } : undefined,
        source: "GENERIC",
        source_id: selectedCandidate.classId || 'generic_food',
        confidence: 0.8
      };
    }

    // Check feature flag
    const featureEnabled = localStorage.getItem('FEATURE_ENRICH_MANUAL_FOOD') !== 'false';
    if (!featureEnabled) {
      console.log('[ENRICH] Feature disabled, skipping enrichment');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      console.log(`[ENRICH][CLIENT] Calling enrich-manual-food: "${query}"`);
      
      const { data, error: functionError } = await supabase.functions.invoke<EnrichedFood>(
        'enrich-manual-food',
        { body: { query: query.trim(), locale } }
      );

      if (functionError) {
        console.error('[ENRICH][ERROR]', functionError);
        setError(functionError.message || 'Enrichment failed');
        return null;
      }

      if (data) {
        console.log(`[ENRICH][SUCCESS] Source: ${data.source}, Confidence: ${data.confidence}`);
        
        // NEW: Write-through to vault if enabled and from paid provider
        if (NV_WRITE_THROUGH && (data.source === 'EDAMAM' || data.source === 'NUTRITIONIX')) {
          try {
            const payload = {
              provider: data.source.toLowerCase() as 'edamam' | 'nutritionix',
              provider_ref: data.source_id || `${data.source.toLowerCase()}-${Date.now()}`,
              name: data.name,
              brand: undefined, // EnrichedFood doesn't have brand field
              class_id: undefined,
              region: 'US',
              per100g: {
                kcal: data.per100g.calories,
                protein_g: data.per100g.protein,
                carbs_g: data.per100g.carbs,
                fat_g: data.per100g.fat,
                fiber_g: data.per100g.fiber,
                sugar_g: data.per100g.sugar,
                sodium_mg: data.per100g.sodium
              },
              portion_defs: data.perServing ? {
                serving_grams: data.perServing.serving_grams,
                nutrition: data.perServing
              } : undefined,
              attribution: `Source: ${data.source}`,
              aliases: data.aliases.length > 0 ? data.aliases : undefined
            };

            const result = await nvWrite(payload);
            if (result.ok) {
              console.log(`[NV][WRITE] provider=${data.source} id=${result.id}`);
            }
          } catch (error) {
            console.error('[NV][WRITE] Write-through failed:', error);
            // Don't fail the enrichment for vault write errors
          }
        }
        
        return data;
      }

      // Apply fallback nutrition for detected items if still empty
      if ((missingMacros || missingKcal) && isDetect) {
        const grams = item?.gramsPerServing ?? item?.servingGrams ?? 100;
        
        // Apply whole food overrides for detected items
        if (isWholeFoodName(item?.name)) {
          // single-ingredient truth  
          (item as any).ingredients = [ (item!.name!).toLowerCase() ];
          // prevent the lazy ingredient adapter from replacing with 58-line labels
          (item as any).__disableLazyIngredients = true;
        }
        
        const filled = fillMacrosFromPer100(item?.name || '', grams);
        if (filled) {
          console.log('[ENRICH][FALLBACK]', { name: item?.name, grams, filled });
          
          // help per-gram path in the card
          (item as any).per100g = { 
            protein: filled.macros.protein, 
            carbs: filled.macros.carbs, 
            fat: filled.macros.fat, 
            kcal: Math.round(filled.macros.protein * 4 + filled.macros.carbs * 4 + filled.macros.fat * 9) 
          };
          
          return {
            name: item?.name || query,
            aliases: [],
            locale: locale || 'en',
            ingredients: [{ name: (item?.name || query).toLowerCase() }],
            ingredientsList: [(item?.name || query).toLowerCase()],
            per100g: {
              calories: Math.round(filled.macros.protein * 4 + filled.macros.carbs * 4 + filled.macros.fat * 9),
              protein: filled.macros.protein,
              carbs: filled.macros.carbs,
              fat: filled.macros.fat,
            },
            perServing: {
              serving_grams: grams,
              calories: filled.calories,
              protein: filled.macros.protein * (grams / 100),
              carbs: filled.macros.carbs * (grams / 100),
              fat: filled.macros.fat * (grams / 100),
            },
            source: "ESTIMATED",
            confidence: 0.7
          };
        }
      }

      return null;

    } catch (err: any) {
      console.error('[ENRICH][CATCH]', err);
      setError(err.message || 'Enrichment failed');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const enrichWithFallback = useCallback(async (
    query: string, 
    locale: string = 'auto',
    fallbackFn?: () => Promise<any>,
    selectedCandidate?: any,
    item?: any
  ): Promise<{ enriched: EnrichedFood | null; fallback: any }> => {
    const enriched = await enrich(query, locale, selectedCandidate, item);
    
    // If enrichment failed and we have a fallback, use it
    if (!enriched && fallbackFn) {
      console.log('[ENRICH] Falling back to legacy lookup');
      try {
        const fallback = await fallbackFn();
        return { enriched: null, fallback };
      } catch (err) {
        console.error('[ENRICH][FALLBACK] Failed:', err);
        return { enriched: null, fallback: null };
      }
    }

    return { enriched, fallback: null };
  }, [enrich]);

  return {
    enrich,
    enrichWithFallback,
    loading,
    error,
    clearError: () => setError(null)
  };
}

// Helper to convert EnrichedFood to FoodItem format for compatibility
export function enrichedToFoodItem(enriched: EnrichedFood, portionGrams: number = 100): any {
  const scale = portionGrams / 100;
  
  return {
    id: `enriched-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: enriched.name,
    brand: enriched.source_id || undefined,
    servingGrams: enriched.perServing?.serving_grams || 100,
    servingText: enriched.perServing ? `${enriched.perServing.serving_grams}g serving` : '100g',
    
    // Scale nutrition to portion size
    calories: Math.round(enriched.per100g.calories * scale),
    protein: Math.round((enriched.per100g.protein * scale) * 10) / 10,
    carbs: Math.round((enriched.per100g.carbs * scale) * 10) / 10,
    fat: Math.round((enriched.per100g.fat * scale) * 10) / 10,
    fiber: enriched.per100g.fiber ? Math.round((enriched.per100g.fiber * scale) * 10) / 10 : 0,
    sugar: enriched.per100g.sugar ? Math.round((enriched.per100g.sugar * scale) * 10) / 10 : 0,
    sodium: enriched.per100g.sodium ? Math.round(enriched.per100g.sodium * scale) : 0,
    saturated_fat: enriched.per100g.saturated_fat ? Math.round((enriched.per100g.saturated_fat * scale) * 10) / 10 : 0,
    
    // Additional metadata
    source: 'enriched',
    confidence: enriched.confidence,
    enrichmentSource: enriched.source,
    ingredients: enriched.ingredients,
    
    // Compatibility fields
    imageUrl: undefined,
    barcode: undefined,
    provider: enriched.source.toLowerCase()
  };
}
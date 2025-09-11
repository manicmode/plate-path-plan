import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { NV_WRITE_THROUGH } from '@/lib/flags';
import { nvWrite } from '@/lib/nutritionVault';

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
  aliases: string[];
  locale: string;
  ingredients: { name: string; grams?: number; amount?: string }[];
  per100g: Nutrients;
  perServing?: Nutrients & { serving_grams?: number };
  source: "FDC" | "EDAMAM" | "NUTRITIONIX" | "CURATED" | "ESTIMATED";
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

  const enrich = useCallback(async (query: string, locale: string = 'auto'): Promise<EnrichedFood | null> => {
    if (!query?.trim()) {
      setError('Query is required');
      return null;
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
    fallbackFn?: () => Promise<any>
  ): Promise<{ enriched: EnrichedFood | null; fallback: any }> => {
    const enriched = await enrich(query, locale);
    
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
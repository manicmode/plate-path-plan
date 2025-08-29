import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { buildAnalyzerTextFrom } from '@/utils/buildAnalyzerText';
import { useAuth } from '@/contexts/auth';

// Vision Extract interface for new extract mode
interface VisionExtract {
  kind: 'branded' | 'meal' | 'unknown';
  productName?: string;
  brand?: string;
  barcode?: string;
  ingredientsText?: string;
  nutrition?: {
    calories?: number;
    protein_g?: number;
    carbs_g?: number;
    fat_g?: number;
    sugar_g?: number;
    sodium_mg?: number;
    fiber_g?: number;
    satfat_g?: number;
  };
  confidence: number;
  notes?: string[];
}

export const useHealthCheckV2 = () => {
  console.log('[HC][MOUNT] v2');
  const { user } = useAuth();
  const currentRunId = useRef<string | null>(null);

  const lookupByGTIN = async (barcode: string): Promise<any> => {
    console.log('[BARCODE][LOOKUP]', { barcode });
    
    try {
      const { data, error } = await supabase.functions.invoke('barcode-lookup-global', {
        body: { barcode }
      });
      
      if (error || !data?.success) {
        console.log('[BARCODE][LOOKUP][MISS]', { barcode, error: error?.message });
        return null;
      }
      
      console.log('[BARCODE][LOOKUP][HIT]', { barcode, product: data.product.name });
      return {
        productName: data.product.name,
        brand: data.product.brand,
        ingredientsText: data.product.ingredients_text,
        nutrition: data.product.nutrition
      };
    } catch (error) {
      console.error('[BARCODE][LOOKUP][ERROR]', { barcode, error });
      return null;
    }
  };

  const openManualPrefilled = (productName?: string, brand?: string, ingredientsText?: string) => {
    console.log('[PHOTO][FALLBACK→MANUAL]', { 
      reason: 'low_conf_or_no_data',
      productName,
      brand,
      hasIngredients: !!ingredientsText 
    });
    
    // Navigate to manual entry with prefilled data
    const params = new URLSearchParams();
    if (productName) params.set('name', productName);
    if (brand) params.set('brand', brand);
    if (ingredientsText) params.set('ingredients', ingredientsText);
    
    const queryString = params.toString();
    const url = queryString ? `/scan?manual=true&${queryString}` : '/scan?manual=true';
    window.history.pushState(null, '', url);
    
    // Trigger manual entry state
    window.dispatchEvent(new CustomEvent('health-check:manual-entry', { 
      detail: { productName, brand, ingredientsText } 
    }));
  };

  const onAnalyzeImage = async (
    imageBase64: string, 
    detectedBarcode?: string,
    onResult?: (result: any, sourceMeta: any) => void,
    onError?: (error: string) => void
  ) => {
    const runId = crypto.randomUUID();
    currentRunId.current = runId;
    
    try {
      // A) Barcode path
      if (detectedBarcode) {
        console.log('[ANALYZE][BARCODE]', { barcode: detectedBarcode });
        
        const hit = await lookupByGTIN(detectedBarcode);
        if (hit?.nutrition || hit?.ingredientsText) {
          const text = buildAnalyzerTextFrom({
            productName: hit.productName,
            brand: hit.brand,
            ingredientsText: hit.ingredientsText,
            nutrition: hit.nutrition
          });
          
          console.log('[ANALYZE][REQ]', { source: 'photo', hasText: true, hasBarcode: true });
          
          const { data: result, error } = await supabase.functions.invoke('gpt-smart-food-analyzer', {
            body: { text }
          });
          
          if (currentRunId.current !== runId) return; // stale
          
          if (error) {
            console.error('[ANALYZE][ERROR]', { source: 'photo', error });
            onError?.('Analysis failed');
            return;
          }
          
          console.log('[ANALYZE][RES]', { source: 'photo', status: 'success' });
          
          onResult?.(result, {
            source: 'photo',
            barcode: detectedBarcode,
            productName: hit.productName
          });
          return;
        }
        // Keep going to vision if lookup miss
      }

      // B) Vision extraction (extract only, no health)
      console.log('[PHOTO][VISION][REQ]', { len: imageBase64.length });
      
      const { data: extract, error: visionError } = await supabase.functions.invoke('enhanced-health-scanner', {
        body: { 
          mode: 'extract', 
          imageBase64: imageBase64 
        }
      });
      
      if (currentRunId.current !== runId) return; // stale
      
      if (visionError) {
        console.error('[PHOTO][VISION][ERROR]', { error: visionError });
        onError?.('Vision extraction failed');
        return;
      }
      
      console.log('[PHOTO][VISION][RES]', {
        kind: extract?.kind,
        confidence: extract?.confidence,
        hasNutrition: !!extract?.nutrition,
        hasIngredients: !!extract?.ingredientsText
      });

      // C) Low-confidence fallback
      if (!extract || (extract.confidence < 0.55 && !extract.nutrition && !extract.ingredientsText)) {
        console.log('[PHOTO][FALLBACK→MANUAL]', { reason: 'low_conf_or_no_data' });
        openManualPrefilled(extract?.productName, extract?.brand, extract?.ingredientsText);
        return;
      }

      // D) Analyze using unified text path
      const text = buildAnalyzerTextFrom(extract);
      
      console.log('[ANALYZE][REQ]', { source: 'photo', hasText: true, hasVision: true });
      
      const { data: result, error: analyzeError } = await supabase.functions.invoke('gpt-smart-food-analyzer', {
        body: { text }
      });
      
      if (currentRunId.current !== runId) return; // stale
      
      if (analyzeError) {
        console.error('[ANALYZE][ERROR]', { source: 'photo', error: analyzeError });
        onError?.('Analysis failed');
        return;
      }
      
      console.log('[ANALYZE][RES]', { source: 'photo', status: 'success' });
      
      onResult?.(result, {
        source: 'photo',
        barcode: extract.barcode,
        productName: extract.productName
      });
      
    } catch (error) {
      if (currentRunId.current !== runId) return; // stale
      
      console.error('[ANALYZE][FATAL]', { error });
      onError?.('Analysis failed');
    }
  };

  return { onAnalyzeImage, lookupByGTIN };
};

// photoRouter.ts
import { analyzePhoto as ocrAnalyze } from '@/pipelines/photoPipeline';
import { supabase } from '@/integrations/supabase/client';
import { searchFoodByName, CanonicalSearchResult } from '@/lib/foodSearch';

export type PhotoRoute =
  | { kind: 'label'; data: any }
  | { kind: 'meal';  data: any };

function looksLikeNutritionLabel(text: string, labels: string[] = []) {
  const t = (text || '').toLowerCase();
  const tokens = ['nutrition facts','serving size','calories','total fat','sodium','dietary fiber','sugars'];
  const hitText = tokens.some(k => t.includes(k));
  const hitLabel = (labels || []).some(l =>
    (l || '').toLowerCase().includes('nutrition label')
    || (l || '').toLowerCase().includes('nutrition facts')
  );
  return hitText || hitLabel;
}

// Fuzzy mapping from Vision names to nutrition using existing search
async function mapVisionNameToNutrition(name: string): Promise<CanonicalSearchResult | null> {
  try {
    // First try direct search
    const results = await searchFoodByName(name, { maxResults: 3 });
    if (results.length > 0) {
      // Check for good similarity match
      const bestMatch = results[0];
      const nameTokens = name.toLowerCase().split(/\s+/);
      const matchTokens = bestMatch.name.toLowerCase().split(/\s+/);
      const overlap = nameTokens.filter(t => matchTokens.some(m => m.includes(t) || t.includes(m)));
      
      if (overlap.length > 0) {
        return bestMatch;
      }
    }
    
    // Fallback to generic category mapping
    const categoryMap: Record<string, string> = {
      fish: 'salmon cooked',
      salmon: 'salmon cooked', 
      chicken: 'chicken breast cooked',
      beef: 'beef sirloin cooked',
      steak: 'beef sirloin cooked',
      asparagus: 'asparagus cooked',
      tomato: 'tomato raw',
      rice: 'rice cooked',
      pasta: 'pasta cooked',
      bread: 'bread whole wheat',
      egg: 'eggs scrambled',
      lettuce: 'lettuce raw',
      salad: 'mixed greens raw'
    };
    
    const lowerName = name.toLowerCase();
    for (const [key, fallback] of Object.entries(categoryMap)) {
      if (lowerName.includes(key)) {
        const fallbackResults = await searchFoodByName(fallback, { maxResults: 1 });
        if (fallbackResults.length > 0) {
          return fallbackResults[0];
        }
      }
    }
    
    return null;
  } catch (e) {
    console.warn(`[PHOTO][MEAL] Failed to map "${name}":`, e);
    return null;
  }
}

async function analyzeMealBase64(b64: string, signal?: AbortSignal) {
  // Use new meal-detector with object localization
  console.debug('[PHOTO][MEAL] invoke=function=meal-detector');
  try {
    const { data, error } = await supabase.functions.invoke('meal-detector', {
      body: { image_base64: b64 },
    });
    if (error) {
      console.log('[PHOTO][MEAL] error:', error);
      throw error;
    }
    
    console.log('[PHOTO][MEAL] detector response:', data);
    const debug = data?._debug || {};
    console.log(`[PHOTO][MEAL][_debug] from=${debug.from} labels=${debug.labels?.length} web=${debug.web?.length} bestGuess=${debug.bestGuess?.length}`);
    
    const items = data?.items || [];
    const rawNames = items.map((i: any) => i.name);
    console.log(`[PHOTO][MEAL] items_detected=${items.length} raw_names=[${rawNames.join(',')}]`);
    
    // Map Vision names to nutrition
    const mappedItems = [];
    const skippedNames = [];
    
    for (const item of items) {
      const nutrition = await mapVisionNameToNutrition(item.name);
      if (nutrition) {
        mappedItems.push({
          ...item,
          nutritionData: nutrition
        });
      } else {
        skippedNames.push(item.name);
      }
    }
    
    const mappedNames = mappedItems.map(i => i.nutritionData.name);
    console.log(`[PHOTO][MEAL] names=${rawNames.join(',')} -> mapped=${mappedNames.join(',')} skipped=[${skippedNames.join(',')}]`);
    
    return { items: mappedItems, skippedCount: skippedNames.length };
  } catch (e) {
    console.debug('[PHOTO][MEAL] analyzer unavailable', e);
    return { items: [], skippedCount: 0 };
  }
}

export async function routePhoto(b64: string, abort?: AbortSignal): Promise<PhotoRoute> {
  console.log('[PHOTO][ROUTE] Starting photo analysis...');
  
  // Try OCR first; if it throws, fall back to meal (don't redirect)
  try {
    const ocr = await supabase.functions.invoke('vision-ocr', { 
      body: { image_base64: b64 }
    });
    
    // @ts-ignore
    if (ocr.error) throw ocr.error;
    
    const data = ocr.data;
    const text = data?.text || '';
    const labels = data?.labels || [];
    const debug = data?._debug || {};
    
    console.log(`[PHOTO][OCR] text_len=${debug.text_len || text.length}, labels=${debug.labels_count || labels.length}`);
    
    if (looksLikeNutritionLabel(text, labels)) {
      console.log('[PHOTO][ROUTE] kind=label');
      return { kind: 'label', data };
    }
  } catch (e: any) {
    console.error('[PHOTO][OCR] failed:', e?.message || e);
    // continue to meal detection
  }

  // Try meal detection with nutrition mapping
  const mealResult = await analyzeMealBase64(b64, abort);
  const items = mealResult.items || [];
  
  console.log(`[PHOTO][ROUTE] kind=meal mapped_items=${items.length} skipped=${mealResult.skippedCount || 0}`);
  
  return { kind: 'meal', data: { items, skippedCount: mealResult.skippedCount } };
}
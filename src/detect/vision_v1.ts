import { supabase } from '@/integrations/supabase/client';
import { isFeatureEnabled } from '@/lib/featureFlags';

export interface DetectionResult {
  items: string[];
  imageWH?: { width: number; height: number };
  plateBBox?: { x: number; y: number; width: number; height: number };
  objects: Array<{ name: string; score: number; bbox?: any }>;
  labels: Array<{ name: string; score: number }>;
  _debug: {
    from: 'objects' | 'labels' | 'labels_generic' | 'ensemble' | 'none';
    rawObjectsCount: number;
    rawLabelsCount: number;
    keptObjectsCount: number;
    keptLabelsCount: number;
    specificObjectsCount?: number;
    specificLabelsCount?: number;
    sampleObjects?: string[];
    sampleLabels?: string[];
    confidence?: 'high' | 'medium' | 'low';
    ensembleUsed?: boolean;
    reason?: string;
  };
}

export async function detectFoodVisionV1(base64: string): Promise<DetectionResult> {
  try {
    const { data, error } = await supabase.functions.invoke('meal-detector-v1', { 
      body: { image_base64: base64 } 
    });
    
    if (error) throw error;

    const result: DetectionResult = {
      items: data?.items ?? [], 
      imageWH: data?.imageWH ?? undefined,
      plateBBox: data?.plateBBox ?? undefined,
      objects: data?.objects ?? [],
      labels: data?.labels ?? [],
      _debug: data?._debug ?? { 
        from: 'none',
        rawObjectsCount: 0,
        rawLabelsCount: 0,
        keptObjectsCount: 0,
        keptLabelsCount: 0
      }
    };

    if (import.meta.env.DEV) {
      console.info('[DETECT][v1]', {
        objects: result._debug.rawObjectsCount,
        labels: result._debug.rawLabelsCount,
        chosen: result._debug.from,
        foods: result.items.slice(0, 5)
      });
    }

    if (isFeatureEnabled('lyf_ensemble') && shouldUseEnsemble(result)) {
      try {
        const { data: fallbackData, error: fallbackError } = await supabase.functions.invoke('meal-detector-fallback-gpt', {
          body: { image_base64: base64 }
        });

        if (!fallbackError && fallbackData?.names?.length > 0) {
          const mergedItems = [...new Set([...result.items, ...fallbackData.names])];
          result.items = mergedItems;
          result._debug.ensembleUsed = true;
          result._debug.from = 'ensemble';
          result._debug.reason = 'vision_low_conf';

          if (import.meta.env.DEV) {
            console.info('[DETECT][ensemble]', {
              merged: mergedItems,
              reason: 'vision_low_conf'
            });
          }
        }
      } catch (ensembleError) {
        console.warn('[DETECT][ensemble] fallback failed:', ensembleError);
      }
    }

    return result;
  } catch (error) {
    console.error('[DETECT][v1] error:', error);
    throw error;
  }
}

function shouldUseEnsemble(result: DetectionResult): boolean {
  if (result.items.length === 0) return true;
  
  const genericTerms = ['food', 'dish', 'meal', 'ingredient', 'produce'];
  const hasSpecific = result.items.some(item => 
    !genericTerms.some(generic => item.toLowerCase().includes(generic))
  );
  
  return !hasSpecific;
}

// Food filtering - keep existing NEG list but do NOT drop nouns extracted by edge
const NEG = /\b(plate|dish|bowl|cutlery|fork|spoon|knife|napkin|logo|brand|pack|sleeve|kit|box|package|message|screen|monitor)\b/i;

export function filterFoodish(items: string[]): string[] {
  return items.filter(item => {
    const t = (item || '').toLowerCase().trim();
    return t.length > 2 && !NEG.test(t);
  });
}

// Legacy export for backward compatibility
export async function detectFoodVisionV1Simple(supabase: any, base64: string) {
  const result = await detectFoodVisionV1(base64);
  return { 
    items: result.items, 
    _debug: result._debug 
  };
}

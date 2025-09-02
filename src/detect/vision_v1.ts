import { supabase } from '@/integrations/supabase/client';

export interface VisionFood {
  name: string;
  source: 'object' | 'label';
  bbox?: { x: number; y: number; width: number; height: number; };
  score?: number;
}

export interface VisionV1Result {
  imageWH?: { width: number; height: number };
  plateBBox?: { x: number; y: number; width: number; height: number };
  objects: Array<{ name: string; bbox?: any; score: number }>;
  labels: Array<{ name: string; score: number }>;
  chosen: 'objects' | 'labels' | 'labels_generic' | 'none';
  foods: VisionFood[];
  _debug?: any;
}

export async function detectFoodVisionV1(base64: string): Promise<VisionV1Result> {
  try {
    const { data, error } = await supabase.functions.invoke('meal-detector-v1', { 
      body: { image_base64: base64 } 
    });
    
    if (error) throw error;

    // Process the response into our structured format
    const objects = data?.objects ?? [];
    const labels = data?.labels ?? [];
    const items = data?.items ?? [];
    const chosen = data?._debug?.from ?? 'none';

    // Create foods array with source information
    const foods: VisionFood[] = items.map((name: string) => {
      // Try to find matching object with bbox
      const matchingObject = objects.find((obj: any) => 
        obj.name.toLowerCase().includes(name.toLowerCase()) || 
        name.toLowerCase().includes(obj.name.toLowerCase())
      );

      if (matchingObject) {
        return {
          name,
          source: 'object' as const,
          bbox: matchingObject.bbox,
          score: matchingObject.score
        };
      }

      // Otherwise it came from labels
      const matchingLabel = labels.find((label: any) => 
        label.name.toLowerCase().includes(name.toLowerCase()) || 
        name.toLowerCase().includes(label.name.toLowerCase())
      );

      return {
        name,
        source: 'label' as const,
        score: matchingLabel?.score
      };
    });

    const result: VisionV1Result = {
      imageWH: data?.imageWH,
      plateBBox: data?.plateBBox,
      objects,
      labels,
      chosen,
      foods,
      _debug: data?._debug
    };

    // DEV-only logging
    if (import.meta.env.DEV) {
      console.info('[VISION][v1]', {
        objects: objects.length,
        labels: labels.length,
        chosen,
        foods: foods.length,
        items: foods.map(f => f.name).slice(0, 5)
      });
    }

    return result;
  } catch (error) {
    console.error('[VISION][v1] error:', error);
    throw error;
  }
}

// Food filtering - keep existing NEG list but do NOT drop nouns extracted by edge
const NEG = /\b(plate|dish|bowl|cutlery|fork|spoon|knife|napkin|logo|brand|pack|sleeve|kit|box|package|message|screen|monitor)\b/i;

export function filterFoodish(items: string[]): string[] {
  return items.filter(item => {
    const t = (item || '').toLowerCase().trim();
    return t.length > 2 && !NEG.test(t);
  });
}

// Legacy compatibility
export async function detectFoodVisionV1Simple(supabase: any, base64: string) {
  const result = await detectFoodVisionV1(base64);
  return { 
    items: result.foods.map(f => f.name), 
    _debug: result._debug 
  };
}

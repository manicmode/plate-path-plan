import { supabase } from '@/integrations/supabase/client';

export interface GptVisionResult {
  names: string[];
  model?: string;
  _debug?: any;
}

// Tolerant item extraction for GPT + legacy shapes
export function extractItems(obj: any): any[] {
  if (!obj) return [];
  if (Array.isArray(obj.items)) return obj.items;
  if (Array.isArray(obj.result?.items)) return obj.result.items;
  if (Array.isArray(obj.foods)) return obj.foods;
  if (Array.isArray(obj.detections)) return obj.detections;
  return [];
}

export async function detectFoodGptV(base64: string): Promise<GptVisionResult> {
  // Timing breadcrumbs (prevents silent hangs)
  const requestId = crypto.randomUUID();
  console.time(`[PHOTO][${requestId}][capture→edge]`);
  
  try {
    // right before fetch
    console.time(`[PHOTO][${requestId}][edge]`);
    const { data, error } = await supabase.functions.invoke('gpt-food-detector-v2', {
      body: { image_base64: base64 }
    });
    console.timeEnd(`[PHOTO][${requestId}][edge]`); // duration from request to first byte

    // Tolerant item extraction for GPT + legacy shapes
    const items = extractItems(data);

    // Keep the signal in debug, but NEVER throw
    if (import.meta.env.VITE_DEBUG_CLIENT && items.length === 0 && data) {
      console.warn('[PHOTO][SCHEMA_MISMATCH]', requestId, data);
    }

    if (error) {
      console.warn('[GPT][v2] Failed, falling back to v1:', error);
      // Fallback to old endpoint
      const fallbackResponse = await supabase.functions.invoke('meal-detector-fallback-gpt', {
        body: { image_base64: base64 }
      });
      
      if (fallbackResponse.error) throw fallbackResponse.error;
      
      const fallbackResult: GptVisionResult = {
        names: fallbackResponse.data?.names ?? [],
        model: fallbackResponse.data?.model,
        _debug: { ...fallbackResponse.data?._debug, fallback_used: true }
      };
      return fallbackResult;
    }

    // Process structured response from V2  
    const names = items.map((item: any) => item.name);

    const result: GptVisionResult = {
      names,
      model: data?.model || 'gpt-4o-v2',
      _debug: {
        ...data?._debug,
        structured_items: items.length,
        raw_items: items, // Store raw items for gptFirst conversion
        has_categories: items.some((i: any) => i.category),
        has_portions: items.some((i: any) => i.portion_estimate)
      }
    };

    console.timeEnd(`[PHOTO][${requestId}][capture→edge]`); // full network timing

    // DEV-only logging
    if (import.meta.env.DEV) {
      console.info('[GPT][v2]', {
        model: result.model,
        foods: result.names.length,
        items: result.names.slice(0, 5),
        structured: items.length > 0
      });
    }

    return result;
  } catch (error) {
    console.error('[PHOTO][JSON_PARSE_ERR]', requestId, error);
    console.error('[GPT][vision] error:', error);
    // Return empty result on error - don't break the pipeline
    return { names: [] };
  }
}
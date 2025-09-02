import { supabase } from '@/integrations/supabase/client';

export interface GptVisionResult {
  names: string[];
  model?: string;
  _debug?: any;
}

export async function detectFoodGptV(base64: string): Promise<GptVisionResult> {
  try {
    const { data, error } = await supabase.functions.invoke('meal-detector-fallback-gpt', {
      body: { image_base64: base64 }
    });

    if (error) throw error;

    const result: GptVisionResult = {
      names: data?.names ?? [],
      model: data?.model,
      _debug: data?._debug
    };

    // DEV-only logging
    if (import.meta.env.DEV) {
      console.info('[GPT][vision]', {
        model: result.model,
        foods: result.names.length,
        items: result.names.slice(0, 5)
      });
    }

    return result;
  } catch (error) {
    console.error('[GPT][vision] error:', error);
    // Return empty result on error - don't break the pipeline
    return { names: [] };
  }
}
// Calls your existing Supabase Edge Function that talks to GPT VLM.
// We saw "[PHOTO][MEAL] invoke-function: meal-detector" in logs, so we re-use it.
import { supabase } from '@/integrations/supabase/client';

export type GptItem = { name: string; category?: string; confidence?: number };

export async function gptDetectItems(imageBase64: string, timeoutMs = 8000): Promise<GptItem[]> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    // Ensure proper base64 format (normalize before sending)
    const b64Out = imageBase64.startsWith('data:image/') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`;
    
    const body = { image_b64: b64Out, mode: 'gpt-first' };
    console.log('[UPLOAD] invoking meal-detector with keys=' + JSON.stringify(Object.keys(body)));
    
    const { data, error } = await supabase.functions.invoke('meal-detector', {
      body,
    });
    if (error) {
      console.warn('[GPT-DETECT] edge error', error);
      return [];
    }
    // Expect shape: { items:[{name, category, confidence}], ... }
    const items = Array.isArray(data?.items) ? data.items : [];
    return items.map((x: any) => ({
      name: x?.name ?? '',
      category: x?.category ?? x?.cat ?? '',
      confidence: typeof x?.confidence === 'number' ? x.confidence : Number(x?.score ?? 0.7),
    }));
  } catch (e) {
    console.warn('[GPT-DETECT] exception', e);
    return [];
  } finally {
    clearTimeout(t);
  }
}
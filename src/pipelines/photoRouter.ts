// photoRouter.ts
import { analyzePhoto as ocrAnalyze } from '@/pipelines/photoPipeline';
import { supabase } from '@/integrations/supabase/client';

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
    console.log('[PHOTO][MEAL] preflight_ok=true');
    
    const items = data?.items || [];
    console.log('[PHOTO][MEAL] items_detected=', items.length);
    
    return { items };
  } catch (e) {
    console.debug('[PHOTO][MEAL] analyzer unavailable', e);
    return { items: [] };
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
    
    console.log('[PHOTO][OCR] success, text_len=', text.length, 'labels=', labels.length);
    
    if (looksLikeNutritionLabel(text, labels)) {
      console.log('[PHOTO][ROUTE] kind=label');
      return { kind: 'label', data };
    }
  } catch (e: any) {
    console.error('[PHOTO][OCR] invoke_failed', e?.message || e);
    // continue to meal detection
  }

  // Try meal detection
  const meal = await supabase.functions.invoke('meal-detector', { 
    body: { image_base64: b64 }
  });
  
  // @ts-ignore
  const items = meal?.data?.items || [];
  console.debug('[PHOTO][MEAL] items_detected=', items.length);
  
  return { kind: 'meal', data: { items } };
}
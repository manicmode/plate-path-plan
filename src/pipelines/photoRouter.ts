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
  // Use existing gpt5-vision-food-detector for meal detection
  console.log('[PHOTO][MEAL] invoke=function=gpt5-vision-food-detector');
  try {
    const { data, error } = await supabase.functions.invoke('gpt5-vision-food-detector', {
      body: { imageBase64: b64 },
      // Temporarily remove x-client header to avoid CORS issues
      // headers: { 'x-client': 'voyage-photo-v2' },
    });
    if (error) {
      console.log('[PHOTO][MEAL] error:', error);
      throw error;
    }
    
    console.log('[PHOTO][MEAL] detector response:', data);
    console.log('[PHOTO][MEAL] preflight_ok=true');
    
    // Convert to expected format: { items: [{name, confidence, portion?, grams?, imageUrl?}, ...] }
    const items = (data?.foodItems || []).map((name: string, index: number) => ({
      name,
      confidence: 0.85, // Default confidence from GPT-5 vision
      portion: null, // No portion data from detector
      grams: null, // No grams data from detector
      imageUrl: null // Will be added from OCR
    }));
    
    return { items };
  } catch (e) {
    console.debug('[PHOTO][MEAL] analyzer unavailable', e);
    return { items: [] };
  }
}

export async function routePhoto(b64: string, abort?: AbortSignal): Promise<PhotoRoute> {
  console.log('[PHOTO][ROUTE] Starting photo analysis...');
  
  try {
    // Convert base64 to blob for OCR analysis
    const base64Data = b64.includes(',') ? b64.split(',')[1] : b64;
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: 'image/jpeg' });
    
    const ocrResult = await ocrAnalyze({ blob }, { force: false, offline: false });
    
    if (ocrResult.ok) {
      const ocr = ocrResult.report; // returns { text, labels, portion, servings, imageUrl }
      const text = ocr?.text || '';
      const labels = ocr?.labels || [];
      
      console.log('[PHOTO][ROUTE]', { 
        ocr_len: text.length, 
        labels_count: labels.length 
      });
      
      if (looksLikeNutritionLabel(text, labels)) {
        console.log('[PHOTO][ROUTE] kind=label, ocr_len=', text.length, ', labels_count=', labels.length);
        return { kind: 'label', data: ocr };
      }
      
      // Continue to meal analysis with OCR data
      const meal = await analyzeMealBase64(b64, abort);
      const mealWithImage = { 
        ...meal, 
        imageUrl: ocr?.imageUrl 
      };
      
      console.log('[PHOTO][ROUTE] kind=meal, ocr_len=', text.length, ', labels_count=', labels.length);
      console.log('[PHOTO][MEAL] items_detected=', meal.items.length);
      
      return { kind: 'meal', data: mealWithImage };
    } else {
      throw new Error('OCR analysis failed');
    }
  } catch (e) {
    console.debug('[PHOTO][ROUTE] OCR failed, falling back to meal:', e?.message || e);
    // Fallback to meal analysis without OCR data
    const meal = await analyzeMealBase64(b64, abort);
    console.log('[PHOTO][ROUTE] kind=meal (fallback)');
    console.log('[PHOTO][MEAL] items_detected=', meal.items.length);
    return { kind: 'meal', data: meal };
  }
}
import { supabase } from '@/integrations/supabase/client';
import { bytesToBase64JPEG, bytesToBase64Node } from './bytesToBase64';

export type OCRResult = { text: string };
export interface OCR { extractText(imageBytes: Uint8Array): Promise<OCRResult>; }

// New OCR function that calls dedicated vision-ocr edge function
export async function getOCR(base64: string): Promise<{ ok: boolean; text: string; textLen: number; reason?: string }> {
  const DEBUG = import.meta.env.VITE_DEBUG_PERF === 'true';
  
  try {
    // Use Supabase SDK invoke (automatically adds auth token)
    const { data, error } = await supabase.functions.invoke('vision-ocr', {
      body: {
        mode: import.meta.env.VITE_VISION_MODE || 'document',
        imageBase64: base64.replace(/^data:image\/\w+;base64,/, '')
      }
    });

    if (error) {
      if (DEBUG) {
        console.info('[PHOTO][OCR][INV_ERR]', error);
      }
      return {
        ok: false,
        text: '',
        textLen: 0,
        reason: error.message?.includes('401') ? 'auth_required' : 'invoke_error'
      };
    }

    if (DEBUG) {
      console.info('[PHOTO][OCR][RESP]', data);
    }

    if (!data?.ok) {
      return { 
        ok: false, 
        text: '', 
        textLen: 0, 
        reason: data?.reason ?? 'unknown' 
      };
    }

    return {
      ok: true,
      text: data.text || '',
      textLen: data.textLen || 0
    };
  } catch (error) {
    if (DEBUG) {
      console.error('[PHOTO][OCR][ERROR]', error);
    }
    return {
      ok: false,
      text: '',
      textLen: 0,
      reason: 'network_error'
    };
  }
}

// Legacy function for backward compatibility
export async function getOCRProvider(): Promise<OCR | null> {
  const raw = (import.meta.env.VITE_PHOTO_OCR_PROVIDER ?? '').toString();
  const provider = raw.trim().toLowerCase();
  const DEBUG = import.meta.env.VITE_DEBUG_PERF === 'true';
  if (DEBUG) console.info('[PHOTO][OCR][CFG]', { raw, provider });

  if (provider !== 'vision') return null;

  const vision: OCR = {
    async extractText(imageBytes: Uint8Array) {
      // Convert bytes to base64
      let image_base64 = '';
      if (typeof window !== 'undefined' && typeof FileReader !== 'undefined') {
        image_base64 = await bytesToBase64JPEG(imageBytes);
      } else {
        image_base64 = bytesToBase64Node(imageBytes);
      }

      // Call new OCR function
      const result = await getOCR(image_base64);
      return { text: result.text };
    }
  };

  return vision;
}
import { bytesToBase64JPEG, bytesToBase64Node } from './bytesToBase64';

export type OCRResult = { text: string };
export interface OCR { extractText(imageBytes: Uint8Array): Promise<OCRResult>; }

// New OCR function that calls dedicated vision-ocr edge function
export async function getOCR(base64: string): Promise<{ ok: boolean; text: string; textLen: number; reason?: string }> {
  const DEBUG = import.meta.env.VITE_DEBUG_PERF === 'true';
  const enabled = import.meta.env.VITE_PHOTO_OCR_PROVIDER === 'vision';
  
  if (!enabled) {
    if (DEBUG) console.info('[PHOTO][OCR][CFG]', { provider: 'disabled' });
    return { ok: false, text: '', textLen: 0, reason: 'provider_disabled' };
  }

  const url = 'https://uzoiiijqtahohfafqirm.supabase.co/functions/v1/vision-ocr';

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        image: base64.replace(/^data:image\/\w+;base64,/, ''),
        provider: 'vision'
      }),
    });

    const ctype = res.headers.get('content-type') || '';
    const data = ctype.includes('application/json')
      ? await res.json().catch(() => null)
      : null;

    if (DEBUG) {
      console.info('[PHOTO][OCR][HTTP]', { status: res.status, ok: res.ok, ctype });
      console.info('[PHOTO][OCR][RESP]', data ?? { reason: 'non_json_response' });
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
      text: data.text as string, 
      textLen: data.textLen as number 
    };

  } catch (error) {
    if (DEBUG) console.error('[PHOTO][OCR][ERROR]', error);
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
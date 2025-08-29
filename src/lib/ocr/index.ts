export type OCRResult = { text: string; blocks?: any[] };

export interface OCR {
  extractText(imageBytes: Uint8Array): Promise<OCRResult>;
}

export async function getOCR(): Promise<OCR | null> {
  const raw = (import.meta.env.VITE_PHOTO_OCR_PROVIDER ?? '').toString();
  const provider = raw.trim().toLowerCase();
  const DEBUG = import.meta.env.VITE_DEBUG_PERF === 'true';

  if (DEBUG) console.info('[PHOTO][OCR][CFG]', { raw, provider });

  if (provider !== 'vision') {
    if (DEBUG) console.info('[PHOTO][OCR]', { skipped: true, reason: 'provider_mismatch', expected: 'vision', got: provider });
    return null;
  }

  // Vision-backed OCR through our edge function (server can swap impl)
  const vision: OCR = {
    async extractText(imageBytes: Uint8Array) {
      const body = {
        mode: 'ocr',
        imageBase64: typeof window === 'undefined'
          ? Buffer.from(imageBytes).toString('base64')
          : btoa(String.fromCharCode(...imageBytes)),
      };
      
      if (DEBUG) console.info('[PHOTO][OCR][REQUEST]', { mode: body.mode, imageSize: imageBytes.length });
      
      const res = await fetch('/functions/v1/enhanced-health-scanner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      
      if (!res.ok) {
        const errorText = await res.text().catch(() => 'unknown error');
        throw new Error(`OCR request failed: ${res.status} - ${errorText}`);
      }
      
      const data = await res.json();
      const text = data?.extractedText ?? data?.text ?? '';
      
      if (DEBUG) console.info('[PHOTO][OCR][RESPONSE]', { 
        textLength: text.length, 
        hasText: !!text,
        preview: text.substring(0, 100) + (text.length > 100 ? '...' : '')
      });
      
      return { text };
    }
  };
  
  return vision;
}
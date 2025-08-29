import { bytesToBase64JPEG, bytesToBase64Node } from './bytesToBase64';

export type OCRResult = { text: string };
export interface OCR { extractText(imageBytes: Uint8Array): Promise<OCRResult>; }

export async function getOCR(): Promise<OCR | null> {
  const raw = (import.meta.env.VITE_PHOTO_OCR_PROVIDER ?? '').toString();
  const provider = raw.trim().toLowerCase();
  const DEBUG = import.meta.env.VITE_DEBUG_PERF === 'true';
  if (DEBUG) console.info('[PHOTO][OCR][CFG]', { raw, provider });

  if (provider !== 'vision') return null;

  const vision: OCR = {
    async extractText(imageBytes: Uint8Array) {
      // 2.1 compress already happened upstream; here we only encode + send
      let image_base64 = '';
      if (typeof window !== 'undefined' && typeof FileReader !== 'undefined') {
        image_base64 = await bytesToBase64JPEG(imageBytes);   // SAFE
      } else {
        image_base64 = bytesToBase64Node(imageBytes);         // SSR fallback
      }

      // 2.2 hard cap payload (~2 MB base64); if too big, short-circuit with friendly error
      const approxBytes = Math.ceil(image_base64.length * 0.75);
      if (approxBytes > 2_000_000) {
        if (DEBUG) console.warn('[PHOTO][OCR][CAP]', { approxBytes });
        throw new Error('payload_too_large');
      }

      const body = { mode: 'ocr', image_base64, contentType: 'image/jpeg' };

      const res = await fetch('/functions/v1/enhanced-health-scanner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (DEBUG) {
        console.info('[PHOTO][OCR][HTTP]', { status: res.status, ok: res.ok });
      }

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        if (DEBUG) console.warn('[PHOTO][OCR][HTTP_ERR]', { status: res.status, text: text.slice(0, 200) });
        throw new Error(`ocr_http_${res.status}`);
      }

      const data = await res.json().catch(() => ({}));
      if (DEBUG) console.info('[PHOTO][OCR][RESP]', { ok: data?.ok, textLen: data?.textLen, reason: data?.reason });
      
      const text = data?.text ?? '';
      return { text };
    }
  };

  return vision;
}
// src/lib/ocrClient.ts
import { resolveFunctionsBase } from '@/lib/net/functionsBase';
import { getAuthHeaders } from '@/lib/net/authHeaders';

export interface OCRResult {
  ok: boolean;
  ts: number;
  duration_ms: number;
  origin: string;
  summary: {
    text_joined: string;
    words: number;
  };
  blocks: Array<{
    type: string;
    content: string;
  }>;
  meta: {
    bytes: number;
    mime: string;
  };
  error?: string;
  message?: string;
}

export async function callOCRFunction(
  blob: Blob, 
  options: { withAuth?: boolean } = { withAuth: true }
): Promise<OCRResult> {
  const base = resolveFunctionsBase();
  const url = `${base}/vision-ocr`;
  
  const formData = new FormData();
  formData.append('image', blob, 'image.jpg');

  const headers = await getAuthHeaders(options.withAuth);
  
  const response = await fetch(url, {
    method: 'POST',
    body: formData,
    headers: headers
  });

  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(result.message || result.error || `HTTP ${response.status}`);
  }
  
  return result;
}

export async function callOCRFunctionWithDataUrl(
  dataUrl: string,
  options: { withAuth?: boolean } = { withAuth: true }
): Promise<OCRResult> {
  const base = resolveFunctionsBase();
  const url = `${base}/vision-ocr`;
  
  const headers = await getAuthHeaders(options.withAuth);
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ dataUrl })
  });

  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(result.message || result.error || `HTTP ${response.status}`);
  }
  
  return result;
}
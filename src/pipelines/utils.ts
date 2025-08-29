/**
 * Shared utilities for isolated pipelines
 * Pure functions with no side effects
 */

// Utility for extracting blob from video element
export async function blobFromVideo(video: HTMLVideoElement, maxDim = 1280, quality = 0.72) {
  const vw = video.videoWidth, vh = video.videoHeight;
  const scale = Math.min(1, maxDim / Math.max(vw, vh));
  const outW = Math.max(1, Math.round(vw * scale));
  const outH = Math.max(1, Math.round(vh * scale));

  const canvas = document.createElement('canvas');
  canvas.width = outW; canvas.height = outH;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(video, 0, 0, outW, outH);

  const blob: Blob | null = await new Promise(res => canvas.toBlob(res, 'image/jpeg', quality));
  if (!blob) throw new Error('blob_null');

  return { blob, outW, outH };
}

// Common network utilities
export async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 15000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}
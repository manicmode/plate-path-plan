import { MultiPassBarcodeScanner } from '@/utils/barcodeScan';

export interface FreezeDecodeOptions {
  roi?: { widthPct: number; heightPct: number };
  budgetMs?: number;
}

export interface FreezeDecodeResult {
  raw: string | null;
  result: any;
  overlay: HTMLCanvasElement;
  video: HTMLVideoElement;
}

/**
 * Shared helper for freeze frame and barcode decode functionality
 */
export async function freezeFrameAndDecode(
  video: HTMLVideoElement, 
  { roi = { widthPct: 0.7, heightPct: 0.35 }, budgetMs = 900 }: FreezeDecodeOptions = {}
): Promise<FreezeDecodeResult> {
  console.time('[HS] snap_total');
  
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  const cx = Math.round(vw * (1 - roi.widthPct) / 2);
  const cy = Math.round(vh * (1 - roi.heightPct) / 2);
  const cw = Math.round(vw * roi.widthPct);
  const ch = Math.round(vh * roi.heightPct);

  // Try takePhoto → grabFrame → drawImage
  const track = (video.srcObject as MediaStream)?.getVideoTracks?.()?.[0];
  const ic = (typeof window !== 'undefined' && 'ImageCapture' in window && track) ? new (window as any).ImageCapture(track) : null;
  let bitmap: ImageBitmap | null = null;

  try {
    if (ic?.takePhoto) {                           // Best quality (iOS 16+ varies)
      console.log('[HS] snap_src: takePhoto');
      const blob = await ic.takePhoto();
      bitmap = await createImageBitmap(blob);
    } else if (ic?.grabFrame) {
      console.log('[HS] snap_src: grabFrame');
      bitmap = await ic.grabFrame();
    } else {
      console.log('[HS] snap_src: drawImage');
      // we'll draw from <video> directly
    }
  } catch { 
    console.log('[HS] snap_src: drawImage (fallback)');
    /* fall through to drawImage */ 
  }

  // Create/get freeze overlay canvas
  const overlay = ensureFreezeCanvasOverlay(video);
  const ctx = overlay.getContext('2d')!;
  overlay.width = vw; 
  overlay.height = vh;
  
  if (bitmap) {
    ctx.drawImage(bitmap, 0, 0);
  } else {
    ctx.drawImage(video, 0, 0, vw, vh);
  }
  
  // Show freeze overlay
  overlay.style.opacity = '1';   // ❄️ visible freeze
  video.style.opacity = '0.01';  // hide live preview under it

  // Crop ROI into a working canvas
  const roiCanvas = document.createElement('canvas');
  roiCanvas.width = cw; 
  roiCanvas.height = ch;
  roiCanvas.getContext('2d')!.drawImage(overlay, cx, cy, cw, ch, 0, 0, cw, ch);
  console.log('[HS] roi', { vw, vh, roiW: cw, roiH: ch });

  // Decode with ZXing (no torch!)
  console.time('[HS] decode');
  const scanner = new MultiPassBarcodeScanner();
  const result = await scanner.scanQuick(roiCanvas);
  console.timeEnd('[HS] decode');
  
  const raw = result?.text ?? null;
  console.log('[HS] barcode_result:', { 
    raw, 
    type: result?.format ?? null, 
    checksumOk: result?.checkDigitValid ?? null, 
    reason: result ? 'decoded' : 'not_found' 
  });

  console.timeEnd('[HS] snap_total');
  return { raw, result, overlay, video };
}

/**
 * Create or reuse freeze overlay canvas positioned over video
 */
function ensureFreezeCanvasOverlay(video: HTMLVideoElement): HTMLCanvasElement {
  const existingOverlay = video.parentElement?.querySelector('.freeze-overlay') as HTMLCanvasElement;
  if (existingOverlay) {
    return existingOverlay;
  }

  const overlay = document.createElement('canvas');
  overlay.className = 'freeze-overlay';
  overlay.style.position = 'absolute';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100%';
  overlay.style.height = '100%';
  overlay.style.opacity = '0';
  overlay.style.pointerEvents = 'none';
  overlay.style.zIndex = '10';
  
  if (video.parentElement) {
    video.parentElement.style.position = 'relative';
    video.parentElement.appendChild(overlay);
  }
  
  return overlay;
}

/**
 * Unfreeze the video preview
 */
export function unfreezeVideo(video: HTMLVideoElement) {
  const overlay = video.parentElement?.querySelector('.freeze-overlay') as HTMLCanvasElement;
  if (overlay) {
    overlay.style.opacity = '0';
  }
  video.style.opacity = '1';
}

/**
 * Convert barcode result to string using preferred format
 */
export function chooseBarcode(result: any): string | null {
  if (!result?.text) return null;
  
  const raw = result.text;
  
  // Prefer UPC-A -> EAN-13 -> raw
  if (result.format === 'UPC_A' && raw.length === 12) {
    return '0' + raw; // Convert UPC-A to EAN-13
  }
  
  if (result.format === 'EAN_13' || /^\d{13}$/.test(raw)) {
    return raw;
  }
  
  return raw;
}

/**
 * Toggle torch on/off for a video track
 */
export function toggleTorch(track: MediaStreamTrack, on: boolean): Promise<void> {
  const caps = track.getCapabilities?.();
  if (!caps || !('torch' in caps)) {
    console.log('[HS] torch not supported');
    return Promise.resolve();
  }
  
  return track.applyConstraints({ 
    advanced: [{ torch: on } as any] 
  }).then(() => {
    console.log('[HS] torch', { on });
  }).catch((error) => {
    console.log('[HS] torch failed:', error);
  });
}

/**
 * Check if torch is supported on the given track
 */
export function isTorchSupported(track?: MediaStreamTrack): boolean {
  if (!track) return false;
  const caps = track.getCapabilities?.();
  return !!(caps && 'torch' in caps);
}
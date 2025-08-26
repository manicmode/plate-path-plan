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
  { roi = { widthPct: 0.7, heightPct: 0.35 }, budgetMs = 900, logPrefix = '[HS]' }: FreezeDecodeOptions & { logPrefix?: string } = {}
): Promise<FreezeDecodeResult> {
  console.time(`${logPrefix} snap_total`);
  
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
      console.log(`${logPrefix} snap_src: takePhoto`);
      const blob = await ic.takePhoto();
      bitmap = await createImageBitmap(blob);
    } else if (ic?.grabFrame) {
      console.log(`${logPrefix} snap_src: grabFrame`);
      bitmap = await ic.grabFrame();
    } else {
      console.log(`${logPrefix} snap_src: drawImage`);
      // we'll draw from <video> directly
    }
  } catch { 
    console.log(`${logPrefix} snap_src: drawImage (fallback)`);
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
  console.log(`${logPrefix} roi`, { vw, vh, roiW: cw, roiH: ch });

  // Decode with ZXing (no torch!)
  console.time(`${logPrefix} decode`);
  const scanner = new MultiPassBarcodeScanner();
  const result = await scanner.scanQuick(roiCanvas);
  console.timeEnd(`${logPrefix} decode`);
  
  const raw = result?.text ?? null;
  console.log(`${logPrefix} barcode_result:`, { 
    raw, 
    type: result?.format ?? null, 
    checksumOk: result?.checkDigitValid ?? null, 
    reason: result ? 'decoded' : 'not_found' 
  });

  console.timeEnd(`${logPrefix} snap_total`);
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
    console.log('[TORCH] torch not supported');
    return Promise.resolve();
  }
  
  return track.applyConstraints({ 
    advanced: [{ torch: on } as any] 
  }).then(() => {
    console.log('[TORCH] torch', { on });
  }).catch((error) => {
    console.log('[TORCH] torch failed:', error);
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

/**
 * Safe timer helpers to avoid "Timer already exists" errors
 */
export function safeTime(label: string): void {
  try {
    console.time(label);
  } catch {
    // Timer already exists, ignore
  }
}

export function safeTimeEnd(label: string): void {
  try {
    console.timeEnd(label);
  } catch {
    // Timer doesn't exist, ignore
  }
}

/**
 * Still frame barcode detection with multi-crop and rotation
 */
export async function stillFrameBarcodePass(
  canvas: HTMLCanvasElement,
  { budgetMs = 700, logPrefix = '[HS]' }: { budgetMs?: number; logPrefix?: string } = {}
): Promise<{ raw: string | null; result: any; reason: string }> {
  console.log(`${logPrefix} still_pass_start`);
  safeTime(`${logPrefix} still_pass_ms`);
  
  const startTime = performance.now();
  
  try {
    // Use existing MultiPassBarcodeScanner instead of direct ZXing
    const scanner = new MultiPassBarcodeScanner();
    
    // Create 3 crops: top 35%, center 40%, bottom 35%
    const crops = [
      createCrop(canvas, 0, 0, 1.0, 0.35),      // top 35%
      createCrop(canvas, 0, 0.3, 1.0, 0.4),    // center 40%
      createCrop(canvas, 0, 0.65, 1.0, 0.35)   // bottom 35%
    ];
    
    // Try each crop with 0° and 90° rotations
    for (const crop of crops) {
      if (performance.now() - startTime > budgetMs) break;
      
      const rotations = [0, 90];
      for (const rotation of rotations) {
        if (performance.now() - startTime > budgetMs) break;
        
        try {
          const testCanvas = rotation === 0 ? crop : rotateCanvas(crop, rotation);
          const result = await scanner.scanQuick(testCanvas);
          
          if (result && result.text) {
            const raw = result.text;
            const isValidLength = /^\d{8}$|^\d{12}$|^\d{13}$|^\d{14}$/.test(raw);
            
            if (isValidLength) {
              safeTimeEnd(`${logPrefix} still_pass_ms`);
              console.log(`${logPrefix} still_barcode_result:`, {
                raw,
                type: result.format || 'unknown',
                checksumOk: result.checkDigitValid || true,
                reason: 'still_frame_decoded'
              });
              
              return {
                raw,
                result: {
                  text: raw,
                  format: result.format,
                  checkDigitValid: result.checkDigitValid
                },
                reason: 'still_frame_decoded'
              };
            }
          }
        } catch (e) {
          // Continue to next crop/rotation
          continue;
        }
      }
    }
    
    // No barcode found
    safeTimeEnd(`${logPrefix} still_pass_ms`);
    console.log(`${logPrefix} still_barcode_result:`, {
      raw: null,
      type: null,
      checksumOk: null,
      reason: 'not_found_still'
    });
    
    return { raw: null, result: null, reason: 'not_found_still' };
    
  } catch (error) {
    safeTimeEnd(`${logPrefix} still_pass_ms`);
    console.log(`${logPrefix} still_barcode_result:`, {
      raw: null,
      type: null,
      checksumOk: null,
      reason: 'still_error'
    });
    
    return { raw: null, result: null, reason: 'still_error' };
  }
}

/**
 * Create a crop from canvas
 */
function createCrop(
  canvas: HTMLCanvasElement, 
  x: number, 
  y: number, 
  w: number, 
  h: number
): HTMLCanvasElement {
  const cropCanvas = document.createElement('canvas');
  const srcW = canvas.width;
  const srcH = canvas.height;
  
  const cropX = Math.round(srcW * x);
  const cropY = Math.round(srcH * y);
  const cropW = Math.round(srcW * w);
  const cropH = Math.round(srcH * h);
  
  cropCanvas.width = cropW;
  cropCanvas.height = cropH;
  
  const ctx = cropCanvas.getContext('2d')!;
  ctx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
  
  return cropCanvas;
}

/**
 * Rotate canvas by degrees
 */
function rotateCanvas(canvas: HTMLCanvasElement, degrees: number): HTMLCanvasElement {
  if (degrees === 0) return canvas;
  
  const rotated = document.createElement('canvas');
  const ctx = rotated.getContext('2d')!;
  
  if (degrees === 90 || degrees === 270) {
    rotated.width = canvas.height;
    rotated.height = canvas.width;
  } else {
    rotated.width = canvas.width;
    rotated.height = canvas.height;
  }
  
  ctx.translate(rotated.width / 2, rotated.height / 2);
  ctx.rotate((degrees * Math.PI) / 180);
  ctx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
  
  return rotated;
}
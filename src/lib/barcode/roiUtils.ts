/**
 * Utility for cropping DPR-correct ROI from live video for barcode detection
 */

/**
 * Crop reticle ROI from video element with proper DPR scaling
 * Returns a canvas with the ROI area (~70% width × 40% height centered)
 */
export function cropReticleROIFromVideo(video: HTMLVideoElement): HTMLCanvasElement {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  
  // Same reticle as UI: ~70% width × 40% height centered
  const rw = Math.round(vw * 0.70);
  const rh = Math.round(vh * 0.40);
  const rx = Math.round((vw - rw) / 2);
  const ry = Math.round((vh - rh) / 2);

  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const canvas = document.createElement('canvas');
  canvas.width = rw * dpr;
  canvas.height = rh * dpr;

  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  
  // Scale and draw the ROI
  ctx.scale(dpr, dpr);
  ctx.drawImage(video, rx, ry, rw, rh, 0, 0, rw, rh);
  
  return canvas;
}

/**
 * Alternative ROI cropper that takes a blob and returns ROI canvas
 */
export async function cropROIFromBlob(
  blob: Blob,
  roiRect: { x: number; y: number; w: number; h: number }
): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      canvas.width = roiRect.w * dpr;
      canvas.height = roiRect.h * dpr;
      
      ctx.imageSmoothingEnabled = false;
      ctx.scale(dpr, dpr);
      
      ctx.drawImage(
        img,
        roiRect.x, roiRect.y, roiRect.w, roiRect.h,
        0, 0, roiRect.w, roiRect.h
      );
      
      resolve(canvas);
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    
    img.src = url;
  });
}
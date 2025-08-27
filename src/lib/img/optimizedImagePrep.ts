/**
 * Optimized off-thread image preparation for instant feel
 * Uses createImageBitmap + OffscreenCanvas for performance
 */

export interface OptimizedPrepResult {
  dataUrl: string;
  bytesBefore: number;
  bytesAfter: number;
  ms: number;
  width: number;
  height: number;
  mime: string;
  variant: 'jpeg' | 'png';
}

/**
 * Off-thread image resize and compression for robust OCR analysis
 * Target: maxDim=1600px, quality=0.92, with PNG fallback for small files
 */
export async function optimizedImagePrep(file: File): Promise<OptimizedPrepResult> {
  const startTime = performance.now();
  const bytesBefore = file.size;

  try {
    // Use createImageBitmap for off-thread decode + orientation handling
    let bitmap: ImageBitmap;
    try {
      bitmap = await createImageBitmap(file, { 
        imageOrientation: 'from-image' as any
      });
    } catch {
      // Fallback for older browsers
      bitmap = await createImageBitmap(file);
    }

    const originalWidth = bitmap.width;
    const originalHeight = bitmap.height;

    // Calculate optimal dimensions (maxDim=1600px, keeping aspect ratio)
    const maxDim = 1600;
    const scale = Math.min(1, maxDim / Math.max(originalWidth, originalHeight));
    const targetWidth = Math.round(originalWidth * scale);
    const targetHeight = Math.round(originalHeight * scale);

    let canvas: OffscreenCanvas | HTMLCanvasElement;
    let ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;

    // Use OffscreenCanvas for off-thread rendering when available
    if (typeof OffscreenCanvas !== 'undefined') {
      canvas = new OffscreenCanvas(targetWidth, targetHeight);
      ctx = canvas.getContext('2d')!;
    } else {
      // Fallback to regular canvas for Safari
      canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      ctx = canvas.getContext('2d')!;
    }

    // Draw resized image
    ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
    bitmap.close();

    // First try JPEG with quality=0.92
    let jpegBlob: Blob;
    let variant: 'jpeg' | 'png' = 'jpeg';
    let mime = 'image/jpeg';
    
    if (canvas instanceof OffscreenCanvas) {
      jpegBlob = await canvas.convertToBlob({ 
        type: 'image/jpeg', 
        quality: 0.92 
      });
    } else {
      jpegBlob = await new Promise<Blob>((resolve) => {
        (canvas as HTMLCanvasElement).toBlob(resolve!, 'image/jpeg', 0.92);
      });
    }

    let finalBlob = jpegBlob;

    // If JPEG is < 180KB, try PNG for better OCR quality
    if (jpegBlob.size < 180000) {
      try {
        let pngBlob: Blob;
        if (canvas instanceof OffscreenCanvas) {
          pngBlob = await canvas.convertToBlob({ type: 'image/png' });
        } else {
          pngBlob = await new Promise<Blob>((resolve) => {
            (canvas as HTMLCanvasElement).toBlob(resolve!, 'image/png');
          });
        }
        
        // Use PNG if it's reasonable size (< 2MB)
        if (pngBlob.size < 2 * 1024 * 1024) {
          finalBlob = pngBlob;
          variant = 'png';
          mime = 'image/png';
        }
      } catch (error) {
        console.warn('[IMG PREP] PNG fallback failed, using JPEG', error);
      }
    }

    const bytesAfter = finalBlob.size;
    
    // Convert to data URL
    const dataUrl = await blobToDataUrl(finalBlob);
    
    const ms = Math.round(performance.now() - startTime);

    console.log('[IMG PREP]', { 
      originalWidth, 
      originalHeight, 
      targetWidth, 
      targetHeight, 
      bytesBefore, 
      bytesAfter, 
      variant,
      mime,
      ms 
    });

    return {
      dataUrl,
      bytesBefore,
      bytesAfter,
      ms,
      width: targetWidth,
      height: targetHeight,
      mime,
      variant
    };

  } catch (error) {
    console.error('[IMG PREP] Failed:', error);
    
    // Emergency fallback using FileReader
    const ms = Math.round(performance.now() - startTime);
    const dataUrl = await fileToDataUrl(file);
    
    return {
      dataUrl,
      bytesBefore,
      bytesAfter: bytesBefore, // No compression in fallback
      ms,
      width: 0,
      height: 0,
      mime: 'image/jpeg',
      variant: 'jpeg'
    };
  }
}

/**
 * Convert blob to data URL
 */
async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Convert file to data URL (fallback)
 */
async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

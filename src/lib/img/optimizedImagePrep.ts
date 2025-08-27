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
}

/**
 * Off-thread image resize and compression for instant analyzer feel
 * Target: maxDim=1280px, quality=0.78, strip EXIF, output JPEG, keep under ~1.2MB
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

    // Calculate optimal dimensions (maxDim=1280px)
    const maxDim = 1280;
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

    // Compress to JPEG with quality=0.78
    let quality = 0.78;
    let blob: Blob;
    
    // Try to keep under ~1.2MB with iterative compression
    const targetMaxBytes = 1.2 * 1024 * 1024;
    for (let attempt = 0; attempt < 3; attempt++) {
      if (canvas instanceof OffscreenCanvas) {
        blob = await canvas.convertToBlob({ 
          type: 'image/jpeg', 
          quality 
        });
      } else {
        blob = await new Promise<Blob>((resolve) => {
          (canvas as HTMLCanvasElement).toBlob(resolve!, 'image/jpeg', quality);
        });
      }

      if (blob!.size <= targetMaxBytes || quality <= 0.5) break;
      quality -= 0.15;
    }

    const bytesAfter = blob!.size;
    
    // Convert to data URL
    const dataUrl = await blobToDataUrl(blob!);
    
    const ms = Math.round(performance.now() - startTime);

    console.log('[IMG PREP]', { 
      originalWidth, 
      originalHeight, 
      targetWidth, 
      targetHeight, 
      bytesBefore, 
      bytesAfter, 
      quality, 
      ms 
    });

    return {
      dataUrl,
      bytesBefore,
      bytesAfter,
      ms,
      width: targetWidth,
      height: targetHeight
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
      height: 0
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

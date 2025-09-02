/**
 * Prepare images for analysis with optimal size, quality, and orientation
 */

export type PrepOpts = { 
  maxEdge?: number; 
  minEdge?: number; 
  quality?: number; 
  targetMaxBytes?: number;
};

export type PrepResult = { 
  base64NoPrefix: string; 
  width: number; 
  height: number; 
  bytes: number;
};

/**
 * Prepare image for analysis - resize, compress, and encode to base64
 * Honors EXIF orientation and targets specific byte size
 */
export async function prepareImageForAnalysis(
  input: HTMLCanvasElement | Blob | File, 
  opts: PrepOpts = {}
): Promise<PrepResult> {
  const { 
    maxEdge = 1280, 
    minEdge = 720, 
    quality = 0.82, 
    targetMaxBytes = 900_000 
  } = opts;

  // Load image with EXIF orientation honored when available
  let bitmap: ImageBitmap;
  if (input instanceof HTMLCanvasElement) {
    bitmap = await createImageBitmap(input);
  } else {
    // Blob/File path - try with orientation support first
    try {
      bitmap = await createImageBitmap(input, { 
        imageOrientation: 'from-image' as any 
      });
    } catch {
      // Fallback for older browsers
      bitmap = await createImageBitmap(input);
    }
  }

  const inW = bitmap.width;
  const inH = bitmap.height;
  
  // Calculate scale to fit within maxEdge while respecting minEdge
  const scale = Math.min(
    1, 
    Math.max(
      minEdge / Math.min(inW, inH), 
      maxEdge / Math.max(inW, inH)
    )
  );
  
  const outW = Math.round(inW * scale);
  const outH = Math.round(inH * scale);

  let canvas: OffscreenCanvas | HTMLCanvasElement;
  let ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;

  // Use OffscreenCanvas if available, fallback to regular canvas for Safari
  if (typeof OffscreenCanvas !== 'undefined') {
    canvas = new OffscreenCanvas(outW, outH);
    ctx = canvas.getContext('2d')!;
  } else {
    // Safari fallback
    canvas = document.createElement('canvas');
    canvas.width = outW;
    canvas.height = outH;
    ctx = canvas.getContext('2d')!;
  }

  // Draw resized image
  ctx.drawImage(bitmap, 0, 0, outW, outH);
  bitmap.close();

  // Iterative JPEG compression to hit byte target
  let q = quality;
  let blob: Blob;
  
  for (let i = 0; i < 3; i++) {
    if (canvas instanceof OffscreenCanvas) {
      blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: q });
    } else {
      // Safari fallback using toBlob
      blob = await new Promise<Blob>((resolve) => {
        (canvas as HTMLCanvasElement).toBlob(resolve!, 'image/jpeg', q);
      });
    }
    
    if (blob!.size <= targetMaxBytes || q <= 0.5) break;
    q -= 0.1;
  }

  const buf = await blob!.arrayBuffer();
  const bytes = buf.byteLength;
  
  // Convert to base64 without data URL prefix - safe method to avoid stack overflow
  const base64NoPrefix = await blobToBase64NoPrefix(blob!);
  
  // Emergency downscale if still too large (nice-to-have feature)
  if (bytes > 1.2 * 1024 * 1024) {
    console.warn('[IMG PREP] Image still large after compression, attempting emergency downscale');
    const emergencyScale = 0.85;
    const newW = Math.round(outW * emergencyScale);
    const newH = Math.round(outH * emergencyScale);
    
    if (canvas instanceof OffscreenCanvas) {
      canvas = new OffscreenCanvas(newW, newH);
      ctx = canvas.getContext('2d')!;
    } else {
      canvas.width = newW;
      canvas.height = newH;
      ctx = canvas.getContext('2d')!;
    }
    
    // Redraw at smaller size
    const emergencyBitmap = await createImageBitmap(blob!);
    ctx.drawImage(emergencyBitmap, 0, 0, newW, newH);
    emergencyBitmap.close();
    
    // Re-encode
    if (canvas instanceof OffscreenCanvas) {
      blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.6 });
    } else {
      blob = await new Promise<Blob>((resolve) => {
        (canvas as HTMLCanvasElement).toBlob(resolve!, 'image/jpeg', 0.6);
      });
    }
    
    const emergencyBuf = await blob!.arrayBuffer();
    const emergencyBytes = emergencyBuf.byteLength;
    const emergencyBase64 = await blobToBase64NoPrefix(blob!);
    
    console.debug('[IMG PREP] Emergency downscale', { 
      inW, inH, outW: newW, outH: newH, q: 0.6, bytes: emergencyBytes 
    });
    
    return { 
      base64NoPrefix: emergencyBase64, 
      width: newW, 
      height: newH, 
      bytes: emergencyBytes 
    };
  }

  console.debug('[IMG PREP]', { inW, inH, outW, outH, q, bytes });

  return { base64NoPrefix, width: outW, height: outH, bytes };
}

/**
 * Safe base64 conversion to avoid stack overflow with large files
 */
async function blobToBase64NoPrefix(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onerror = () => reject(fr.error);
    fr.onload = () => {
      const url = String(fr.result || "");
      // data:image/jpeg;base64,<...>
      resolve(url.substring(url.indexOf(",") + 1));
    };
    fr.readAsDataURL(blob);
  });
}

/**
 * iOS 15 webview fallback using img + canvas decode/draw
 */
export async function prepareImageForAnalysisLegacy(
  input: Blob | File,
  opts: PrepOpts = {}
): Promise<PrepResult> {
  const { 
    maxEdge = 1280, 
    minEdge = 720, 
    quality = 0.7, 
    targetMaxBytes = 900_000 
  } = opts;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    
    img.onload = async () => {
      const inW = img.naturalWidth;
      const inH = img.naturalHeight;
      
      const scale = Math.min(
        1, 
        Math.max(
          minEdge / Math.min(inW, inH), 
          maxEdge / Math.max(inW, inH)
        )
      );
      
      const outW = Math.round(inW * scale);
      const outH = Math.round(inH * scale);
      
      canvas.width = outW;
      canvas.height = outH;
      ctx.drawImage(img, 0, 0, outW, outH);
      
      // Iterative compression
      let q = quality;
      let blob: Blob;
      
      for (let i = 0; i < 3; i++) {
        blob = await new Promise<Blob>((resolve) => {
          canvas.toBlob(resolve!, 'image/jpeg', q);
        });
        
        if (blob!.size <= targetMaxBytes || q <= 0.5) break;
        q -= 0.1;
      }
      
      const buf = await blob!.arrayBuffer();
      const bytes = buf.byteLength;
      const base64NoPrefix = await blobToBase64NoPrefix(blob!);
      
      console.debug('[IMG PREP] Legacy', { inW, inH, outW, outH, q, bytes });
      
      resolve({ base64NoPrefix, width: outW, height: outH, bytes });
    };
    
    img.onerror = reject;
    img.src = URL.createObjectURL(input);
  });
}
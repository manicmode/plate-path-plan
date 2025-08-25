import { normalizeHealthScanImage } from './imageNormalization';

/**
 * Prepare image for health scan - ensure JPEG ≤1280px helper
 */
export async function prepareImage(file: File): Promise<Blob> {
  try {
    console.log("🔄 Preparing image for health scan...");
    
    const normalized = await normalizeHealthScanImage(file, {
      maxWidth: 1280,
      maxHeight: 1280,
      quality: 0.85,
      format: 'JPEG',
      stripExif: true
    });
    
    // Convert data URL back to blob using canvas.toBlob() (CSP-safe)
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    const blob = await new Promise<Blob>((resolve, reject) => {
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);
        
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to create blob from canvas'));
        }, 'image/jpeg', 0.85);
      };
      img.onerror = reject;
      img.src = normalized.dataUrl;
    });
    
    console.log("✅ Image prepared:", {
      originalSize: normalized.originalSize,
      finalSize: blob.size,
      dimensions: `${normalized.width}x${normalized.height}`,
      compressionRatio: `${(normalized.compressionRatio * 100).toFixed(1)}%`
    });
    
    return blob;
  } catch (error) {
    console.error("❌ Image preparation failed:", error);
    // Fallback to original file
    return file;
  }
}
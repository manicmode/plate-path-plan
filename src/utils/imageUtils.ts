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
    
    // Convert data URL back to blob
    const response = await fetch(normalized.dataUrl);
    const blob = await response.blob();
    
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
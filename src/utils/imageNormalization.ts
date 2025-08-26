import imageCompression from 'browser-image-compression';

export interface ImageNormalizationResult {
  dataUrl: string;
  originalSize: number;
  compressedSize: number;
  width: number;
  height: number;
  compressionRatio: number;
}

export interface ImageNormalizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'JPEG' | 'PNG' | 'WEBP';
  stripExif?: boolean;
}

/**
 * Normalize captured images to JPEG (≤1280px, quality 0.85), strip EXIF, rotate upright
 */
export async function normalizeHealthScanImage(
  file: File | string, 
  options: ImageNormalizationOptions = {}
): Promise<ImageNormalizationResult> {
  const {
    maxWidth = 1280,
    maxHeight = 1280,
    quality = 0.85,
    format = 'JPEG',
    stripExif = true
  } = options;

  console.log('🔄 Starting image normalization...', {
    maxWidth,
    maxHeight,
    quality,
    format,
    stripExif
  });

  let inputFile: File;
  let originalSize: number;

  // Convert string data URL to File if needed (CSP-safe)
  if (typeof file === 'string') {
    try {
      // Use canvas conversion instead of fetch for CSP safety
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
        img.src = file;
      });
      
      inputFile = new File([blob], 'captured-image.jpg', { type: 'image/jpeg' });
      originalSize = blob.size;
    } catch (error) {
      console.error('Failed to convert dataURL to File:', error);
      throw new Error('The file given is not an image');
    }
  } else {
    inputFile = file;
    originalSize = file.size;
  }

  console.log('📏 Original image size:', originalSize, 'bytes');

  try {
    // Compression options - Disable web worker to avoid CSP violations
    const compressionOptions = {
      maxSizeMB: 10, // Max 10MB
      maxWidthOrHeight: Math.max(maxWidth, maxHeight),
      useWebWorker: false, // Disable to avoid CSP worker-src violations
      fileType: `image/${format.toLowerCase()}` as const,
      quality: quality,
      // EXIF handling
      exifOrientation: stripExif ? undefined : 1, // Auto-orient based on EXIF, then strip
      initialQuality: quality
    };

    console.log('⚙️ Compression options:', compressionOptions);

    // Compress and normalize the image
    const compressedFile = await imageCompression(inputFile, compressionOptions);
    
    console.log('✅ Image compressed successfully:', {
      originalSize,
      compressedSize: compressedFile.size,
      compressionRatio: ((originalSize - compressedFile.size) / originalSize * 100).toFixed(1) + '%'
    });

    // Get image dimensions
    const dimensions = await getImageDimensions(compressedFile);
    console.log('📐 Final image dimensions:', dimensions);

    // Convert to data URL
    const dataUrl = await fileToDataUrl(compressedFile);

    const result: ImageNormalizationResult = {
      dataUrl,
      originalSize,
      compressedSize: compressedFile.size,
      width: dimensions.width,
      height: dimensions.height,
      compressionRatio: (originalSize - compressedFile.size) / originalSize
    };

    console.log('🎯 Image normalization complete:', {
      size: `${originalSize} → ${compressedFile.size} bytes`,
      dimensions: `${dimensions.width}x${dimensions.height}`,
      compressionRatio: `${(result.compressionRatio * 100).toFixed(1)}%`,
      dataUrlLength: dataUrl.length
    });

    return result;

  } catch (error) {
    console.error('❌ Image normalization failed:', error);
    
    // Fallback: convert to data URL without compression
    const fallbackDataUrl = typeof file === 'string' ? file : await fileToDataUrl(inputFile);
    const fallbackDimensions = await getImageDimensionsFromDataUrl(fallbackDataUrl);
    
    return {
      dataUrl: fallbackDataUrl,
      originalSize,
      compressedSize: originalSize,
      width: fallbackDimensions.width,
      height: fallbackDimensions.height,
      compressionRatio: 0
    };
  }
}

/**
 * Get image dimensions from File
 */
async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image for dimension measurement'));
    };
    
    img.src = url;
  });
}

/**
 * Get image dimensions from data URL
 */
async function getImageDimensionsFromDataUrl(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image from data URL'));
    };
    
    img.src = dataUrl;
  });
}

/**
 * Convert File to data URL
 */
async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = () => {
      resolve(reader.result as string);
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to convert file to data URL'));
    };
    
    reader.readAsDataURL(file);
  });
}

/**
 * Validate image and get metadata
 */
export function validateAndGetImageMetadata(dataUrl: string): {
  isValid: boolean;
  format?: string;
  sizeBytes?: number;
  error?: string;
} {
  try {
    // Check if it's a valid data URL
    if (!dataUrl.startsWith('data:image/')) {
      return { isValid: false, error: 'Not a valid image data URL' };
    }

    // Extract format
    const formatMatch = dataUrl.match(/data:image\/([^;]+)/);
    const format = formatMatch ? formatMatch[1].toUpperCase() : 'UNKNOWN';

    // Estimate size (base64 is ~33% larger than binary)
    const base64Data = dataUrl.split(',')[1];
    const sizeBytes = Math.round((base64Data.length * 3) / 4);

    return {
      isValid: true,
      format,
      sizeBytes
    };
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Unknown validation error'
    };
  }
}
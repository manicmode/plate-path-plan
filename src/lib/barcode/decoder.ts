export type DecodeResult = { 
  code: string | null; 
  format?: string; 
  attempts: number; 
  ms: number; 
};

/**
 * Multi-pass barcode decoder with ZXing-style strategy
 * Tries multiple crops, scales, rotations, and luminance modes
 */
export async function decodeUPCFromImageBlob(blob: Blob): Promise<DecodeResult> {
  const startTime = Date.now();
  let attempts = 0;
  
  try {
    // Convert blob to image element
    const imageUrl = URL.createObjectURL(blob);
    const img = await loadImage(imageUrl);
    URL.revokeObjectURL(imageUrl);
    
    // Multi-pass strategy
    const cropConfigs = [
      { x: 0.15, y: 0.3, w: 0.7, h: 0.4 },  // Center ROI
      { x: 0.2, y: 0.1, w: 0.6, h: 0.3 },   // Top strip
      { x: 0.2, y: 0.6, w: 0.6, h: 0.3 },   // Bottom strip
    ];
    
    const scales = [1.0, 0.75, 0.5];
    const rotations = [0, 90, 180, 270, 8, -8];
    const luminanceModes = ['normal', 'inverted'];
    
    // Try each combination until we find a barcode
    for (const crop of cropConfigs) {
      for (const scale of scales) {
        for (const rotation of rotations) {
          for (const luminanceMode of luminanceModes) {
            attempts++;
            
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d')!;
            
            // Calculate cropped dimensions
            const cropW = img.width * crop.w;
            const cropH = img.height * crop.h;
            const cropX = img.width * crop.x;
            const cropY = img.height * crop.y;
            
            // Set canvas size based on rotation
            if (rotation === 90 || rotation === 270) {
              canvas.width = cropH * scale;
              canvas.height = cropW * scale;
            } else {
              canvas.width = cropW * scale;
              canvas.height = cropH * scale;
            }
            
            // Apply rotation
            ctx.save();
            if (rotation !== 0) {
              ctx.translate(canvas.width / 2, canvas.height / 2);
              ctx.rotate((rotation * Math.PI) / 180);
              ctx.translate(-canvas.width / 2, -canvas.height / 2);
            }
            
            // Draw cropped and scaled image
            ctx.drawImage(
              img,
              cropX, cropY, cropW, cropH,
              0, 0, canvas.width, canvas.height
            );
            
            // Apply luminance inversion if needed
            if (luminanceMode === 'inverted') {
              const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              for (let i = 0; i < imageData.data.length; i += 4) {
                imageData.data[i] = 255 - imageData.data[i];     // R
                imageData.data[i + 1] = 255 - imageData.data[i + 1]; // G
                imageData.data[i + 2] = 255 - imageData.data[i + 2]; // B
              }
              ctx.putImageData(imageData, 0, 0);
            }
            
            ctx.restore();
            
            // Try to decode this processed image
            const code = await tryDecodeCanvas(canvas);
            if (code && isValidUPCEAN(code)) {
              return {
                code,
                format: getUPCFormat(code),
                attempts,
                ms: Date.now() - startTime
              };
            }
            
            // Abort if taking too long
            if (Date.now() - startTime > 1200) {
              break;
            }
          }
        }
      }
    }
    
    return {
      code: null,
      attempts,
      ms: Date.now() - startTime
    };
    
  } catch (error) {
    console.error('Barcode decode error:', error);
    return {
      code: null,
      attempts,
      ms: Date.now() - startTime
    };
  }
}

/**
 * Load image from URL
 */
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/**
 * Try to decode barcode from canvas using existing barcode-image-detector
 */
async function tryDecodeCanvas(canvas: HTMLCanvasElement): Promise<string | null> {
  try {
    // Convert canvas to base64
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    const base64 = dataUrl.split(',')[1];
    
    // Use our existing barcode detector function
    const response = await fetch('/functions/v1/barcode-image-detector', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ imageBase64: base64 })
    });
    
    const result = await response.json();
    return result.barcode || null;
  } catch (error) {
    return null;
  }
}

/**
 * Validate UPC/EAN check digit
 */
function isValidUPCEAN(code: string): boolean {
  if (!code || !/^\d{8}|\d{12}|\d{13}|\d{14}$/.test(code)) {
    return false;
  }
  
  // UPC-A (12 digits) / EAN-13 (13 digits) check digit validation
  if (code.length === 12 || code.length === 13) {
    const digits = code.slice(0, -1).split('').map(Number);
    const checkDigit = parseInt(code.slice(-1));
    
    let sum = 0;
    for (let i = 0; i < digits.length; i++) {
      sum += digits[i] * (i % 2 === 0 ? 1 : 3);
    }
    
    const calculatedCheck = (10 - (sum % 10)) % 10;
    return calculatedCheck === checkDigit;
  }
  
  // EAN-8 (8 digits) check digit validation
  if (code.length === 8) {
    const digits = code.slice(0, -1).split('').map(Number);
    const checkDigit = parseInt(code.slice(-1));
    
    let sum = 0;
    for (let i = 0; i < digits.length; i++) {
      sum += digits[i] * (i % 2 === 0 ? 3 : 1);
    }
    
    const calculatedCheck = (10 - (sum % 10)) % 10;
    return calculatedCheck === checkDigit;
  }
  
  return true; // For other lengths, assume valid
}

/**
 * Determine UPC format from code length
 */
function getUPCFormat(code: string): string {
  switch (code.length) {
    case 8: return 'EAN-8';
    case 12: return 'UPC-A';
    case 13: return 'EAN-13';
    case 14: return 'EAN-14';
    default: return 'Unknown';
  }
}
// Enhanced multi-pass barcode decoder with forensic logging
import { logAttempt, ScanReport, Attempt } from './diagnostics';

export type DecodeResult = {
  success: boolean;
  code?: string;
  format?: 'UPC_A' | 'EAN_13' | 'EAN_8' | 'UPC_E' | 'CODE_128' | 'ITF';
  normalizedAs?: string;
  checkDigitOk?: boolean;
  attempts: number;
  totalMs: number;
};

// UPC-A checksum validation
function validateUPCA(code: string): boolean {
  if (code.length !== 12) return false;
  
  let oddSum = 0;
  let evenSum = 0;
  
  for (let i = 0; i < 11; i++) {
    const digit = parseInt(code[i]);
    if (i % 2 === 0) {
      oddSum += digit; // positions 1,3,5,7,9,11 (0-indexed: 0,2,4,6,8,10)
    } else {
      evenSum += digit; // positions 2,4,6,8,10 (0-indexed: 1,3,5,7,9)
    }
  }
  
  const total = (oddSum * 3) + evenSum;
  const checkDigit = (10 - (total % 10)) % 10;
  return checkDigit === parseInt(code[11]);
}

// EAN-13 checksum validation  
function validateEAN13(code: string): boolean {
  if (code.length !== 13) return false;
  
  let oddSum = 0;
  let evenSum = 0;
  
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(code[i]);
    if (i % 2 === 0) {
      oddSum += digit;
    } else {
      evenSum += digit;
    }
  }
  
  const total = oddSum + (evenSum * 3);
  const checkDigit = (10 - (total % 10)) % 10;
  return checkDigit === parseInt(code[12]);
}

// Normalize EAN-13 with leading 0 to UPC-A
function normalizeBarcode(code: string, format: string): { code: string; normalizedAs?: string; checkDigitOk: boolean } {
  if (format === 'EAN_13' && code.startsWith('0') && code.length === 13) {
    const upcA = code.substring(1);
    const upcAValid = validateUPCA(upcA);
    return {
      code: upcA,
      normalizedAs: 'UPC_A',
      checkDigitOk: upcAValid
    };
  }
  
  if (format === 'UPC_A' && code.length === 12) {
    return {
      code,
      checkDigitOk: validateUPCA(code)
    };
  }
  
  if (format === 'EAN_13' && code.length === 13) {
    return {
      code,
      checkDigitOk: validateEAN13(code)
    };
  }
  
  return { code, checkDigitOk: false };
}

// Multi-pass enhanced decoder with ROI crops
export async function enhancedBarcodeDecode(
  imageBlob: Blob,
  roiRect: { x: number; y: number; w: number; h: number },
  dpr: number,
  budget: number = 1500
): Promise<DecodeResult> {
  const startTime = Date.now();
  let attempts = 0;
  
  // Create image from blob
  const imageUrl = URL.createObjectURL(imageBlob);
  const image = new Image();
  
  return new Promise((resolve) => {
    image.onload = async () => {
      URL.revokeObjectURL(imageUrl);
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve({ success: false, attempts: 0, totalMs: Date.now() - startTime });
        return;
      }
      
      canvas.width = image.width;
      canvas.height = image.height;
      ctx.drawImage(image, 0, 0);
      
      // Crop strategies
      const crops: Array<{name: 'full' | 'bandH' | 'bandV' | 'q1' | 'q2' | 'q3' | 'q4', rect: {x:number,y:number,w:number,h:number}}> = [
        { name: 'full', rect: { x: 0, y: 0, w: canvas.width, h: canvas.height } },
        { name: 'bandH', rect: { x: 0, y: Math.floor(canvas.height * 0.35), w: canvas.width, h: Math.floor(canvas.height * 0.30) } },
        { name: 'bandV', rect: { x: Math.floor(canvas.width * 0.35), y: 0, w: Math.floor(canvas.width * 0.30), h: canvas.height } },
        { name: 'q1', rect: { x: 0, y: 0, w: Math.floor(canvas.width * 0.5), h: Math.floor(canvas.height * 0.5) } },
        { name: 'q2', rect: { x: Math.floor(canvas.width * 0.5), y: 0, w: Math.floor(canvas.width * 0.5), h: Math.floor(canvas.height * 0.5) } },
        { name: 'q3', rect: { x: 0, y: Math.floor(canvas.height * 0.5), w: Math.floor(canvas.width * 0.5), h: Math.floor(canvas.height * 0.5) } },
        { name: 'q4', rect: { x: Math.floor(canvas.width * 0.5), y: Math.floor(canvas.height * 0.5), w: Math.floor(canvas.width * 0.5), h: Math.floor(canvas.height * 0.5) } }
      ];
      
      const scales = [1.0, 0.75, 0.5];
      const rotations = [0, 90, 180, 270, -8, 8];
      const polarities = [false, true]; // normal, inverted
      
      for (const crop of crops) {
        for (const scale of scales) {
          for (const rotation of rotations) {
            for (const inverted of polarities) {
              if (Date.now() - startTime > budget) {
                resolve({ success: false, attempts, totalMs: Date.now() - startTime });
                return;
              }
              
              const attemptStart = Date.now();
              attempts++;
              
              try {
                // Create cropped canvas
                const cropCanvas = document.createElement('canvas');
                const cropCtx = cropCanvas.getContext('2d');
                if (!cropCtx) continue;
                
                const finalW = Math.floor(crop.rect.w * scale);
                const finalH = Math.floor(crop.rect.h * scale);
                
                cropCanvas.width = finalW;
                cropCanvas.height = finalH;
                
                // Apply rotation
                if (rotation !== 0) {
                  cropCtx.save();
                  cropCtx.translate(finalW / 2, finalH / 2);
                  cropCtx.rotate((rotation * Math.PI) / 180);
                  cropCtx.translate(-finalW / 2, -finalH / 2);
                }
                
                // Apply inversion
                if (inverted) {
                  cropCtx.filter = 'invert(1)';
                }
                
                cropCtx.drawImage(
                  canvas,
                  crop.rect.x, crop.rect.y, crop.rect.w, crop.rect.h,
                  0, 0, finalW, finalH
                );
                
                if (rotation !== 0) {
                  cropCtx.restore();
                }
                
                // Try to decode this canvas
                const result = await tryDecodeCanvas(cropCanvas);
                const attemptEnd = Date.now();
                
                if (result && result.code) {
                  const normalized = normalizeBarcode(result.code, result.format);
                  
                  const attempt: Attempt = {
                    idx: attempts,
                    crop: crop.name,
                    scale,
                    rotation,
                    inverted,
                    outcome: normalized.checkDigitOk ? 'OK' : 'Checksum',
                    format: result.format as any,
                    code: result.code,
                    elapsedMs: attemptEnd - attemptStart,
                    roi: { w: finalW, h: finalH },
                    dpr
                  };
                  
                  logAttempt(attempt);
                  
                  if (normalized.checkDigitOk) {
                    resolve({
                      success: true,
                      code: normalized.code,
                      format: result.format as any,
                      normalizedAs: normalized.normalizedAs,
                      checkDigitOk: true,
                      attempts,
                      totalMs: attemptEnd - startTime
                    });
                    return;
                  }
                } else {
                  const attempt: Attempt = {
                    idx: attempts,
                    crop: crop.name,
                    scale,
                    rotation,
                    inverted,
                    outcome: 'NotFound',
                    elapsedMs: attemptEnd - attemptStart,
                    roi: { w: finalW, h: finalH },
                    dpr
                  };
                  
                  logAttempt(attempt);
                }
              } catch (error) {
                const attemptEnd = Date.now();
                const attempt: Attempt = {
                  idx: attempts,
                  crop: crop.name,
                  scale,
                  rotation,
                  inverted,
                  outcome: 'Error',
                  elapsedMs: attemptEnd - attemptStart,
                  roi: { w: 0, h: 0 },
                  dpr
                };
                
                logAttempt(attempt);
              }
            }
          }
        }
      }
      
      resolve({ success: false, attempts, totalMs: Date.now() - startTime });
    };
    
    image.onerror = () => {
      URL.revokeObjectURL(imageUrl);
      resolve({ success: false, attempts: 0, totalMs: Date.now() - startTime });
    };
    
    image.src = imageUrl;
  });
}

// Try to decode a canvas using external API
async function tryDecodeCanvas(canvas: HTMLCanvasElement): Promise<{code: string; format: string} | null> {
  try {
    // Convert canvas to base64
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    const base64Data = dataUrl.split(',')[1];
    
    // Call barcode detection API
    const response = await fetch('https://api.qrserver.com/v1/read-qr-code/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `fileToUpload=data:image/jpeg;base64,${base64Data}`,
    });
    
    if (!response.ok) return null;
    
    const results = await response.json();
    if (results && results[0] && results[0].symbol && results[0].symbol[0]) {
      const decoded = results[0].symbol[0];
      if (decoded.data && decoded.data.trim()) {
        return {
          code: decoded.data.trim(),
          format: determineFormat(decoded.data.trim())
        };
      }
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

// Determine barcode format from code
function determineFormat(code: string): string {
  const length = code.length;
  
  if (length === 12) {
    return 'UPC_A';
  } else if (length === 13) {
    return 'EAN_13';
  } else if (length === 8) {
    return 'EAN_8';
  } else if (length === 6 || length === 7) {
    return 'UPC_E';
  } else {
    return 'CODE_128';
  }
}

// Compatibility export for backward compatibility
export const decodeUPCFromImageBlobWithDiagnostics = enhancedBarcodeDecode;
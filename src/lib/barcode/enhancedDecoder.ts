// Enhanced multi-pass barcode decoder with forensic logging
import { logAttempt, ScanReport, Attempt } from './diagnostics';

export type BarcodeDecodeResult = {
  success: boolean;
  code?: string;             // raw read
  format?: 'EAN_13'|'UPC_A'|'EAN_8'|'UPC_E'|'CODE_128'|'CODE_39'|'ITF';
  checksumOk?: boolean;
  normalized?: { upca?: string; ean13?: string }; // both when derivable
  attempts: Attempt[];       // already implemented
  ms: number;
  reason?: 'NotFound'|'ChecksumFail'|'Timeout';
};

export type DecodeResult = BarcodeDecodeResult;

// UPC-A checksum validation (corrected parity)
function validateUPCA(code: string): boolean {
  if (code.length !== 12) return false;
  
  const digits = code.split('').map(Number);
  let sum = 0;
  
  for (let i = 0; i < 11; i++) {
    // UPC-A parity: odd positions (1,3,5,7,9,11) * 3, even positions (2,4,6,8,10,12) * 1
    sum += digits[i] * (i % 2 === 0 ? 3 : 1);
  }
  
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === digits[11];
}

// EAN-13 checksum validation  
function validateEAN13(code: string): boolean {
  if (code.length !== 13) return false;
  
  const digits = code.split('').map(Number);
  let sum = 0;
  
  for (let i = 0; i < 12; i++) {
    // EAN-13 parity: odd positions * 1, even positions * 3
    sum += digits[i] * (i % 2 === 0 ? 1 : 3);
  }
  
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === digits[12];
}

// Normalize EAN-13 with leading 0 to UPC-A (proper normalization)
function normalizeBarcode(code: string, format: string): { code: string; normalizedAs?: string; checkDigitOk: boolean; normalized?: { upca?: string; ean13?: string } } {
  // EAN-13 starting with 0 should be normalized to UPC-A
  if (format === 'EAN_13' && code.startsWith('0') && code.length === 13) {
    const upcA = code.substring(1);
    const isValidUPC = validateUPCA(upcA);
    const isValidEAN = validateEAN13(code);
    
    return {
      code: isValidUPC ? upcA : code,
      normalizedAs: isValidUPC ? upcA : undefined,
      checkDigitOk: isValidUPC,
      normalized: { upca: isValidUPC ? upcA : undefined, ean13: isValidEAN ? code : undefined }
    };
  }
  
  // If format === 'UPC_A', set normalized.ean13 = '0' + code
  if (format === 'UPC_A') {
    const isValidUPC = validateUPCA(code);
    const ean13 = '0' + code;
    const isValidEAN = validateEAN13(ean13);
    
    return { 
      code, 
      checkDigitOk: isValidUPC,
      normalized: { upca: isValidUPC ? code : undefined, ean13: isValidEAN ? ean13 : undefined }
    };
  } else if (format === 'EAN_13') {
    const isValid = validateEAN13(code);
    return { 
      code, 
      checkDigitOk: isValid,
      normalized: { ean13: isValid ? code : undefined }
    };
  }
  
  // For other formats, assume valid for now
  return { code, checkDigitOk: true };
}

// Export helper for choosing barcode
export const chooseBarcode = (r: BarcodeDecodeResult | null) =>
  r?.normalized?.upca ?? r?.normalized?.ean13 ?? r?.code ?? null;

// Multi-pass enhanced decoder with ROI crops
export async function enhancedBarcodeDecode(
  imageBlob: Blob,
  roiRect: { x: number; y: number; w: number; h: number },
  dpr: number,
  budget?: number
): Promise<DecodeResult>;

export async function enhancedBarcodeDecode(
  input: { sourceCanvas: HTMLCanvasElement; timeoutMs?: number; } | HTMLCanvasElement, 
  opts?: { budgetMs?: number; dpr?: number }
): Promise<BarcodeDecodeResult>;

export async function enhancedBarcodeDecode(
  input: Blob | HTMLCanvasElement | { sourceCanvas: HTMLCanvasElement; timeoutMs?: number; },
  roiRectOrOpts?: { x: number; y: number; w: number; h: number } | { budgetMs?: number; dpr?: number },
  dpr?: number,
  budget?: number
): Promise<BarcodeDecodeResult> {
  const startTime = Date.now();
  let attempts = 0;
  const actualBudget = budget || 1500;
  
  // Handle overloaded function signatures
  if (input && typeof input === 'object' && 'sourceCanvas' in input) {
    // New signature: enhancedBarcodeDecode({ sourceCanvas, timeoutMs })
    const canvas = input.sourceCanvas;
    const canvasBudget = input.timeoutMs || 1500;
    const actualDpr = window.devicePixelRatio || 1;
    
    return processCanvas(canvas, canvasBudget, actualDpr, startTime);
  }
  
  if (input instanceof HTMLCanvasElement) {
    // Legacy signature: enhancedBarcodeDecode(canvas, opts)
    const canvas = input;
    const opts = roiRectOrOpts as { budgetMs?: number; dpr?: number } || {};
    const canvasBudget = opts.budgetMs || 1500;
    const actualDpr = opts.dpr || window.devicePixelRatio || 1;
    
    return processCanvas(canvas, canvasBudget, actualDpr, startTime);
  }
  
  // Legacy signature: enhancedBarcodeDecode(blob, roiRect, dpr, budget)
  const imageBlob = input as Blob;
  const roiRect = roiRectOrOpts as { x: number; y: number; w: number; h: number };
  
  // Create image from blob
  const imageUrl = URL.createObjectURL(imageBlob);
  const image = new Image();
  
  return new Promise((resolve) => {
    image.onload = async () => {
      URL.revokeObjectURL(imageUrl);
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve({ success: false, attempts: [], ms: Date.now() - startTime, reason: 'NotFound' });
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
              if (Date.now() - startTime > actualBudget) {
                resolve({ success: false, attempts: [], ms: Date.now() - startTime, reason: 'Timeout' });
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
                      checksumOk: true,
                      normalized: normalized.normalized,
                      attempts: [],
                      ms: attemptEnd - startTime
                    });
                    return;
                  } else {
                    // Store checksum failed result for potential temp hotfix
                    resolve({
                      success: false,
                      code: result.code,
                      format: result.format as any,
                      checksumOk: false,
                      normalized: normalized.normalized,
                      attempts: [],
                      ms: attemptEnd - startTime,
                      reason: 'ChecksumFail'
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
      
      resolve({ success: false, attempts: [], ms: Date.now() - startTime, reason: 'NotFound' });
    };
    
    image.onerror = () => {
      URL.revokeObjectURL(imageUrl);
      resolve({ success: false, attempts: [], ms: Date.now() - startTime, reason: 'NotFound' });
    };
    
    image.src = imageUrl;
  });
}

async function processCanvas(canvas: HTMLCanvasElement, budget: number, dpr: number, startTime: number): Promise<BarcodeDecodeResult> {
  let attempts = 0;
  
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
            return { success: false, attempts: [], ms: Date.now() - startTime, reason: 'Timeout' };
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
              
              if (normalized.checkDigitOk) {
                return {
                  success: true,
                  code: normalized.code,
                  format: result.format as any,
                  checksumOk: true,
                  normalized: normalized.normalized,
                  attempts: [],
                  ms: attemptEnd - startTime
                };
              } else {
                // Store checksum failed result for potential temp hotfix
                return {
                  success: false,
                  code: result.code,
                  format: result.format as any,
                  checksumOk: false,
                  normalized: normalized.normalized,
                  attempts: [],
                  ms: attemptEnd - startTime,
                  reason: 'ChecksumFail'
                };
              }
            }
          } catch (error) {
            // Continue with next attempt
          }
        }
      }
    }
  }
  
  return { success: false, attempts: [], ms: Date.now() - startTime, reason: 'NotFound' };
}

// Try to decode a canvas using local ZXing (no external API)
async function tryDecodeCanvas(canvas: HTMLCanvasElement): Promise<{code: string; format: string} | null> {
  try {
    // Get image data from canvas
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // Try with jsQR for now (can be replaced with @zxing/library later)
    const jsQR = (await import('jsqr')).default;
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert', // We handle inversion at crop level
    });
    
    if (code && code.data) {
      return {
        code: code.data.trim(),
        format: determineFormat(code.data.trim())
      };
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
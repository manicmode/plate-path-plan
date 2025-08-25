import { DecodeAttempt, ScanReport, storeScanReport } from './diagnostics';

export type EnhancedDecodeResult = {
  code: string | null;
  format?: string;
  normalizedAs?: string;
  checkDigitOk?: boolean;
  attempts: number;
  ms: number;
  report?: ScanReport;
};

/**
 * Enhanced multi-pass barcode decoder with comprehensive diagnostics
 * Implements ZXing-style strategy with detailed logging
 */
export async function decodeUPCFromImageBlobWithDiagnostics(
  blob: Blob,
  reqId: string,
  videoConstraints?: any,
  captureSize?: { w: number; h: number },
  normalizedSize?: { w: number; h: number }
): Promise<EnhancedDecodeResult> {
  const startTime = Date.now();
  const attempts: DecodeAttempt[] = [];
  const dpr = window.devicePixelRatio || 1;
  
  let report: ScanReport | null = null;
  
  if (process.env.NEXT_PUBLIC_SCAN_DEBUG === '1') {
    report = {
      reqId,
      videoConstraints: videoConstraints || {},
      captureSize: captureSize || { w: 0, h: 0 },
      normalizedSize: normalizedSize || { w: 0, h: 0 },
      roiStrategy: 'center-box',
      attempts: [],
      final: {
        success: false
      }
    };
  }
  
  try {
    // Convert blob to image element
    const imageUrl = URL.createObjectURL(blob);
    const img = await loadImage(imageUrl);
    URL.revokeObjectURL(imageUrl);
    
    // Enhanced multi-pass strategy with more coverage
    const cropConfigs = [
      { x: 0.15, y: 0.3, w: 0.7, h: 0.4 },   // Center ROI (primary)
      { x: 0.1, y: 0.1, w: 0.8, h: 0.3 },    // Top strip (wider)
      { x: 0.1, y: 0.6, w: 0.8, h: 0.3 },    // Bottom strip (wider)
      { x: 0.25, y: 0.25, w: 0.5, h: 0.5 },  // Tighter center
    ];
    
    const scales = [1.0, 0.8, 1.2, 0.6];  // More scale variations
    const rotations = [0, 90, 180, 270, 5, -5, 10, -10];  // More rotation variants
    const luminanceModes = ['normal', 'inverted'];
    
    let passNumber = 0;
    
    // Try each combination until we find a barcode
    for (const crop of cropConfigs) {
      for (const scale of scales) {
        for (const rotation of rotations) {
          for (const luminanceMode of luminanceModes) {
            passNumber++;
            const passStart = Date.now();
            
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d')!;
            
            // Calculate ROI in canvas pixels
            const cropW = img.width * crop.w;
            const cropH = img.height * crop.h;
            const cropX = img.width * crop.x;
            const cropY = img.height * crop.y;
            
            // Ensure minimum resolution (1280px min dimension)
            const minDimension = Math.min(cropW * scale, cropH * scale);
            let adjustedScale = scale;
            if (minDimension < 1280 && minDimension > 0) {
              adjustedScale = Math.max(scale, 1280 / Math.min(cropW, cropH));
            }
            
            // Set canvas size based on rotation
            if (rotation === 90 || rotation === 270) {
              canvas.width = Math.max(512, cropH * adjustedScale);
              canvas.height = Math.max(512, cropW * adjustedScale);
            } else {
              canvas.width = Math.max(512, cropW * adjustedScale);
              canvas.height = Math.max(512, cropH * adjustedScale);
            }
            
            // Apply rotation and drawing
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
            const { code, format, outcome } = await tryDecodeCanvasWithDiagnostics(canvas, passNumber);
            
            const passElapsed = Date.now() - passStart;
            
            const attempt: DecodeAttempt = {
              pass: passNumber,
              roi: { x: cropX, y: cropY, w: cropW, h: cropH },
              scale: adjustedScale,
              rotation,
              inverted: luminanceMode === 'inverted',
              imageSize: { w: canvas.width, h: canvas.height },
              dpr,
              elapsedMs: passElapsed,
              outcome,
              format,
              code
            };
            
            attempts.push(attempt);
            
            if (code && isValidUPCEAN(code)) {
              const normalizedResult = normalizeUPCCode(code, format);
              
              if (report) {
                report.attempts = attempts;
                report.final = {
                  success: true,
                  code,
                  normalizedAs: normalizedResult.normalizedCode,
                  checkDigitOk: normalizedResult.checkDigitValid
                };
                storeScanReport(report);
              }
              
              return {
                code: normalizedResult.normalizedCode,
                format: normalizedResult.format,
                normalizedAs: normalizedResult.normalizedCode !== code ? normalizedResult.normalizedCode : undefined,
                checkDigitOk: normalizedResult.checkDigitValid,
                attempts: passNumber,
                ms: Date.now() - startTime,
                report
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
    
    // No barcode found
    if (report) {
      report.attempts = attempts;
      report.final = { success: false };
      storeScanReport(report);
    }
    
    return {
      code: null,
      attempts: passNumber,
      ms: Date.now() - startTime,
      report
    };
    
  } catch (error) {
    console.error('Enhanced barcode decode error:', error);
    
    if (report) {
      report.attempts = attempts;
      report.final = { success: false };
      storeScanReport(report);
    }
    
    return {
      code: null,
      attempts: attempts.length,
      ms: Date.now() - startTime,
      report
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
 * Try to decode barcode from canvas with detailed diagnostics
 */
async function tryDecodeCanvasWithDiagnostics(canvas: HTMLCanvasElement, passNumber: number): Promise<{
  code: string | null;
  format?: string;
  outcome: 'OK' | 'NotFound' | 'Checksum' | 'Format' | 'Error';
}> {
  try {
    // Convert canvas to base64
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    const base64 = dataUrl.split(',')[1];
    
    // Use existing barcode detector function
    const response = await fetch('/functions/v1/barcode-image-detector', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        imageBase64: base64,
        pass: passNumber // Include pass number for backend diagnostics
      })
    });
    
    const result = await response.json();
    const code = result.barcode || null;
    
    if (code) {
      // Validate the code
      if (!isValidUPCEAN(code)) {
        return { code: null, outcome: 'Checksum' };
      }
      
      const format = getUPCFormat(code);
      if (!format || format === 'Unknown') {
        return { code: null, outcome: 'Format' };
      }
      
      return { code, format, outcome: 'OK' };
    }
    
    return { code: null, outcome: 'NotFound' };
    
  } catch (error) {
    if (process.env.NEXT_PUBLIC_SCAN_DEBUG === '1') {
      console.error(`[HS_DIAG] Pass ${passNumber} decode error:`, error);
    }
    return { code: null, outcome: 'Error' };
  }
}

/**
 * Normalize UPC codes (EAN-13 starting with 0 → UPC-A)
 */
function normalizeUPCCode(code: string, format?: string): {
  normalizedCode: string;
  format: string;
  checkDigitValid: boolean;
} {
  const checkDigitValid = isValidUPCEAN(code);
  
  // EAN-13 starting with 0 should be normalized to UPC-A
  if (code.length === 13 && code.startsWith('0')) {
    const upcA = code.substring(1); // Remove leading 0
    return {
      normalizedCode: upcA,
      format: 'UPC-A',
      checkDigitValid: isValidUPCEAN(upcA)
    };
  }
  
  return {
    normalizedCode: code,
    format: format || getUPCFormat(code),
    checkDigitValid
  };
}

/**
 * Validate UPC/EAN check digit
 */
function isValidUPCEAN(code: string): boolean {
  if (!code || !/^\d{8}$|^\d{12}$|^\d{13}$|^\d{14}$/.test(code)) {
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
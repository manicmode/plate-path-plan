import { ScanReport, startScanReport, logAttempt, finalizeScanReport } from './diagnostics';

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
  const dpr = window.devicePixelRatio || 1;
  
  // Initialize diagnostics if debug mode is enabled
  if (process.env.NEXT_PUBLIC_SCAN_DEBUG === '1') {
    const roi = {
      x: (normalizedSize?.w || 0) * 0.1,
      y: (normalizedSize?.h || 0) * 0.35,
      w: (normalizedSize?.w || 0) * 0.8,
      h: (normalizedSize?.h || 0) * 0.3,
      strategy: 'center-band-30'
    };
    
    startScanReport(
      captureSize || { w: 0, h: 0 },
      normalizedSize || { w: 0, h: 0 },
      roi,
      dpr,
      videoConstraints || {}
    );
  }
  
  try {
    // Convert blob to image element
    const imageUrl = URL.createObjectURL(blob);
    const img = await loadImage(imageUrl);
    URL.revokeObjectURL(imageUrl);
    
    // Multi-pass strategy with horizontal band ROI for UPC/EAN detection
    const cropConfigs = [
      { name: 'center-band-30', x: 0.1, y: 0.35, w: 0.8, h: 0.3 },    // Primary horizontal band
      { name: 'center-box', x: 0.2, y: 0.3, w: 0.6, h: 0.4 },         // Center square
      { name: 'top-band', x: 0.1, y: 0.15, w: 0.8, h: 0.25 },         // Upper horizontal band
      { name: 'bottom-band', x: 0.1, y: 0.6, w: 0.8, h: 0.25 },       // Lower horizontal band
    ];
    
    const scales = [1.0, 0.75, 0.5];  // Ensure minimum resolution ≥ 1080px
    const rotations = [0, 90, 180, 270, 8, -8];  // TRY_HARDER rotations
    const luminanceModes = [false, true];  // normal, inverted
    
    let passNumber = 0;
    
    // Try each combination until we find a barcode
    for (const crop of cropConfigs) {
      for (const scale of scales) {
        for (const rotation of rotations) {
          for (const inverted of luminanceModes) {
            passNumber++;
            const passStart = Date.now();
            
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d')!;
            
            // Calculate ROI in canvas pixels
            const cropW = img.width * crop.w;
            const cropH = img.height * crop.h;
            const cropX = img.width * crop.x;
            const cropY = img.height * crop.y;
            
            // Ensure minimum resolution (shorter side ≥ 1080px for barcode detection)
            const minDimension = Math.min(cropW * scale, cropH * scale);
            let adjustedScale = scale;
            if (minDimension < 1080 && minDimension > 0) {
              adjustedScale = Math.max(scale, 1080 / Math.min(cropW, cropH));
            }
            
            // Set canvas size based on rotation
            if (rotation === 90 || rotation === 270) {
              canvas.width = Math.max(1080, cropH * adjustedScale);
              canvas.height = Math.max(1080, cropW * adjustedScale);
            } else {
              canvas.width = Math.max(1080, cropW * adjustedScale);
              canvas.height = Math.max(1080, cropH * adjustedScale);
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
            if (inverted) {
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
            
            // Log attempt for diagnostics
            if (process.env.NEXT_PUBLIC_SCAN_DEBUG === '1') {
              logAttempt(passNumber, rotation, adjustedScale, inverted, crop.name, outcome, passElapsed, format, code);
            }
            
            if (code && isValidUPCEAN(code)) {
              const normalizedResult = normalizeUPCCode(code, format);
              const totalMs = Date.now() - startTime;
              
              // Finalize scan report
              const report = finalizeScanReport(
                true,
                totalMs,
                code,
                normalizedResult.normalizedCode,
                normalizedResult.checkDigitValid,
                undefined, // OFF lookup will be handled separately
                true, // willScore
                false // willFallback
              );
              
              return {
                code: normalizedResult.normalizedCode,
                format: normalizedResult.format,
                normalizedAs: normalizedResult.normalizedCode !== code ? normalizedResult.normalizedCode : undefined,
                checkDigitOk: normalizedResult.checkDigitValid,
                attempts: passNumber,
                ms: totalMs,
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
    const totalMs = Date.now() - startTime;
    const report = finalizeScanReport(
      false,
      totalMs,
      undefined,
      undefined,
      undefined,
      undefined,
      false, // willScore
      true // willFallback
    );
    
    return {
      code: null,
      attempts: passNumber,
      ms: totalMs,
      report
    };
    
  } catch (error) {
    console.error('Enhanced barcode decode error:', error);
    
    const totalMs = Date.now() - startTime;
    const report = finalizeScanReport(
      false,
      totalMs,
      undefined,
      undefined,
      undefined,
      undefined,
      false,
      true
    );
    
    return {
      code: null,
      attempts: 0,
      ms: totalMs,
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
 * Validate UPC/EAN check digit with correct UPC-A parity
 */
function isValidUPCEAN(code: string): boolean {
  if (!code || !/^\d{8}$|^\d{12}$|^\d{13}$|^\d{14}$/.test(code)) {
    return false;
  }
  
  // UPC-A (12 digits) check digit validation - correct parity
  if (code.length === 12) {
    const digits = code.slice(0, -1).split('').map(Number);
    const checkDigit = parseInt(code.slice(-1));
    
    let sum = 0;
    for (let i = 0; i < digits.length; i++) {
      // UPC-A parity: odd positions (1st, 3rd, 5th...) * 3, even positions * 1
      sum += digits[i] * (i % 2 === 0 ? 3 : 1);
    }
    
    const calculatedCheck = (10 - (sum % 10)) % 10;
    return calculatedCheck === checkDigit;
  }
  
  // EAN-13 (13 digits) check digit validation
  if (code.length === 13) {
    const digits = code.slice(0, -1).split('').map(Number);
    const checkDigit = parseInt(code.slice(-1));
    
    let sum = 0;
    for (let i = 0; i < digits.length; i++) {
      // EAN-13 parity: odd positions * 1, even positions * 3
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
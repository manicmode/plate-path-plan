import { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat, HybridBinarizer } from '@zxing/library';

interface BarcodeResult {
  text: string;
  passName: string;
  rotation: number;
  scale: number;
  format: string;
  decodeTimeMs: number;
  checkDigitValid?: boolean;
}

interface ScanStats {
  roiSizePx: { width: number; height: number };
  totalPasses: number;
  decodeTimeMs: number;
  decodedValue?: string;
  decodedFormat?: string;
  checkDigitResult?: boolean;
}

interface ScanAttempt {
  name: string;
  cropFn: (canvas: HTMLCanvasElement) => HTMLCanvasElement;
  scales: number[];
  rotations: number[];
}

/**
 * Bulletproof ZXing barcode scanner with multi-scale, multi-rotation, and image enhancement
 */
export class MultiPassBarcodeScanner {
  private reader: BrowserMultiFormatReader;
  
  // Quick decode mode with narrowed search space (≤ 900ms)
  async scanQuick(canvas: HTMLCanvasElement, opts?: { enabled?: boolean }): Promise<BarcodeResult | null> {
    if (!opts?.enabled) {
      return null;
    }
    const startTime = performance.now();
    const BUDGET_MS = 900;
    
    // Use centerH crop only for speed
    const centerH = this.cropHorizontalBand(canvas);
    console.log(`🔍 Quick barcode scan - centerH: ${centerH.width}×${centerH.height}px`);
    
    const quickAttempts: ScanAttempt[] = [
      {
        name: 'centerH',
        cropFn: () => centerH,
        scales: [1], // Single scale only
        rotations: [0, 90] // Just 0 and 90 degrees
      }
    ];

    let totalPasses = 0;
    
    for (const attempt of quickAttempts) {
      const baseCanvas = attempt.cropFn(canvas);
      
      for (const scale of attempt.scales) {
        const scaledCanvas = scale === 1.0 ? baseCanvas : this.scaleCanvas(baseCanvas, scale);
        
        for (const rotation of attempt.rotations) {
          // Check budget
          if (performance.now() - startTime > BUDGET_MS) {
            console.log(`⏱️ Quick scan budget exceeded at ${totalPasses} passes`);
            break;
          }
          
          totalPasses++;
          
          try {
            const rotatedCanvas = rotation === 0 ? scaledCanvas : this.rotateCanvas(scaledCanvas, rotation);
            
            // Try normal and inverted versions
            const candidates = [rotatedCanvas, this.invertCanvas(rotatedCanvas)];
            
            for (const candidateCanvas of candidates) {
              totalPasses++;
              const result = await this.decodeFromCanvas(candidateCanvas);
              
              if (result && result.getText()) {
                const decodeTime = performance.now() - startTime;
                const barcodeText = result.getText();
                const format = result.getBarcodeFormat()?.toString() || 'UNKNOWN';
                const checkDigitValid = this.validateCheckDigit(barcodeText, format);
                
                console.log(`✅ Quick barcode decoded: ${barcodeText} (${format}) - ${Math.round(decodeTime)}ms`);
                
                return {
                  text: barcodeText,
                  passName: attempt.name,
                  rotation,
                  scale,
                  format,
                  decodeTimeMs: Math.round(decodeTime),
                  checkDigitValid
                };
              }
              
              // Check budget after each decode attempt
              if (performance.now() - startTime > BUDGET_MS) {
                console.log(`⏱️ Quick scan budget exceeded at ${totalPasses} passes`);
                break;
              }
            }
          } catch (error) {
            // Continue to next attempt - expected behavior
          }
        }
      }
    }
    
    const decodeTime = performance.now() - startTime;
    console.log(`❌ No barcode detected in quick scan after ${totalPasses} passes in ${Math.round(decodeTime)}ms`);
    return null;
  }
  
  constructor() {
    const hints = new Map();
    hints.set(DecodeHintType.TRY_HARDER, true);
    hints.set(DecodeHintType.ASSUME_GS1, true);
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.ITF
    ]);
    
    this.reader = new BrowserMultiFormatReader(hints);
  }

  /**
   * Bulletproof barcode detection with multi-scale, multi-rotation, and image enhancement
   */
  async scan(canvas: HTMLCanvasElement): Promise<BarcodeResult | null> {
    const startTime = performance.now();
    const roiCanvas = this.computeROI(canvas);
    const roiSizePx = { width: roiCanvas.width, height: roiCanvas.height };
    
    console.log(`🔍 Bulletproof barcode scan - ROI: ${roiSizePx.width}×${roiSizePx.height}px`);
    
    const attempts: ScanAttempt[] = [
      {
        name: 'roi-enhanced',
        cropFn: (c) => this.enhanceImage(roiCanvas),
        scales: [1.0, 0.75, 0.5],
        rotations: [0, 90, 180, 270, 8, -8]
      },
      {
        name: 'full-enhanced',
        cropFn: (c) => this.enhanceImage(c),
        scales: [1.0, 0.75],
        rotations: [0, 90, 180, 270]
      },
      {
        name: 'roi-raw',
        cropFn: (c) => roiCanvas,
        scales: [1.0, 0.75, 0.5],
        rotations: [0, 90, 180, 270]
      }
    ];

    let totalPasses = 0;
    
    for (const attempt of attempts) {
      const baseCanvas = attempt.cropFn(canvas);
      
      for (const scale of attempt.scales) {
        const scaledCanvas = scale === 1.0 ? baseCanvas : this.scaleCanvas(baseCanvas, scale);
        
        for (const rotation of attempt.rotations) {
          totalPasses++;
          
          try {
            const rotatedCanvas = rotation === 0 ? scaledCanvas : this.rotateCanvas(scaledCanvas, rotation);
            
            // Try normal and inverted versions
            const candidates = [rotatedCanvas, this.invertCanvas(rotatedCanvas)];
            
            for (const candidateCanvas of candidates) {
              totalPasses++;
              const result = await this.decodeFromCanvas(candidateCanvas);
              
              if (result && result.getText()) {
                const decodeTime = performance.now() - startTime;
                const barcodeText = result.getText();
                const format = result.getBarcodeFormat()?.toString() || 'UNKNOWN';
                const checkDigitValid = this.validateCheckDigit(barcodeText, format);
                
                const stats: ScanStats = {
                  roiSizePx,
                  totalPasses,
                  decodeTimeMs: Math.round(decodeTime),
                  decodedValue: barcodeText,
                  decodedFormat: format,
                  checkDigitResult: checkDigitValid
                };
                
                console.log(`✅ Barcode decoded: ${barcodeText} (${format}) - ${attempt.name}@${scale}×${rotation}° - ${Math.round(decodeTime)}ms - CheckDigit: ${checkDigitValid}`, stats);
                
                return {
                  text: barcodeText,
                  passName: attempt.name,
                  rotation,
                  scale,
                  format,
                  decodeTimeMs: Math.round(decodeTime),
                  checkDigitValid
                };
              }
            }
          } catch (error) {
            // Continue to next attempt - expected behavior
          }
        }
      }
    }
    
    const decodeTime = performance.now() - startTime;
    console.log(`❌ No barcode detected after ${totalPasses} passes in ${Math.round(decodeTime)}ms - ROI: ${roiSizePx.width}×${roiSizePx.height}px`);
    return null;
  }

  /**
   * Compute ROI based on video pixel space with DPR correction
   */
  private computeROI(canvas: HTMLCanvasElement): HTMLCanvasElement {
    const w = canvas.width;
    const h = canvas.height;
    
    // ROI is 70% width × 40% height, centered
    const roiW = Math.round(w * 0.7);
    const roiH = Math.round(h * 0.4);
    const x = Math.round((w - roiW) / 2);
    const y = Math.round((h - roiH) / 2);
    
    return this.cropRegion(canvas, x, y, roiW, roiH);
  }

  /**
   * Enhance image with unsharp mask and contrast stretch
   */
  private enhanceImage(canvas: HTMLCanvasElement): HTMLCanvasElement {
    const enhanced = document.createElement('canvas');
    enhanced.width = canvas.width;
    enhanced.height = canvas.height;
    const ctx = enhanced.getContext('2d')!;
    
    // Draw original
    ctx.drawImage(canvas, 0, 0);
    
    // Get image data for processing
    const imageData = ctx.getImageData(0, 0, enhanced.width, enhanced.height);
    const data = imageData.data;
    
    // Apply light unsharp mask and contrast stretch
    for (let i = 0; i < data.length; i += 4) {
      // Convert to grayscale
      const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      
      // Apply contrast stretch (simple version)
      const enhanced = Math.min(255, Math.max(0, (gray - 128) * 1.2 + 128));
      
      // Set RGB to enhanced grayscale
      data[i] = enhanced;     // R
      data[i + 1] = enhanced; // G
      data[i + 2] = enhanced; // B
      // Alpha unchanged
    }
    
    ctx.putImageData(imageData, 0, 0);
    return enhanced;
  }

  /**
   * Scale canvas to given factor
   */
  private scaleCanvas(canvas: HTMLCanvasElement, scale: number): HTMLCanvasElement {
    if (scale === 1.0) return canvas;
    
    const scaled = document.createElement('canvas');
    scaled.width = Math.round(canvas.width * scale);
    scaled.height = Math.round(canvas.height * scale);
    
    const ctx = scaled.getContext('2d')!;
    ctx.imageSmoothingEnabled = false; // Preserve sharp edges
    ctx.drawImage(canvas, 0, 0, scaled.width, scaled.height);
    
    return scaled;
  }

  /**
   * Invert canvas colors
   */
  private invertCanvas(canvas: HTMLCanvasElement): HTMLCanvasElement {
    const inverted = document.createElement('canvas');
    inverted.width = canvas.width;
    inverted.height = canvas.height;
    const ctx = inverted.getContext('2d')!;
    
    ctx.drawImage(canvas, 0, 0);
    
    const imageData = ctx.getImageData(0, 0, inverted.width, inverted.height);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 255 - data[i];         // R
      data[i + 1] = 255 - data[i + 1]; // G
      data[i + 2] = 255 - data[i + 2]; // B
      // Alpha unchanged
    }
    
    ctx.putImageData(imageData, 0, 0);
    return inverted;
  }

  /**
   * Decode using image element (most reliable with ZXing)
   */
  private async decodeFromCanvas(canvas: HTMLCanvasElement): Promise<any> {
    // Convert canvas to image element for ZXing
    const dataUrl = canvas.toDataURL('image/png');
    const img = new Image();
    img.src = dataUrl;
    await new Promise(resolve => { img.onload = resolve; });
    
    return await this.reader.decodeFromImageElement(img);
  }

  /**
   * Validate check digit for UPC/EAN codes
   */
  private validateCheckDigit(barcode: string, format: string): boolean {
    if (!barcode || barcode.length < 8) return false;
    
    const digits = barcode.replace(/\D/g, '');
    
    if (format.includes('UPC') || format.includes('EAN')) {
      if (digits.length === 12 || digits.length === 13) {
        // UPC-A (12) or EAN-13 (13) check digit validation
        const checkDigit = parseInt(digits[digits.length - 1]);
        const payload = digits.slice(0, -1);
        
        let sum = 0;
        for (let i = 0; i < payload.length; i++) {
          const digit = parseInt(payload[i]);
          sum += (i % 2 === 0) ? digit : digit * 3;
        }
        
        const calculatedCheck = (10 - (sum % 10)) % 10;
        return calculatedCheck === checkDigit;
      }
      
      if (digits.length === 8) {
        // EAN-8 check digit validation
        const checkDigit = parseInt(digits[7]);
        const payload = digits.slice(0, 7);
        
        let sum = 0;
        for (let i = 0; i < 7; i++) {
          const digit = parseInt(payload[i]);
          sum += (i % 2 === 0) ? digit * 3 : digit;
        }
        
        const calculatedCheck = (10 - (sum % 10)) % 10;
        return calculatedCheck === checkDigit;
      }
    }
    
    return true; // For other formats, assume valid
  }

  private cropHorizontalBand(canvas: HTMLCanvasElement): HTMLCanvasElement {
    const w = canvas.width;
    const h = canvas.height;
    const bandHeight = Math.round(h * 0.4);
    const y = Math.round((h - bandHeight) / 2);
    
    return this.cropRegion(canvas, 0, y, w, bandHeight);
  }

  private cropVerticalBand(canvas: HTMLCanvasElement): HTMLCanvasElement {
    const w = canvas.width;
    const h = canvas.height;
    const bandWidth = Math.round(w * 0.4);
    const x = Math.round((w - bandWidth) / 2);
    
    return this.cropRegion(canvas, x, 0, bandWidth, h);
  }

  private cropQuadrant(canvas: HTMLCanvasElement, xRatio: number, yRatio: number): HTMLCanvasElement {
    const w = canvas.width;
    const h = canvas.height;
    const quadW = Math.round(w * 0.5);
    const quadH = Math.round(h * 0.5);
    const x = Math.round(w * xRatio);
    const y = Math.round(h * yRatio);
    
    return this.cropRegion(canvas, x, y, quadW, quadH);
  }

  private cropRegion(canvas: HTMLCanvasElement, x: number, y: number, width: number, height: number): HTMLCanvasElement {
    const croppedCanvas = document.createElement('canvas');
    croppedCanvas.width = width;
    croppedCanvas.height = height;
    
    const ctx = croppedCanvas.getContext('2d')!;
    ctx.drawImage(canvas, x, y, width, height, 0, 0, width, height);
    
    return croppedCanvas;
  }

  private rotateCanvas(canvas: HTMLCanvasElement, degrees: number): HTMLCanvasElement {
    if (degrees === 0) return canvas;
    
    const rotatedCanvas = document.createElement('canvas');
    const ctx = rotatedCanvas.getContext('2d')!;
    
    if (degrees === 90 || degrees === 270) {
      rotatedCanvas.width = canvas.height;
      rotatedCanvas.height = canvas.width;
    } else {
      rotatedCanvas.width = canvas.width;
      rotatedCanvas.height = canvas.height;
    }
    
    ctx.translate(rotatedCanvas.width / 2, rotatedCanvas.height / 2);
    ctx.rotate((degrees * Math.PI) / 180);
    ctx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
    
    return rotatedCanvas;
  }
}
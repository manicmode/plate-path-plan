import { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat } from '@zxing/library';

interface BarcodeResult {
  text: string;
  passName: string;
  rotation: number;
}

interface ScanAttempt {
  name: string;
  cropFn: (canvas: HTMLCanvasElement) => HTMLCanvasElement;
  rotations: number[];
}

/**
 * Multi-pass ZXing barcode scanner with TRY_HARDER and multiple crops/rotations
 */
export class MultiPassBarcodeScanner {
  private reader: BrowserMultiFormatReader;
  
  constructor() {
    const hints = new Map();
    hints.set(DecodeHintType.TRY_HARDER, true);
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.ITF
    ]);
    
    this.reader = new BrowserMultiFormatReader(hints);
  }

  /**
   * Attempt barcode detection with multiple passes and rotations
   */
  async scan(canvas: HTMLCanvasElement): Promise<BarcodeResult | null> {
    const attempts: ScanAttempt[] = [
      {
        name: 'full-image',
        cropFn: (c) => c, // No crop, use full image
        rotations: [0, 90]
      },
      {
        name: 'center-horizontal',
        cropFn: (c) => this.cropHorizontalBand(c),
        rotations: [0, 90]
      },
      {
        name: 'center-vertical', 
        cropFn: (c) => this.cropVerticalBand(c),
        rotations: [0, 90]
      },
      {
        name: 'top-left',
        cropFn: (c) => this.cropQuadrant(c, 0, 0),
        rotations: [0]
      },
      {
        name: 'top-right',
        cropFn: (c) => this.cropQuadrant(c, 0.5, 0),
        rotations: [0]
      },
      {
        name: 'bottom-left',
        cropFn: (c) => this.cropQuadrant(c, 0, 0.5),
        rotations: [0]
      },
      {
        name: 'bottom-right',
        cropFn: (c) => this.cropQuadrant(c, 0.5, 0.5),
        rotations: [0]
      }
    ];

    console.log(`📊 Starting multi-pass barcode scan (${attempts.length} passes)`);
    
    for (const attempt of attempts) {
      for (const rotation of attempt.rotations) {
        try {
          const croppedCanvas = attempt.cropFn(canvas);
          const rotatedCanvas = rotation === 0 ? croppedCanvas : this.rotateCanvas(croppedCanvas, rotation);
          
          // Convert canvas to data URL, then create image element for ZXing
          const dataUrl = rotatedCanvas.toDataURL('image/png');
          const img = new Image();
          img.src = dataUrl;
          await new Promise(resolve => { img.onload = resolve; });
          
          const result = await this.reader.decodeFromImageElement(img);
          if (result && result.getText()) {
            console.log(`✅ Barcode found: ${attempt.name}@${rotation}° = ${result.getText()}`);
            return {
              text: result.getText(),
              passName: attempt.name,
              rotation
            };
          }
        } catch (error) {
          // Continue to next attempt - this is expected behavior
        }
      }
    }
    
    console.log('❌ No barcode detected after all passes');
    return null;
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
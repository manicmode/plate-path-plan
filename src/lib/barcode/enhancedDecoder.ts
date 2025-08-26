// Enhanced multi-pass barcode decoder with ZXing 1D support
import { logAttempt, ScanReport, Attempt } from './diagnostics';
import {
  MultiFormatReader,
  BarcodeFormat,
  DecodeHintType,
  RGBLuminanceSource,
  BinaryBitmap,
  HybridBinarizer,
  NotFoundException,
  Result
} from '@zxing/library';

export type BarcodeAttempt = {
  crop: string; scale: number; rotation: number; inverted: boolean;
  outcome: 'ok'|'not_found'|'checksum_fail'|'error';
  code?: string; format?: string; ms: number;
};

export type BarcodeDecodeResult = {
  success: boolean;
  code?: string;
  format?: string;
  checksumOk?: boolean;
  normalized?: { upca?: string; ean13?: string };
  attempts: BarcodeAttempt[];
  ms: number;
  reason?: string;
};

export type DecodeResult = BarcodeDecodeResult;

// UPC-A checksum validation 
function checksumUPCA(digits: string): boolean {
  if (!/^\d{12,13}$/.test(digits)) return false;
  const code = digits.length === 13 ? digits.slice(1) : digits; // allow leading-0 EAN13
  const sumOdd = [...code.slice(0,11)].reduce((s, d, i) => s + ((i % 2 === 0) ? Number(d) : 0), 0);
  const sumEven = [...code.slice(0,11)].reduce((s, d, i) => s + ((i % 2 === 1) ? Number(d) : 0), 0);
  const check = (10 - ((sumOdd * 3 + sumEven) % 10)) % 10;
  return check === Number(code[11]);
}

// EAN-13 checksum validation  
function checksumEAN13(digits: string): boolean {
  if (!/^\d{13}$/.test(digits)) return false;
  const sumOdd = [...digits.slice(0,12)].reduce((s, d, i) => s + ((i % 2 === 0) ? Number(d) : 0), 0);
  const sumEven = [...digits.slice(0,12)].reduce((s, d, i) => s + ((i % 2 === 1) ? Number(d) : 0), 0);
  const check = (10 - ((sumOdd + sumEven * 3) % 10)) % 10;
  return check === Number(digits[12]);
}

// Build multipass canvases for ZXing decode
function buildMultipassCanvases(canvas: HTMLCanvasElement): Array<{canvas: HTMLCanvasElement, label: string, rotation: number, scale: number, inverted: boolean}> {
  const passes: Array<{canvas: HTMLCanvasElement, label: string, rotation: number, scale: number, inverted: boolean}> = [];
  
  const crops = [
    { name: 'full', rect: { x: 0, y: 0, w: canvas.width, h: canvas.height } },
    { name: 'bandH', rect: { x: 0, y: Math.floor(canvas.height * 0.35), w: canvas.width, h: Math.floor(canvas.height * 0.30) } },
    { name: 'bandV', rect: { x: Math.floor(canvas.width * 0.35), y: 0, w: Math.floor(canvas.width * 0.30), h: canvas.height } },
    { name: 'q1', rect: { x: 0, y: 0, w: Math.floor(canvas.width * 0.5), h: Math.floor(canvas.height * 0.5) } },
    { name: 'q2', rect: { x: Math.floor(canvas.width * 0.5), y: 0, w: Math.floor(canvas.width * 0.5), h: Math.floor(canvas.height * 0.5) } },
    { name: 'q3', rect: { x: 0, y: Math.floor(canvas.height * 0.5), w: Math.floor(canvas.width * 0.5), h: Math.floor(canvas.height * 0.5) } },
    { name: 'q4', rect: { x: Math.floor(canvas.width * 0.5), y: Math.floor(canvas.height * 0.5), w: Math.floor(canvas.width * 0.5), h: Math.floor(canvas.height * 0.5) } }
  ];
  
  const scales = [1.0, 0.75, 0.5];
  const rotations = [0, 90];
  const polarities = [false]; // Skip inversion for now with ZXing
  
  for (const crop of crops) {
    for (const scale of scales) {
      for (const rotation of rotations) {
        for (const inverted of polarities) {
          const finalW = Math.floor(crop.rect.w * scale);
          const finalH = Math.floor(crop.rect.h * scale);
          
          const cropCanvas = document.createElement('canvas');
          const cropCtx = cropCanvas.getContext('2d')!;
          
          cropCanvas.width = finalW;
          cropCanvas.height = finalH;
          
          // Apply rotation
          if (rotation !== 0) {
            cropCtx.save();
            cropCtx.translate(finalW / 2, finalH / 2);
            cropCtx.rotate((rotation * Math.PI) / 180);
            cropCtx.translate(-finalW / 2, -finalH / 2);
          }
          
          cropCtx.drawImage(
            canvas,
            crop.rect.x, crop.rect.y, crop.rect.w, crop.rect.h,
            0, 0, finalW, finalH
          );
          
          if (rotation !== 0) {
            cropCtx.restore();
          }
          
          passes.push({
            canvas: cropCanvas,
            label: crop.name,
            rotation,
            scale,
            inverted
          });
        }
      }
    }
  }
  
  return passes;
}

export function chooseBarcode(r: BarcodeDecodeResult | null) {
  if (!r?.success) return null;
  const raw = r.normalized?.upca || r.normalized?.ean13 || r.code || null;
  const type = r.normalized?.upca ? 'upc' : r.normalized?.ean13 ? 'ean13' : (r.format?.toLowerCase() ?? null);
  const checksumOk = r.checksumOk ?? true;
  return raw ? { raw, type, checksumOk, reason: r.reason } : null;
}

// Single-pass decode for a canvas using ZXing
function decodeOnceWithZXing(canvas: HTMLCanvasElement, hints: Map<DecodeHintType, any>) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  const { width, height } = canvas;
  const data = ctx.getImageData(0, 0, width, height);
  const luminance = new RGBLuminanceSource(data.data, width, height);
  const bitmap = new BinaryBitmap(new HybridBinarizer(luminance));
  const reader = new MultiFormatReader();
  reader.setHints(hints);
  return reader.decode(bitmap) as Result; // throws NotFoundException if no code
}

// Main public API for enhanced barcode decode with ZXing
export async function enhancedBarcodeDecode(opts: {
  canvas: HTMLCanvasElement;
  budgetMs?: number;
}): Promise<BarcodeDecodeResult> {
  const t0 = performance.now();
  const attempts: BarcodeAttempt[] = [];
  const hints = new Map();
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [
    BarcodeFormat.UPC_A,
    BarcodeFormat.UPC_E,
    BarcodeFormat.EAN_13,
    BarcodeFormat.EAN_8,
    BarcodeFormat.ITF,
    BarcodeFormat.CODE_128,
  ]);
  hints.set(DecodeHintType.TRY_HARDER, true);
  hints.set(DecodeHintType.ASSUME_GS1, true);

  const passes = buildMultipassCanvases(opts.canvas);
  const budget = opts.budgetMs ?? 1500;

  for (let i = 0; i < passes.length; i++) {
    const p = passes[i];
    const pStart = performance.now();
    try {
      const res = decodeOnceWithZXing(p.canvas, hints);
      const text = res.getText();
      const format = res.getBarcodeFormat().toString();
      
      // Normalize and validate
      const norm = { upca: undefined as string|undefined, ean13: undefined as string|undefined };
      let checksumOk = false;

      if (/^\d{13}$/.test(text) && checksumEAN13(text)) {
        checksumOk = true;
        if (text.startsWith('0')) norm.upca = text.slice(1);
        norm.ean13 = text;
      } else if (/^\d{12}$/.test(text) && checksumUPCA(text)) {
        checksumOk = true;
        norm.upca = text;
        norm.ean13 = `0${text}`;
      } else if (/^\d{8}$/.test(text)) {
        // EAN-8 — accept; no normalization to UPC-A
        checksumOk = true;
      }

      attempts.push({ 
        crop: p.label, 
        scale: p.scale, 
        rotation: p.rotation, 
        inverted: p.inverted, 
        outcome: 'ok', 
        code: text, 
        format, 
        ms: performance.now() - pStart 
      });

      return {
        success: true,
        code: text,
        format,
        checksumOk,
        normalized: norm,
        attempts,
        ms: performance.now() - t0,
      };
    } catch (e) {
      const outcome: BarcodeAttempt['outcome'] =
        e instanceof NotFoundException ? 'not_found' : 'error';
      attempts.push({ 
        crop: p.label, 
        scale: p.scale, 
        rotation: p.rotation, 
        inverted: p.inverted, 
        outcome, 
        ms: performance.now() - pStart 
      });
    }
    if (performance.now() - t0 > budget) break;
  }

  return {
    success: false,
    attempts,
    ms: performance.now() - t0,
    reason: 'not_found',
  };
}

// Legacy overloads for backward compatibility
export async function enhanceBarcodeDecodeCompat(
  input: { sourceCanvas: HTMLCanvasElement; timeoutMs?: number; } | HTMLCanvasElement, 
  opts?: { budgetMs?: number; dpr?: number }
): Promise<BarcodeDecodeResult> {
  // Handle legacy signatures
  if (input && typeof input === 'object' && 'sourceCanvas' in input) {
    return enhancedBarcodeDecode({ 
      canvas: input.sourceCanvas, 
      budgetMs: input.timeoutMs || 1500 
    });
  }
  
  if (input instanceof HTMLCanvasElement) {
    const optsTyped = opts as { budgetMs?: number; dpr?: number } || {};
    return enhancedBarcodeDecode({ 
      canvas: input, 
      budgetMs: optsTyped.budgetMs || 1500 
    });
  }
  
  throw new Error('Unsupported signature');
}

// Compatibility export for backward compatibility
export const decodeUPCFromImageBlobWithDiagnostics = enhanceBarcodeDecodeCompat;
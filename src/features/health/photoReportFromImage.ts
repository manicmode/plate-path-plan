import { normalizeHealthScanImage } from '@/utils/imageNormalization';
import { supabase } from '@/integrations/supabase/client';
import { openHealthReportFromBarcode } from './openHealthReport';
import { devLog } from '@/lib/camera/devLog';

export type PhotoReportResult = {
  success: true;
  route: '/photo';
  source: 'barcode' | 'ocr';
  ocrTextNormalized?: string;
  ocrBlocks?: any[];
  nutritionFields?: any;
  payload: any;
} | {
  error: 'invalid_input' | 'processing_failed' | 'no_text' | 'not_found';
  reason?: string;
}

/**
 * Unified photo pipeline: normalize image -> enhanced-health-scanner -> route accordingly
 * Same pipeline as barcode/manual but with OCR text threading
 */
export async function photoReportFromImage(imageFile: File): Promise<PhotoReportResult> {
  const startTime = Date.now();
  
  try {
    // Input validation
    if (!imageFile || !(imageFile instanceof File)) {
      return { error: 'invalid_input' };
    }

    devLog('PHOTO][CAPTURE', { 
      bytes: imageFile.size, 
      mime: imageFile.type, 
      w: 0, // Will be filled after normalization
      h: 0 
    });

    // 1. Normalize image (fix EXIF orientation, resize to 1280-1600px longest side, JPEG ~0.82)
    const normalized = await normalizeHealthScanImage(imageFile, {
      maxWidth: 1600,
      maxHeight: 1600,
      quality: 0.82,
      format: 'JPEG',
      stripExif: true
    });

    devLog('PHOTO][NORMALIZED', { 
      originalKB: Math.round(imageFile.size / 1024),
      compressedKB: Math.round(normalized.compressedSize / 1024),
      ratio: normalized.compressionRatio,
      w: normalized.width,
      h: normalized.height
    });

    // 2. POST to enhanced-health-scanner with { image }  
    const ocrStartTime = Date.now();
    const { data: result, error } = await supabase.functions.invoke('enhanced-health-scanner', {
      body: { 
        mode: 'scan',
        imageBase64: normalized.dataUrl.split(',')[1], // Remove data URL prefix
        source: 'photo-unified'
      }
    });

    const ocrDuration = Date.now() - ocrStartTime;

    if (error) {
      devLog('PHOTO][OCR][ERR', { duration: ocrDuration, error: error.message });
      return { error: 'processing_failed', reason: error.message };
    }

    if (!result) {
      devLog('PHOTO][OCR][ERR', { duration: ocrDuration, reason: 'no_result' });
      return { error: 'processing_failed', reason: 'No result from scanner' };
    }

    // 3. If the response contains a barcode, short-circuit to the barcode path
    if (result.barcode || result.detectedBarcode) {
      const barcode = result.barcode || result.detectedBarcode;
      devLog('PHOTO][ROUTE', { used: 'barcode', barcode });
      
      const barcodeResult = await openHealthReportFromBarcode(barcode, 'scanner-auto');
      
      if ('error' in barcodeResult) {
        // Map barcode error types to photo error types
        const errorMapping: Record<string, 'invalid_input' | 'processing_failed' | 'no_text' | 'not_found'> = {
          'invalid_barcode': 'invalid_input',
          'fetch_failed': 'processing_failed',
          'not_found': 'not_found'
        };
        return { error: errorMapping[barcodeResult.error] || 'processing_failed' };
      }

      return {
        success: true,
        route: '/photo',
        source: 'barcode',
        payload: {
          ...barcodeResult.payload,
          originalImage: normalized.dataUrl
        }
      };
    }

    // 4. Else, read OCR text/blocks/nutrition and map to resolver inputs
    const ocrText = result.summary?.text_joined || result.extractedText || '';
    const ocrBlocks = result.blocks || [];
    const nutritionFields = result.nutritionFields || {};

    if (!ocrText || ocrText.length < 10) {
      devLog('PHOTO][OCR][ERR', { duration: ocrDuration, reason: 'no_text', textLength: ocrText.length });
      return { error: 'no_text' };
    }

    const wordCount = ocrText.split(/\s+/).length;
    devLog('PHOTO][OCR][OK', { duration: ocrDuration, words: wordCount });

    // Map to resolver inputs with proper OCR threading
    const payload = {
      ...result,
      ocrTextNormalized: ocrText,
      ocrBlocks,
      nutritionFields,
      originalImage: normalized.dataUrl,
      source: 'photo-unified',
      // Ensure portion resolver gets OCR data
      portionSource: 'ocr',
      hasPer100g: !!(nutritionFields.calories || nutritionFields.energy),
    };

    devLog('PHOTO][ROUTE', { 
      used: 'ocr', 
      hasPer100g: payload.hasPer100g, 
      portionSource: payload.portionSource,
      words: wordCount
    });

    return {
      success: true,
      route: '/photo',
      source: 'ocr',
      ocrTextNormalized: ocrText,
      ocrBlocks,
      nutritionFields,
      payload
    };

  } catch (error: any) {
    const duration = Date.now() - startTime;
    devLog('PHOTO][ERROR', { duration, error: error.message });
    return { error: 'processing_failed', reason: error.message };
  }
}
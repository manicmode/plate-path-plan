import { normalizeBarcode } from '@/lib/barcode/normalizeBarcode';
import { supabase } from '@/integrations/supabase/client';
import { photoReportFromImage } from './photoReportFromImage';
import { devLog } from '@/lib/camera/devLog';

// Unified health report entry point for all sources
export async function openHealthReport(input: {
  source: 'barcode' | 'photo';
  raw?: string; // for barcode
  imageFile?: File; // for photo
  scanSource?: 'scanner-auto' | 'scanner-manual';
}) {
  const { source, raw, imageFile, scanSource } = input;
  
  if (source === 'barcode' && raw) {
    return openHealthReportFromBarcode(raw, scanSource || 'scanner-auto');
  }
  
  if (source === 'photo' && imageFile) {
    devLog('ENTRY][PHOTO', { size: imageFile.size, type: imageFile.type });
    
    const result = await photoReportFromImage(imageFile);
    
    if ('error' in result) {
      devLog('ENTRY][PHOTO][ERR', result.error);
      return { error: result.error };
    }
    
    devLog('ENTRY][PHOTO][OK', { 
      route: result.route,
      source: result.source,
      hasOCR: !!result.ocrTextNormalized,
      hasNutrition: !!result.nutritionFields 
    });
    
    return {
      success: true as const,
      route: result.route,
      source: result.source,
      payload: result.payload,
      ocrTextNormalized: result.ocrTextNormalized,
      ocrBlocks: result.ocrBlocks,
      nutritionFields: result.nutritionFields,
    };
  }
  
  return { error: 'invalid_input' as const };
}

export async function openHealthReportFromBarcode(raw: string, source: 'scanner-auto' | 'scanner-manual') {
  const { normalized, kind } = normalizeBarcode(raw);
  console.info('[ENTRY][BARCODE][NORM]', { raw, normalized, kind, source });

  if (!normalized) {
    return { error: 'invalid_barcode' as const };
  }

  try {
    // Use the same enhanced-health-scanner endpoint that auto-decode uses
    const { data: result, error } = await supabase.functions.invoke('enhanced-health-scanner', {
      body: { 
        mode: 'barcode', 
        barcode: normalized, 
        source: source === 'scanner-manual' ? 'health-scan-manual' : 'health-scan'
      }
    });

    if (error) {
      console.error('[ENTRY][BARCODE][ERROR]', error);
      return { error: 'fetch_failed' as const, barcode: normalized };
    }

    if (!result) {
      return { error: 'not_found' as const, barcode: normalized };
    }

    console.info('[ENTRY][BARCODE][SUCCESS]', { barcode: normalized, hasScore: !!result.healthScore, source });

    // Return the complete result for navigation
    return {
      success: true as const,
      route: '/health-report-standalone' as const,
      params: { mode: 'barcode', barcode: normalized, source },
      payload: result,
      source: 'barcode' as const,
      ocrTextNormalized: undefined,
      ocrBlocks: undefined,
      nutritionFields: undefined,
    };
  } catch (error) {
    console.error('[ENTRY][BARCODE][EXCEPTION]', error);
    return { error: 'fetch_failed' as const, barcode: normalized };
  }
}
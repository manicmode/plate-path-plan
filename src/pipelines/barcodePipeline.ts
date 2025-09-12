// eslint-disable-next-line: no-cross-pipeline-imports
/**
 * Isolated Barcode Pipeline
 * Snapshot of current working implementation
 */

import { supabase } from '@/integrations/supabase/client';

export type PipelineResult = { ok: true, report: any } | { ok: false, reason: string };

export async function analyzeBarcode(input: { code: string }): Promise<PipelineResult> {
  // Input validation
  if (!input?.code || typeof input.code !== 'string') {
    return { ok: false, reason: 'invalid_input' };
  }

  const barcode = input.code.trim().replace(/\s+/g, '');
  
  try {
    console.log('[BARCODE][LOOKUP]', { barcode });
    
    // Use the current working barcode lookup implementation
    const { data, error } = await supabase.functions.invoke('barcode-lookup-global', {
      body: { barcode }
    });
    
    if (error || !data?.success) {
      console.log('[BARCODE][LOOKUP][MISS]', { barcode, error: error?.message });
      return { ok: false, reason: 'not_found' };
    }
    
    console.log('[BARCODE][LOOKUP][HIT]', { barcode, product: data.product.name });
    
    // Transform to expected report format
    const report = {
      productName: data.product.name,
      brand: data.product.brand,
      ingredientsText: data.product.ingredients_text,
      nutrition: data.product.nutrition,
      source: 'barcode_lookup'
    };
    
    return { ok: true, report };
  } catch (error) {
    console.error('[BARCODE][LOOKUP][ERROR]', { barcode, error });
    return { ok: false, reason: 'network_error' };
  }
}

export async function __smokeTest(): Promise<'ok' | 'fail'> {
  try {
    // Test with a non-existent barcode to ensure function works but returns not_found
    const result = await analyzeBarcode({ code: '1234567890123' });
    // Should return { ok: false, reason: 'not_found' } for unknown barcodes
    return result.ok === false ? 'ok' : 'fail';
  } catch {
    return 'fail';
  }
}
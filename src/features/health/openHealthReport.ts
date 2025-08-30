import { normalizeBarcode } from '@/lib/barcode/normalizeBarcode';
import { supabase } from '@/integrations/supabase/client';

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
    };
  } catch (error) {
    console.error('[ENTRY][BARCODE][EXCEPTION]', error);
    return { error: 'fetch_failed' as const, barcode: normalized };
  }
}
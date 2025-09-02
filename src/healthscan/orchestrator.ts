import { analyzeLyfV1 } from '@/lyf_v1_frozen/detectorClient';
import { supabase } from '@/integrations/supabase/client';

export interface HealthScanItem {
  name: string;
  grams: number | null;
  canonicalName: string;
  needsDetails: boolean;
  healthTag: 'green' | 'yellow' | 'red' | 'neutral';
  calories: number | null;
  macros: any | null;
  source: string;
  confidence: number | null;
}

export interface HealthScanResult {
  results: HealthScanItem[];
  _debug?: any;
}

export async function analyzeForHealthScan(imageBase64: string): Promise<HealthScanResult> {
  // Reuse v1 detector but pass debug flag for richer diagnostics
  const { items, _debug } = await analyzeLyfV1(supabase, imageBase64);

  // Map to health-scan model: add quick health tags (stub if no scoring lib)
  // Keep ALL plausible items; for unmapped, set needsDetails: true.
  const results: HealthScanItem[] = items.map(i => ({
    name: i.name,
    grams: i.portionGrams ?? null,
    canonicalName: i.canonicalName ?? i.name,
    needsDetails: !i.canonicalName,
    // placeholders for now - could be expanded with nutrition analysis
    healthTag: 'neutral' as const,
    calories: i.calories ?? null,
    macros: i.macros ?? null,
    source: i.source,
    confidence: i.confidence ?? null,
  }));

  return { results, _debug };
}

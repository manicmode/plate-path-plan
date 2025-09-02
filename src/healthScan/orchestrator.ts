import { analyzeLyfV1 } from '@/lyf_v1_frozen/detectorClient';
import { supabase } from '@/integrations/supabase/client';
import type { HealthScanResult, HealthScanItem } from './types';

export async function analyzeForHealthScan(imageBase64: string): Promise<HealthScanResult> {
  try {
    // Reuse LYF v1 detector with debug enabled in DEV
    const { items: detectorItems, _debug } = await analyzeLyfV1(supabase, imageBase64, { 
      debug: import.meta.env.DEV 
    });

    // Map detector results to health scan items
    const items: HealthScanItem[] = (detectorItems || []).map(item => ({
      name: item.name,
      canonicalName: item.name, // Use name as fallback for canonicalName
      grams: estimateGramsFromName(item.name), // Simple estimation
      source: item.source || 'label',
      confidence: item.confidence || item.score || 0.7
    }));

    // Log for debugging in dev mode
    if (import.meta.env.DEV) {
      console.log('[HS] detect from=' + (_debug?.from || 'unknown') + ' items=' + JSON.stringify(items.map(i => i.name)));
    }

    return { items, _debug };
  } catch (error) {
    console.error('[HS] Detection error:', error);
    return { 
      items: [], 
      _debug: { from: 'error', error: String(error) } 
    };
  }
}

// Simple gram estimation based on common food items
function estimateGramsFromName(name: string): number {
  const n = name.toLowerCase();
  
  // Proteins - typically larger portions
  if (/salmon|chicken|beef|pork|fish|meat|protein/.test(n)) {
    return 150;
  }
  
  // Vegetables - medium portions
  if (/asparagus|broccoli|carrot|spinach|lettuce|cucumber|tomato/.test(n)) {
    return 80;
  }
  
  // Citrus/fruits - smaller
  if (/lemon|lime|orange|apple|fruit/.test(n)) {
    return 60;
  }
  
  // Default portion
  return 100;
}
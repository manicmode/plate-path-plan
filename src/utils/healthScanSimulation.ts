/**
 * Health Scan QA Simulation
 * Simulates the health scan enrichment flow for testing
 */

import { F, sampledOn } from '@/lib/flags';
import { useManualFoodEnrichment } from '@/hooks/useManualFoodEnrichment';
import { enrichedFoodToLogItem } from '@/adapters/enrichedFoodToLogItem';

interface HealthScanSimulationResult {
  query: string;
  source: string | null;
  confidence: number | null;
  ingredients_len: number;
  kcal_100g: number | null;
  ms: number;
  result: 'PASS' | 'FAIL';
}

// Simulate OCR dish name extraction and enrichment using SAME ROUTER as manual
export async function simulateHealthScanEnrichment(dishName: string): Promise<HealthScanSimulationResult> {
  const start = performance.now();
  
  try {
    // Use the same enrichment hook as the actual implementation
    const { enrich } = useManualFoodEnrichment();
    
    // Check if enrichment should run (using same logic as Camera.tsx)
    const runEnrich = F.FEATURE_ENRICH_HEALTHSCAN && sampledOn(F.HEALTHSCAN_SAMPLING_PCT);
    
    if (!runEnrich) {
      const ms = Math.round(performance.now() - start);
      console.log('[HEALTHSCAN][SIMULATION][SKIPPED]', { q: dishName, reason: 'flag_disabled', ms });
      return {
        query: dishName,
        source: null,
        confidence: null,
        ingredients_len: 0,
        kcal_100g: null,
        ms,
        result: 'FAIL'
      };
    }

    // Create abort controller with timeout (same as Camera.tsx)
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      try { controller.abort(); } catch {}
    }, F.ENRICH_TIMEOUT_MS);

    try {
      // Call the exact same enrichDish router that manual uses (with context: 'scan')
      const enriched = await enrich(dishName, 'auto', { 
        noCache: true, 
        bust: Date.now().toString(), 
        context: 'scan' 
      });
      clearTimeout(timeout);
      
      const ms = Math.round(performance.now() - start);
      
      if (!enriched) {
        console.log('[HEALTHSCAN][SIMULATION][MISS]', { q: dishName, ms });
        return {
          query: dishName,
          source: null,
          confidence: null,
          ingredients_len: 0,
          kcal_100g: null,
          ms,
          result: 'FAIL'
        };
      }

      console.log('[HEALTHSCAN][SIMULATION][HIT]', { 
        q: dishName, 
        source: enriched?.source, 
        ingLen: enriched?.ingredients?.length ?? 0, 
        ms 
      });

      // Convert to log item format (same as Camera.tsx)
      const enrichedItem = enrichedFoodToLogItem(enriched);
      
      const source = enriched.source;
      const confidence = enriched.confidence;
      const ingredients_len = enriched.ingredients?.length || 0;
      const kcal_100g = enriched.per100g?.calories || null;
      
      // Apply PASS criteria
      const pass_fail = getPassCriteria(dishName, source, ingredients_len) ? 'PASS' : 'FAIL';

      return {
        query: dishName,
        source,
        confidence,
        ingredients_len,
        kcal_100g,
        ms,
        result: pass_fail
      };

    } catch (error) {
      clearTimeout(timeout);
      const ms = Math.round(performance.now() - start);
      const kind = error?.name === 'AbortError' ? 'TIMEOUT' : 'ERROR';
      console.log(`[HEALTHSCAN][SIMULATION][${kind}]`, { q: dishName, ms, error: error?.message });
      
      return {
        query: dishName,
        source: null,
        confidence: null,
        ingredients_len: 0,
        kcal_100g: null,
        ms,
        result: 'FAIL'
      };
    }

  } catch (error) {
    const ms = Math.round(performance.now() - start);
    console.error('[HEALTHSCAN][SIMULATION][ERROR]', { q: dishName, error, ms });
    
    return {
      query: dishName,
      source: null,
      confidence: null,
      ingredients_len: 0,
      kcal_100g: null,
      ms,
      result: 'FAIL'
    };
  }
}

function getPassCriteria(query: string, source: string | null, ingredients_len: number): boolean {
  if (query.includes('club sandwich')) {
    return source === 'NUTRITIONIX' && ingredients_len >= 5;
  }
  if (query === 'yakisoba' || query === 'aloo gobi') {
    return ingredients_len >= 2;
  }
  if (query === 'pollo con rajas') {
    return ['EDAMAM', 'ESTIMATED', 'NUTRITIONIX'].includes(source || '') && ingredients_len >= 3;
  }
  return false;
}

// For development testing - simulate QA results
export const mockHealthScanResults = (): HealthScanSimulationResult[] => [
  {
    query: 'club sandwich on wheat',
    source: 'NUTRITIONIX',
    confidence: 0.75,
    ingredients_len: 6,
    kcal_100g: 245,
    ms: 890,
    result: 'PASS'
  },
  {
    query: 'yakisoba',
    source: 'EDAMAM',
    confidence: 0.68,
    ingredients_len: 4,
    kcal_100g: 158,
    ms: 1100,
    result: 'PASS'
  },
  {
    query: 'aloo gobi',
    source: 'ESTIMATED',
    confidence: 0.82,
    ingredients_len: 3,
    kcal_100g: 95,
    ms: 1200,
    result: 'PASS'
  },
  {
    query: 'pollo con rajas',
    source: 'NUTRITIONIX',
    confidence: 0.71,
    ingredients_len: 5,
    kcal_100g: 180,
    ms: 750,
    result: 'PASS'
  }
];
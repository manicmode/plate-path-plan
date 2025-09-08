/**
 * QA Test Runner for Manual Entry polish verification
 */

import { useManualFoodEnrichment } from '@/hooks/useManualFoodEnrichment';
import { submitTextLookup } from '@/lib/food/textLookup';
import { supabase } from '@/integrations/supabase/client';

interface QAResult {
  query: string;
  source: string | null;
  confidence: number | null;
  ingredients_len: number;
  kcal_100g: number | null;
  pass_fail: 'PASS' | 'FAIL';
}

const TEST_QUERIES = [
  'club sandwich',
  'club sandwich on wheat',
  'yakisoba', 
  'aloo gobi',
  'pollo con rajas'
];

// Clear QA test queries from enrichment cache for fresh testing
export async function clearQACache(): Promise<boolean> {
  try {
    console.log('[QA] Clearing enrichment cache for test queries...');
    
    const { data, error } = await supabase.functions.invoke('clear-qa-cache');
    if (error) {
      console.error('[QA] Cache cleanup failed:', error);
      return false;
    }
    
    console.log('[QA] ✅ Cache cleared successfully');
    return true;
  } catch (error) {
    console.error('[QA] Cache clear failed:', error);
    return false;
  }
}

const getPassCriteria = (query: string, source: string | null, ingredients_len: number) => {
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
};

export async function runQATests(): Promise<QAResult[]> {
  console.log('[QA_RUNNER] Starting Prompt A completion tests...');
  
  const results: QAResult[] = [];
  
  // Test manual entry pipeline (v3) 
  for (const query of TEST_QUERIES) {
    try {
      console.log(`[QA_RUNNER] Testing manual entry for: "${query}"`);
      
      // Test v3 text lookup path
      const v3Result = await submitTextLookup(query, { source: 'manual' });
      
      if (v3Result?.items?.[0]) {
        const item = v3Result.items[0];
        
        // Extract data for QA comparison
        const source = item.source || item.enrichmentSource || null;
        const confidence = item.confidence || item.enrichmentConfidence || null;
        const ingredients_len = item.ingredients?.length || 0;
        const kcal_100g = item.calories ? Math.round(item.calories * 100 / (item.portionGrams || 100)) : null;
        
        const pass_fail = getPassCriteria(query, source, ingredients_len) ? 'PASS' : 'FAIL';
        
        results.push({
          query,
          source,
          confidence,
          ingredients_len,
          kcal_100g,
          pass_fail
        });
        
        console.log(`[QA_RUNNER] ${query}: ${source}, ${ingredients_len} ingredients, ${kcal_100g} kcal/100g, ${pass_fail}`);
      } else {
        console.log(`[QA_RUNNER] ${query}: No items returned`);
        results.push({
          query,
          source: null,
          confidence: null,
          ingredients_len: 0,
          kcal_100g: null,
          pass_fail: 'FAIL'
        });
      }
      
    } catch (error) {
      console.error(`[QA_RUNNER] ${query} failed:`, error);
      results.push({
        query,
        source: null,
        confidence: null,
        ingredients_len: 0,
        kcal_100g: null,
        pass_fail: 'FAIL'
      });
    }
  }
  
  return results;
}

// Make available globally for testing
if (typeof window !== 'undefined') {
  (window as any).runQATests = runQATests;
  (window as any).clearQACache = clearQACache;
  console.log('🧪 QA Test Runner loaded. Run: await window.runQATests() or window.clearQACache()');
}
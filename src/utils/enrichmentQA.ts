/**
 * QA utilities for testing food enrichment
 */
import { useManualFoodEnrichment } from '@/hooks/useManualFoodEnrichment';

const TEST_QUERIES = [
  'club sandwich',
  'club sandwich on wheat', 
  'yakisoba',
  'aloo gobi',
  'pollo con rajas'
];

export async function testEnrichmentFlow() {
  console.log('[QA] Starting enrichment flow test...');
  
  const { enrich } = useManualFoodEnrichment();
  
  for (const query of TEST_QUERIES) {
    try {
      console.log(`[QA] Testing: "${query}"`);
      
      const result = await enrich(query);
      
      if (result) {
        console.log(`[QA] ✅ ${query}: ${result.source}, ${result.ingredients?.length || 0} ingredients`);
      } else {
        console.log(`[QA] ❌ ${query}: No result`);
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`[QA] ❌ ${query}: Error -`, error);
    }
  }
}

// Expose to global for easy testing
if (typeof window !== 'undefined') {
  (window as any).testEnrichment = testEnrichmentFlow;
}
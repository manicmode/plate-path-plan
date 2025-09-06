/**
 * Test utility to demonstrate [MANUAL_DIAG][LABEL] logging
 */

import { submitTextLookup } from '@/lib/food/textLookup';

export async function testManualDiagnostics() {
  console.log('[TEST_DIAG] Starting manual diagnostics test...');
  console.log('[TEST_DIAG] Note: Set VITE_MANUAL_ENTRY_DIAG=1 to see [MANUAL_DIAG][LABEL] logs');
  
  const testQueries = [
    'grilled chicken',
    'pizza slice', 
    'burger',
    'california roll'
  ];
  
  for (const query of testQueries) {
    try {
      console.log(`[TEST_DIAG] Testing: "${query}"`);
      const result = await submitTextLookup(query, { source: 'manual' });
      
      if (result?.items?.[0]) {
        const item = result.items[0];
        console.log(`[TEST_DIAG] Result: ${item.name} (${item.__source || item.source})`);
        
        // Log __altCandidates for brand evidence verification
        if (item.__altCandidates) {
          console.log(`[TEST_DIAG] Alt candidates: ${item.__altCandidates.length}`);
          item.__altCandidates.slice(0, 3).forEach((alt: any, i: number) => {
            console.log(`[TEST_DIAG] Alt ${i}: ${alt.name}, brand: ${alt.brand}, code: ${alt.code}, canonicalKey: ${alt.canonicalKey}`);
          });
        }
      }
      
    } catch (error) {
      console.error(`[TEST_DIAG] Error testing "${query}":`, error);
    }
  }
  
  console.log('[TEST_DIAG] Manual diagnostics test completed');
}

// Make available globally
if (typeof window !== 'undefined') {
  (window as any).testManualDiagnostics = testManualDiagnostics;
  console.log('🧪 Manual Diagnostics Test loaded. Run: await window.testManualDiagnostics()');
}
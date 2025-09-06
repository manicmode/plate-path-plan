/**
 * QA Test Suite for Enrichment Integration
 * Run these tests to verify the enrichment system is working correctly
 */

import { supabase } from '@/lib/supabase';

export async function testEnrichmentFlow() {
  const testQueries = [
    'pollo con rajas',  // Mexican chicken dish
    'yakisoba',         // Japanese stir-fried noodles  
    'aloo gobi',        // Indian potato cauliflower curry
    'shakshuka',        // Middle Eastern egg dish
    'club sandwich'     // American sandwich
  ];
  
  console.log('[ENRICH][QA] Starting enrichment tests...');
  
  for (const query of testQueries) {
    try {
      console.log(`[ENRICH][REQ] q="${query}"`);
      
      const { data, error } = await supabase.functions.invoke('enrich-manual-food', { 
        body: { query, locale: 'auto' } 
      });
      
      if (error) {
        console.log(`[ENRICH][ERROR] ${query}:`, error);
        continue;
      }
      
      if (data) {
        console.log(`[ENRICH][HIT] ${query}: source=${data.source}, conf=${data.confidence}`);
        console.log(`[ENRICH][DATA] ingredients=${data.ingredients?.length || 0}, macros=${!!data.per100g}`);
        
        // Check expected results
        const hasIngredients = Array.isArray(data.ingredients) && data.ingredients.length > 0;
        const hasPer100g = data.per100g && typeof data.per100g.calories === 'number';
        const hasSource = ['FDC', 'EDAMAM', 'NUTRITIONIX', 'CURATED', 'ESTIMATED'].includes(data.source);
        const hasConfidence = typeof data.confidence === 'number' && data.confidence >= 0 && data.confidence <= 1;
        
        console.log(`[ENRICH][VALIDATION] ${query}:`, {
          hasIngredients,
          hasPer100g, 
          hasSource,
          hasConfidence,
          valid: hasIngredients && hasPer100g && hasSource && hasConfidence
        });
      } else {
        console.log(`[ENRICH][MISS] ${query}: No data returned`);
      }
      
    } catch (error) {
      console.log(`[ENRICH][ERROR] ${query}:`, error);
    }
  }
  
  console.log('[ENRICH][QA] Tests completed.');
}

// Test feature flag functionality
export function testFeatureFlag() {
  // Test disabling the feature
  localStorage.setItem('FEATURE_ENRICH_MANUAL_FOOD', 'false');
  console.log('[ENRICH][FLAG] Disabled enrichment feature');
  
  // Re-enable
  setTimeout(() => {
    localStorage.setItem('FEATURE_ENRICH_MANUAL_FOOD', 'true');
    console.log('[ENRICH][FLAG] Re-enabled enrichment feature');
  }, 2000);
}

// Add to window for easy console access
if (typeof window !== 'undefined') {
  (window as any).testEnrichment = testEnrichmentFlow;
  (window as any).testFeatureFlag = testFeatureFlag;
}
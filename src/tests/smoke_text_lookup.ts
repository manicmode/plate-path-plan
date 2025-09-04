// Dev-only smoke tests for unified text lookup system

import { submitTextLookup } from '@/lib/food/textLookup';

export interface SmokeTestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
  details?: any;
}

/**
 * Test manual text lookup
 */
export async function smokeTestManualLookup(): Promise<SmokeTestResult> {
  const start = Date.now();
  const testName = 'Manual Text Lookup';
  
  try {
    const { items, cached } = await submitTextLookup('grilled salmon 200g', { 
      source: 'manual' 
    });
    
    const duration = Date.now() - start;
    
    // Validation
    if (!items || items.length === 0) {
      return { name: testName, passed: false, error: 'No items returned', duration };
    }

    const item = items[0];
    if (!item.calories || item.calories <= 0) {
      return { name: testName, passed: false, error: 'Invalid calories', duration, details: item };
    }

    if (!item.protein_g || item.protein_g <= 0) {
      return { name: testName, passed: false, error: 'Invalid protein', duration, details: item };
    }

    if (item.source !== 'manual') {
      return { name: testName, passed: false, error: 'Wrong source field', duration, details: item };
    }

    return { 
      name: testName, 
      passed: true, 
      duration,
      details: { 
        itemCount: items.length, 
        cached,
        provider: item.provider,
        calories: item.calories,
        protein: item.protein_g
      }
    };
    
  } catch (error) {
    return { 
      name: testName, 
      passed: false, 
      error: (error as Error).message, 
      duration: Date.now() - start 
    };
  }
}

/**
 * Test speech text lookup (simulated transcript)
 */
export async function smokeTestSpeechLookup(): Promise<SmokeTestResult> {
  const start = Date.now();
  const testName = 'Speech Text Lookup';
  
  try {
    const { items, cached } = await submitTextLookup('apple and peanut butter', { 
      source: 'speech' 
    });
    
    const duration = Date.now() - start;
    
    // Validation
    if (!items || items.length === 0) {
      return { name: testName, passed: false, error: 'No items returned', duration };
    }

    // Check that at least one item has valid macros
    const validItem = items.find(item => 
      item.calories > 0 && 
      item.protein_g >= 0 && 
      item.carbs_g >= 0 && 
      item.fat_g >= 0
    );

    if (!validItem) {
      return { name: testName, passed: false, error: 'No valid macros found', duration, details: items };
    }

    if (validItem.source !== 'speech') {
      return { name: testName, passed: false, error: 'Wrong source field', duration, details: validItem };
    }

    return { 
      name: testName, 
      passed: true, 
      duration,
      details: { 
        itemCount: items.length, 
        cached,
        provider: validItem.provider,
        calories: validItem.calories
      }
    };
    
  } catch (error) {
    return { 
      name: testName, 
      passed: false, 
      error: (error as Error).message, 
      duration: Date.now() - start 
    };
  }
}

/**
 * Test cache functionality
 */
export async function smokeTestCacheLookup(): Promise<SmokeTestResult> {
  const start = Date.now();
  const testName = 'Cache Functionality';
  
  try {
    const query = 'banana test cache';
    
    // First request (should not be cached)
    const { items: items1, cached: cached1 } = await submitTextLookup(query, { 
      source: 'manual',
      bypassCache: true // Force fresh lookup
    });
    
    // Second request (should be cached)
    const { items: items2, cached: cached2 } = await submitTextLookup(query, { 
      source: 'manual' 
    });
    
    const duration = Date.now() - start;
    
    if (cached1) {
      return { name: testName, passed: false, error: 'First request unexpectedly cached', duration };
    }

    if (!cached2) {
      return { name: testName, passed: false, error: 'Second request not cached', duration };
    }

    if (items1.length !== items2.length) {
      return { name: testName, passed: false, error: 'Cache returned different item count', duration };
    }

    return { 
      name: testName, 
      passed: true, 
      duration,
      details: { 
        firstCached: cached1,
        secondCached: cached2,
        itemCount: items2.length
      }
    };
    
  } catch (error) {
    return { 
      name: testName, 
      passed: false, 
      error: (error as Error).message, 
      duration: Date.now() - start 
    };
  }
}

/**
 * Run all text lookup smoke tests
 */
export async function runTextLookupSmokeTests(): Promise<SmokeTestResult[]> {
  console.log('🧪 === TEXT LOOKUP SMOKE TESTS START ===');
  
  const tests = [
    smokeTestManualLookup,
    smokeTestSpeechLookup,
    smokeTestCacheLookup
  ];

  const results: SmokeTestResult[] = [];
  
  for (const test of tests) {
    try {
      const result = await test();
      results.push(result);
      console.log(`${result.passed ? '✅' : '❌'} ${result.name} (${result.duration}ms)`);
      if (result.error) console.log(`   Error: ${result.error}`);
      if (result.details) console.log(`   Details:`, result.details);
    } catch (error) {
      results.push({
        name: test.name,
        passed: false,
        error: (error as Error).message,
        duration: 0
      });
      console.log(`❌ ${test.name} - Unexpected error: ${(error as Error).message}`);
    }
  }
  
  const passed = results.filter(r => r.passed).length;
  console.log(`🧪 === TEXT LOOKUP TESTS COMPLETE: ${passed}/${results.length} passed ===`);
  
  return results;
}

// Expose to global scope for dev console access
if (typeof window !== 'undefined') {
  (window as any).runTextLookupSmokeTests = runTextLookupSmokeTests;
  (window as any).smokeTestManualLookup = smokeTestManualLookup;
  (window as any).smokeTestSpeechLookup = smokeTestSpeechLookup;
  (window as any).smokeTestCacheLookup = smokeTestCacheLookup;
  console.log('🧪 Text Lookup Smoke Tests loaded. Run: window.runTextLookupSmokeTests()');
}
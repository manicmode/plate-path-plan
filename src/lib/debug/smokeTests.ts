// Smoke tests for photo pipeline - copy exactly and run these 4 tests

import { supabase } from '@/integrations/supabase/client';
import { createPhotoWatchdog, getItemImage } from './photoWatchdog';
import { extractName } from './extractName';

export interface SmokeTestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration?: number;
  details?: any;
}

// 1. Happy photo test (real product)
export async function smokeTestHappyPhoto(imageBase64: string): Promise<SmokeTestResult> {
  const start = Date.now();
  const testName = 'Happy Photo (Real Product)';
  
  try {
    const { data, error } = await supabase.functions.invoke('gpt-food-detector-v2', {
      body: { image_base64: imageBase64 }
    });
    
    const duration = Date.now() - start;
    
    if (error) {
      return { name: testName, passed: false, error: error.message, duration };
    }
    
    const passed = data && 
                   Array.isArray(data.items) && 
                   data.items.length >= 1 && 
                   data.items.every((item: any) => extractName(item) !== 'Unknown') &&
                   duration < 5000; // Allow for cold start
    
    return { 
      name: testName, 
      passed, 
      duration,
      details: {
        itemCount: data?.items?.length || 0,
        names: data?.items?.map((item: any) => extractName(item)) || [],
        hasMetadata: !!data?.metadata
      }
    };
  } catch (error) {
    return { 
      name: testName, 
      passed: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - start 
    };
  }
}

// 2. Blank photo test
export async function smokeTestBlankPhoto(): Promise<SmokeTestResult> {
  const start = Date.now();
  const testName = 'Blank Photo';
  
  // Create a 1x1 white pixel as base64
  const blankImageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
  
  try {
    const { data, error } = await supabase.functions.invoke('gpt-food-detector-v2', {
      body: { image_base64: blankImageBase64 }
    });
    
    const duration = Date.now() - start;
    
    if (error) {
      return { name: testName, passed: false, error: error.message, duration };
    }
    
    const passed = data && 
                   Array.isArray(data.items) && 
                   data.items.length === 0 &&
                   duration < 3000; // Should be faster for blank
    
    return { 
      name: testName, 
      passed, 
      duration,
      details: {
        itemCount: data?.items?.length || 0,
        emptyResponse: data?.items?.length === 0
      }
    };
  } catch (error) {
    return { 
      name: testName, 
      passed: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - start 
    };
  }
}

// 3. Watchdog timeout test (simulate slow response)
export async function smokeTestWatchdog(): Promise<SmokeTestResult> {
  const start = Date.now();
  const testName = 'Watchdog Timeout';
  
  let watchdogFired = false;
  let spinnerStopped = false;
  
  const mockStopSpinner = () => { spinnerStopped = true; };
  const mockShowError = () => { watchdogFired = true; };
  
  const watchdog = createPhotoWatchdog('test-watchdog', mockStopSpinner, mockShowError, 1000); // 1s timeout
  
  try {
    // Simulate 1.5s delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    watchdog.clear();
    const duration = Date.now() - start;
    
    const passed = watchdogFired && spinnerStopped;
    
    return {
      name: testName,
      passed,
      duration,
      details: {
        watchdogFired,
        spinnerStopped,
        timeoutMs: 1000
      }
    };
  } catch (error) {
    watchdog.clear();
    return { 
      name: testName, 
      passed: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - start 
    };
  }
}

// 4. Name permutation test
export async function smokeTestNamePermutations(): Promise<SmokeTestResult> {
  const start = Date.now();
  const testName = 'Name Permutations';
  
  try {
    const testItems = [
      { productName: 'Granola' },
      { title: 'Granola Bar' },
      { displayName: 'Granola Mix' },
      { name: 'Original Granola' },
      {} // Should fallback to 'Unknown'
    ];
    
    const results = testItems.map(item => ({
      input: item,
      output: extractName(item),
      image: getItemImage(item)
    }));
    
    const passed = results[0].output === 'Granola' &&
                   results[1].output === 'Granola Bar' &&
                   results[2].output === 'Granola Mix' &&
                   results[3].output === 'Original Granola' &&
                   results[4].output === 'Unknown';
    
    return {
      name: testName,
      passed,
      duration: Date.now() - start,
      details: {
        results,
        allNamesResolved: results.slice(0, 4).every(r => r.output !== 'Unknown'),
        fallbackWorking: results[4].output === 'Unknown'
      }
    };
  } catch (error) {
    return { 
      name: testName, 
      passed: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - start 
    };
  }
}

// Run all smoke tests
export async function runAllSmokeTests(happyPhotoBase64?: string): Promise<SmokeTestResult[]> {
  console.log('[SMOKE_TESTS] Starting comprehensive photo pipeline tests...');
  
  const results: SmokeTestResult[] = [];
  
  // 1. Happy photo test (only if image provided)
  if (happyPhotoBase64) {
    results.push(await smokeTestHappyPhoto(happyPhotoBase64));
  }
  
  // 2. Blank photo test
  results.push(await smokeTestBlankPhoto());
  
  // 3. Watchdog test
  results.push(await smokeTestWatchdog());
  
  // 4. Name permutation test
  results.push(await smokeTestNamePermutations());
  
  console.log('[SMOKE_TESTS] Results:', results);
  
  const passedCount = results.filter(r => r.passed).length;
  const totalCount = results.length;
  
  console.log(`[SMOKE_TESTS] Passed: ${passedCount}/${totalCount}`);
  
  return results;
}
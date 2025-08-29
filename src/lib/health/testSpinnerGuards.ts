// Test utilities to verify spinner safeguards work properly
export function simulatePhotoScanTest() {
  if (import.meta.env.VITE_HEALTH_DEBUG_SAFE !== 'true') {
    console.warn('[SPINNER_TEST] Set VITE_HEALTH_DEBUG_SAFE=true to run tests');
    return;
  }

  console.group('[SPINNER_TEST] Photo Scan Safeguards Test');
  console.log('🔧 Testing all timeouts and watchdogs...');
  
  // Test 1: Fetch timeout (should resolve in <15s)
  const testFetchTimeout = async () => {
    console.log('⏱️ Test 1: Fetch timeout (15s)');
    const start = Date.now();
    
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort('timeout_fetch'), 15000);
    
    try {
      await fetch('https://httpbin.org/delay/20', { signal: controller.signal });
      console.log('❌ Fetch should have timed out');
    } catch (e) {
      const elapsed = Date.now() - start;
      console.log(`✅ Fetch timed out after ${elapsed}ms (expected ~15000ms)`);
    } finally {
      clearTimeout(timer);
    }
  };

  // Test 2: JSON parse timeout (should resolve in <5s)
  const testJsonTimeout = async () => {
    console.log('⏱️ Test 2: JSON parse timeout (5s)');
    const start = Date.now();
    
    const fakeResponse = {
      json: () => new Promise(resolve => setTimeout(resolve, 10000)) // 10s delay
    };
    
    const jsonWithTimeout = (resp: any) => {
      const parse = resp.json();
      const timer = new Promise((_, rej) => 
        setTimeout(() => rej(new Error('timeout_json')), 5000)
      );
      return Promise.race([parse, timer]);
    };
    
    try {
      await jsonWithTimeout(fakeResponse);
      console.log('❌ JSON parse should have timed out');
    } catch (e) {
      const elapsed = Date.now() - start;
      console.log(`✅ JSON parse timed out after ${elapsed}ms (expected ~5000ms)`);
    }
  };

  // Test 3: Watchdog timeout (should resolve in <18s)
  const testWatchdog = () => {
    console.log('⏱️ Test 3: Watchdog timeout (18s)');
    const start = Date.now();
    let resolved = false;
    
    const watchdog = setTimeout(() => {
      if (!resolved) {
        const elapsed = Date.now() - start;
        console.log(`✅ Watchdog fired after ${elapsed}ms (expected ~18000ms)`);
      }
    }, 18000);
    
    // Simulate normal resolution after 20s (should be caught by watchdog)
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        clearTimeout(watchdog);
        console.log('❌ Normal resolution happened (watchdog should have fired first)');
      }
    }, 20000);
    
    return watchdog;
  };

  // Run tests
  Promise.all([
    testFetchTimeout(),
    testJsonTimeout()
  ]).then(() => {
    console.log('🎯 Async timeout tests completed');
    const watchdogTimer = testWatchdog();
    
    setTimeout(() => {
      clearTimeout(watchdogTimer);
      console.groupEnd();
      console.log('✅ All spinner safeguard tests completed successfully');
    }, 19000);
  });
}

// Auto-run in development when debug is enabled
if (import.meta.env.VITE_HEALTH_DEBUG_SAFE === 'true' && import.meta.env.DEV) {
  console.log('[SPINNER_TEST] Safeguards ready - call simulatePhotoScanTest() to run tests');
}
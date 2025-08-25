// Mobile debugging utilities for app loading issues

export const addMobileBootTelemetry = () => {
  // Track critical boot milestones
  performance.mark('mobile-boot-start');
  console.log('📱 Mobile boot telemetry started');

  // Monitor for common mobile failures
  const checkpoints = {
    domLoaded: false,
    reactMounted: false,
    routerReady: false,
    firstPaint: false
  };

  // DOM ready checkpoint
  if (document.readyState === 'complete') {
    checkpoints.domLoaded = true;
    console.log('✅ DOM already loaded');
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      checkpoints.domLoaded = true;
      console.log('✅ DOM loaded');
    });
  }

  // React mount checkpoint
  const originalConsoleLog = console.log;
  console.log = (...args) => {
    if (args[0]?.includes?.('react:mounted')) {
      checkpoints.reactMounted = true;
      console.log('✅ React mounted');
    }
    originalConsoleLog.apply(console, args);
  };

  // First paint checkpoint
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.name === 'first-contentful-paint') {
        checkpoints.firstPaint = true;
        console.log('✅ First contentful paint:', entry.startTime + 'ms');
      }
    }
  });
  
  try {
    observer.observe({ entryTypes: ['paint'] });
  } catch (error) {
    console.warn('Performance observer not supported:', error);
  }

  // Boot timeout detector
  setTimeout(() => {
    const failedCheckpoints = Object.entries(checkpoints)
      .filter(([_, passed]) => !passed)
      .map(([name, _]) => name);

    if (failedCheckpoints.length > 0) {
      console.error('🚨 Mobile boot failed at checkpoints:', failedCheckpoints);
      console.log('🔍 Boot diagnostics:', {
        checkpoints,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        documentState: document.readyState,
        visibilityState: document.visibilityState
      });
    } else {
      console.log('✅ All mobile boot checkpoints passed');
    }
  }, 15000); // 15 second timeout
};

// Safe service worker management
export const safeServiceWorkerCleanup = async () => {
  if (!('serviceWorker' in navigator)) return;

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    console.log('🔍 Found service worker registrations:', registrations.length);

    // Log all registrations for debugging
    registrations.forEach((reg, i) => {
      console.log(`Service worker ${i}:`, {
        scope: reg.scope,
        active: reg.active?.scriptURL,
        state: reg.active?.state,
        installing: !!reg.installing,
        waiting: !!reg.waiting
      });
    });

    // In case of mobile loading issues, we might want to clean up old service workers
    const shouldCleanup = sessionStorage.getItem('force-sw-cleanup') === 'true';
    if (shouldCleanup) {
      console.log('🧹 Force cleaning service workers...');
      await Promise.all(registrations.map(reg => reg.unregister()));
      sessionStorage.removeItem('force-sw-cleanup');
      console.log('✅ Service workers cleaned up');
    }
  } catch (error) {
    console.error('Service worker cleanup failed:', error);
  }
};

// Mobile-specific error tracking
export const trackMobileErrors = () => {
  const mobileErrorCounts = {
    importErrors: 0,
    networkErrors: 0,
    serviceWorkerErrors: 0,
    storageErrors: 0
  };

  const originalError = window.onerror;
  window.onerror = (message, source, lineno, colno, error) => {
    const messageStr = String(message);
    
    if (messageStr.includes('import') || messageStr.includes('Loading')) {
      mobileErrorCounts.importErrors++;
    }
    if (messageStr.includes('fetch') || messageStr.includes('network')) {
      mobileErrorCounts.networkErrors++;
    }
    if (messageStr.includes('service worker') || messageStr.includes('ServiceWorker')) {
      mobileErrorCounts.serviceWorkerErrors++;
    }
    if (messageStr.includes('storage') || messageStr.includes('localStorage')) {
      mobileErrorCounts.storageErrors++;
    }

    // Log mobile error patterns
    if (Object.values(mobileErrorCounts).some(count => count > 0)) {
      console.error('📱 Mobile error patterns detected:', mobileErrorCounts);
    }

    if (originalError) {
      return originalError(message, source, lineno, colno, error);
    }
    return false;
  };
};
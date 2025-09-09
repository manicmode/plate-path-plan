// capture runtime errors so we can see why a blank page ever happens
window.onerror = (m, s, l, c, e) => console.error('[BOOT][onerror]', m, s, l, c, e);
window.onunhandledrejection = (e) => console.error('[BOOT][unhandledrejection]', e?.reason || e);

import { StrictMode } from "react";
import * as React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./styles/animations.css";
import { enablePerfHUD, enableResourceMonitoring } from '@/lib/perf';
import ErrorBoundary from "./components/ErrorBoundary";
import { AuthProvider } from "./contexts/auth";
import { NutritionProvider } from "./contexts/NutritionContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import { HealthScanEnrichmentBootstrap } from "./components/bootstrap/HealthScanEnrichmentBootstrap";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { applySecurityHeaders } from "./lib/securityHeaders";
import { logActiveCSP, validateSupabaseCSP } from "./lib/cspUtils";
import "./constants/version"; // Initialize version checking
import "./utils/gpt5FunctionTests"; // Initialize function testing utilities
import "./scripts/shipV2Globally"; // Load V2 global rollout
import "./utils/portionKillSwitch"; // Emergency kill switches
import "./utils/enrichmentQA"; // QA testing utilities
import "./lib/camera/featureFlags"; // Initialize camera feature flags
// REMOVED: import "./lib/camera/cameraGuardian"; // Legacy guardian disabled
import { installCameraGuardianWire } from "./lib/camera/guardianWire";
import "./lib/camera/testGuardian"; // Test utilities
import { installCamDump } from "./lib/camera/camDump";

// Global SFX unlock on first gesture (no UI change)
import '@/lib/sfx/autoUnlock';

// Apply security headers on app initialization
applySecurityHeaders();

// Install camera guardian wire BEFORE any camera usage
installCameraGuardianWire();

// Install camera dump utility for investigation
installCamDump();

// Single-guardian assertion logging - use devLog for gating
import { devLog } from './lib/camera/devLog';
devLog('GUARD][LEGACY] disabled', true);
devLog('GUARD][NEW] wired', true);

// Log active CSP on app mount (dev helper)
logActiveCSP('APP_MOUNT');
validateSupabaseCSP();

// Environment sanity check for diagnostics
console.log('[BCF][ENV]', {
  nodeEnv: import.meta.env.MODE,
  anonKeyLen: (import.meta.env.VITE_SUPABASE_ANON_KEY||'').length,
  projectUrl: import.meta.env.VITE_SUPABASE_URL
});

// Test instructions for diagnostics run
console.log(`[BCF][TEST_INSTRUCTIONS]
1) DevTools → Console: enable "Preserve log" + "Log XMLHttpRequests".
   DevTools → Network: enable "Preserve log" + "Disable cache".
   Clear Console & Network.
2) In Console's filter box paste:
   BCF|BARCODE|ERROR|FALLBACK|LOOKUP|OPEN_CONFIRM|PING
3) Live Scan:
   - Open barcode scanner on Log page.
   - Scan: 012345678905  (UPC-A)
   - Scan: 4006381333931 (EAN-13)
   After each, wait ~5–10s.
   Paste back ALL filtered console lines plus, for each request:
     • Method & full URL
     • Request JSON body
     • Response status
     • Response JSON
4) Manual Entry:
   - Enter the same two codes and submit.
   Paste the same Console + Network details.
5) Auth sanity (run in Console and paste output):
   ;(async () => {
     const { data } = await supabase.auth.getUser();
     console.log('[AUTH_CHECK]', { userId: data?.user?.id ?? null, isLoggedIn: !!data?.user?.id });
   })()`);

// Enable enrichment feature for QA runs
if (typeof window !== 'undefined' && window.location.search.includes('QA_ENRICH=1')) {
  try { 
    localStorage.setItem('FEATURE_ENRICH_MANUAL_FOOD','true'); 
    console.log('[QA] Feature flag enabled for enrichment testing');
  } catch (e) {
    console.warn('[QA] Failed to set feature flag:', e);
  }
}

// Expose testEnrichment console helper with bust option
if (import.meta.env.MODE !== 'production' || window?.location?.search?.includes('QA_ENRICH=1')) {
  (window as any).testEnrichment = async (options = { bust: false }) => {
    const queries = ['club sandwich','club sandwich on wheat','yakisoba','aloo gobi','pollo con rajas'];
    const results = [];
    
    for (const q of queries) {
      const run = async () => {
        try {
          const { supabase } = await import('@/lib/supabase');
          const url = options.bust ? 'enrich-manual-food?bust=1' : 'enrich-manual-food';
          const { data, error } = await supabase.functions.invoke(url, {
            body: { query: q.trim(), locale: 'auto' }
          });
          
          if (error) {
            console.error(`[ENRICH QA] ${q} error:`, error);
            return { q, source: null, ingLen: 0, kcal_100g: null };
          }
          
          return { 
            q, 
            source: data?.source, 
            ingLen: (data?.ingredients || []).length, 
            kcal_100g: data?.per100g?.calories ?? null 
          };
        } catch (error) {
          console.error(`[ENRICH QA] ${q} failed:`, error);
          return { q, source: null, ingLen: 0, kcal_100g: null };
        }
      };
      
      const a = await run();
      const b = await run(); // cache hit
      results.push({ ...a, secondHitIngLen: b.ingLen });
      console.log('[ENRICH QA]', a.q, a.source, a.ingLen, a.kcal_100g, '2nd:', b.ingLen);
    }
    return results;
  };
  
  // Expose clearQACache helper
  (window as any).clearQACache = async () => {
    try {
      const { supabase } = await import('@/lib/supabase');
      const { data, error } = await supabase.functions.invoke('clear-qa-cache');
      if (error) {
        console.error('[QA] Cache clear failed:', error);
        return false;
      }
      console.log('[QA] Cache cleared successfully');
      return data?.success || true;
    } catch (error) {
      console.error('[QA] Cache clear error:', error);
      return false;
    }
  };
}

// Initialize feature flags
(window as any).__featureFlags = (window as any).__featureFlags || {};

// Enhanced mobile debugging
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

console.log('🔍 App initialization starting...', {
  isMobile,
  isIOS,
  isSafari,
  userAgent: navigator.userAgent.substring(0, 100),
  localStorage: (() => {
    try {
      localStorage.setItem('__test__', 'test');
      localStorage.removeItem('__test__');
      return 'available';
    } catch (e) {
      return `blocked: ${e.message}`;
    }
  })(),
  sessionStorage: (() => {
    try {
      sessionStorage.setItem('__test__', 'test');
      sessionStorage.removeItem('__test__');
      return 'available';
    } catch (e) {
      return `blocked: ${e.message}`;
    }
  })(),
  url: window.location.href,
  timestamp: new Date().toISOString(),
  documentReadyState: document.readyState,
  windowLoaded: document.readyState === 'complete'
});

// Additional mobile-specific checks
if (isMobile) {
  console.log('Mobile-specific info:', {
    screen: {
      width: window.screen.width,
      height: window.screen.height,
      availWidth: window.screen.availWidth,
      availHeight: window.screen.availHeight
    },
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight
    },
    memory: (performance as any).memory ? {
      used: Math.round((performance as any).memory.usedJSHeapSize / 1048576) + ' MB',
      total: Math.round((performance as any).memory.totalJSHeapSize / 1048576) + ' MB',
      limit: Math.round((performance as any).memory.jsHeapSizeLimit / 1048576) + ' MB'
    } : 'unavailable',
    connection: (navigator as any).connection ? {
      effectiveType: (navigator as any).connection.effectiveType,
      downlink: (navigator as any).connection.downlink,
      rtt: (navigator as any).connection.rtt
    } : 'unavailable'
  });
}

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Failed to find the root element");
}

// STEP 2: Performance marker for forensics
performance.mark('react:start');
console.log('[react:start]', performance.now());
console.log('[boot] html.class before mount:', document.documentElement.className);

// STEP 2: CSS readiness / Fonts logging for forensics  
document.fonts?.ready?.then(() => console.log('[fonts] ready', performance.now()));
window.addEventListener('load', () => console.log('[window] load at', performance.now()));

const root = createRoot(rootElement);

// Enhanced global error handlers for mobile debugging
window.addEventListener('error', (event) => {
  console.error('🚨 Global error caught:', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error,
    stack: event.error?.stack,
    isMobile,
    timestamp: new Date().toISOString(),
    url: window.location.href
  });
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('🚨 Unhandled promise rejection:', {
    reason: event.reason,
    promise: event.promise,
    stack: event.reason?.stack,
    isMobile,
    timestamp: new Date().toISOString(),
    url: window.location.href
  });
});

// Add visibility change handlers to track app state transitions
window.addEventListener('focus', () => {
  console.log('🔍 App focused', { timestamp: new Date().toISOString() });
});

window.addEventListener('blur', () => {
  console.log('🔍 App blurred', { timestamp: new Date().toISOString() });
});

document.addEventListener('visibilitychange', () => {
  console.log('🔍 Visibility changed:', { 
    hidden: document.hidden, 
    visibilityState: document.visibilityState,
    timestamp: new Date().toISOString()
  });
});

// For iOS Safari, add specific handlers
if (isIOS && isSafari) {
  console.log('iOS Safari detected, adding specific handlers...');
  
  // Handle iOS Safari storage issues
  try {
    const testStorage = () => {
      localStorage.setItem('ios_test', 'test');
      const value = localStorage.getItem('ios_test');
      localStorage.removeItem('ios_test');
      return value === 'test';
    };
    
    console.log('iOS Safari storage test:', testStorage() ? 'passed' : 'failed');
  } catch (error) {
    console.error('iOS Safari storage test failed:', error);
  }
}

// Check for performance monitoring flags
const urlParams = new URLSearchParams(window.location.search);
const shouldEnablePerf = urlParams.has('perf') || import.meta.env.VITE_PERF_HUD === 'true';

if (shouldEnablePerf) {
  enablePerfHUD();
  enableResourceMonitoring();
}

// Create QueryClient instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false, // Reduce unnecessary refetches
    },
  },
});

// Enhanced rendering with mobile debugging
console.log('🔍 Rendering app...', { 
  strictMode: !isMobile, 
  timestamp: new Date().toISOString(),
  rootElement: !!rootElement,
  reactVersion: React.version || 'unknown'
});

root.render(
  <ErrorBoundary>
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <NutritionProvider>
          <NotificationProvider>
            <HealthScanEnrichmentBootstrap />
            {isMobile ? (
              <App />
            ) : (
              <StrictMode>
                <App />
              </StrictMode>
            )}
          </NotificationProvider>
        </NutritionProvider>
      </QueryClientProvider>
    </AuthProvider>
  </ErrorBoundary>
);

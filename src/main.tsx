import { StrictMode } from "react";
import * as React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import ErrorBoundary from "./components/ErrorBoundary";
import { AuthProvider } from "./contexts/auth";
import { NutritionProvider } from "./contexts/NutritionContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { applySecurityHeaders } from "./lib/securityHeaders";
import "./constants/version"; // Initialize version checking
import "./utils/gpt5FunctionTests"; // Initialize function testing utilities

// Apply security headers on app initialization
applySecurityHeaders();

// --- GLOBAL MIC GUARD ON SCANNER ROUTES (TEMP) ---
(function guardGetUserMedia() {
  const md = navigator.mediaDevices;
  if (!md || !md.getUserMedia) return;
  const orig = md.getUserMedia.bind(md);
  (navigator.mediaDevices as any).getUserMedia = (constraints: any) => {
    try {
      const path = location.pathname;
      const isScanner = /^\/(scan|health-scan|barcode|photo)(\/|$)/i.test(path);
      if (isScanner) {
        constraints = constraints || {};
        // Force-disable audio on scanner routes even if callers forget
        if (constraints.audio !== false) constraints.audio = false;
        console.warn('[GUARD][GUM] audio forced false on', path);
      }
    } catch {}
    return orig(constraints);
  };
})();

// --- GLOBAL DISPLAY CAPTURE GUARD (TEMP) ---
(function guardDisplayCapture() {
  const md = navigator.mediaDevices as any;
  if (md?.getDisplayMedia) {
    const origGDM = md.getDisplayMedia.bind(md);
    md.getDisplayMedia = (constraints: any) => {
      const path = location.pathname;
      const isScanner = /^\/(scan|health-scan|barcode|photo)(\/|$)/i.test(path);
      console.warn('[GUARD][GDM] called on', path, constraints);
      if (isScanner) {
        console.error('[GUARD][GDM] BLOCKED on scanner route', path);
        return Promise.reject(new DOMException('display capture blocked on scanner route','NotAllowedError'));
      }
      return origGDM(constraints);
    };
  }

  // Block element.captureStream (video/canvas) starting a recording pipeline
  const elProto = (HTMLMediaElement as any)?.prototype;
  if (elProto?.captureStream) {
    const origCS = elProto.captureStream;
    elProto.captureStream = function(...args: any[]) {
      const path = location.pathname;
      const isScanner = /^\/(scan|health-scan|barcode|photo)(\/|$)/i.test(path);
      console.warn('[GUARD][captureStream] on', path, this.tagName, args);
      if (isScanner) {
        console.error('[GUARD][captureStream] BLOCKED on scanner route', path);
        throw new DOMException('captureStream blocked on scanner route','NotAllowedError');
      }
      return origCS.apply(this, args);
    };
  }
})();

// --- AUDIOCONTEXT TRACKING (TEMP) ---
(function tapAudioContext(){
  const anyWin = window as any;
  anyWin.__activeAudioContexts = [];
  const AC = (window as any).AudioContext;
  const WAC = (window as any).webkitAudioContext;
  function wrap(Ctor:any){
    if (!Ctor) return;
    const Orig = Ctor;
    (window as any)[Orig.name] = function(...args:any[]){
      const inst = new Orig(...args);
      try { anyWin.__activeAudioContexts.push(inst); } catch {}
      return inst;
    } as any;
    (window as any)[Orig.name].prototype = Orig.prototype;
  }
  wrap(AC); wrap(WAC);
})();

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

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
import "./utils/gpt5Testing"; // Initialize E2E testing utilities

// Apply security headers on app initialization
applySecurityHeaders();

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
      <ErrorBoundary fallback={
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="text-center space-y-4">
            <h2 className="text-xl font-bold">Loading Error</h2>
            <p className="text-muted-foreground">Please refresh the page to continue.</p>
            <button 
              onClick={() => {
                console.log('🔄 User clicked refresh button');
                window.location.reload();
              }} 
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg"
            >
              Refresh Page
            </button>
          </div>
        </div>
      }>
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
      </ErrorBoundary>
    </AuthProvider>
  </ErrorBoundary>
);

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

// Apply security headers with error handling
try {
  applySecurityHeaders();
  console.log('✅ Security headers applied successfully');
} catch (error) {
  console.warn('⚠️ Failed to apply security headers:', error);
}

// Mobile detection
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Failed to find the root element");
}
const root = createRoot(rootElement);

// Create QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

console.log('🚀 Rendering app with all components loaded successfully');

root.render(
  <ErrorBoundary>
    <AuthProvider>
      <ErrorBoundary fallback={
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="text-center space-y-4">
            <h2 className="text-xl font-bold">Loading Error</h2>
            <p className="text-muted-foreground">Please refresh the page to continue.</p>
            <button 
              onClick={() => window.location.reload()} 
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

console.log('✅ App rendered successfully!');
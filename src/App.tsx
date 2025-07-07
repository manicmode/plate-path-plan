import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { NutritionProvider } from "@/contexts/NutritionContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import Layout from "@/components/Layout";
import Index from "./pages/Index";
import Home from "./pages/Home";
import Camera from "./pages/Camera";
import Analytics from "./pages/Analytics";
import Coach from "./pages/Coach";
import Profile from "./pages/Profile";
import Hydration from "./pages/Hydration";
import Supplements from "./pages/Supplements";
import ProgressCalories from "./pages/ProgressCalories";
import ProgressProtein from "./pages/ProgressProtein";
import ProgressCarbs from "./pages/ProgressCarbs";
import ProgressFat from "./pages/ProgressFat";
import ProgressHydration from "./pages/ProgressHydration";
import ProgressSupplements from "./pages/ProgressSupplements";
import NotFound from "./pages/NotFound";
import { useEffect } from "react";
import ErrorBoundary from "./components/ErrorBoundary";

// Create query client with enhanced mobile-optimized settings
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: (failureCount, error) => {
        // More conservative retries on mobile
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const maxRetries = isMobile ? 1 : 3;
        return failureCount < maxRetries;
      },
      // Add mobile-specific timeout
      networkMode: 'online',
    },
  },
});

function App() {
  useEffect(() => {
    // Enhanced mobile app lifecycle management with better error handling
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

    console.log('App initializing with enhanced mobile support:', { 
      isMobile, 
      isIOS, 
      isSafari,
      userAgent: navigator.userAgent.substring(0, 100)
    });

    // Mobile-specific initialization
    if (isMobile) {
      // Check for critical mobile issues
      try {
        // Test localStorage availability
        localStorage.setItem('__mobile_test__', 'test');
        localStorage.removeItem('__mobile_test__');
        
        // Log mobile-specific info
        console.log('Mobile initialization successful:', {
          viewport: { width: window.innerWidth, height: window.innerHeight },
          screen: { width: window.screen.width, height: window.screen.height },
          pixelRatio: window.devicePixelRatio,
          memory: (performance as any).memory ? {
            used: Math.round((performance as any).memory.usedJSHeapSize / 1048576) + ' MB',
            limit: Math.round((performance as any).memory.jsHeapSizeLimit / 1048576) + ' MB'
          } : 'unavailable'
        });
      } catch (error) {
        console.error('Mobile initialization failed:', error);
        // Don't block app loading, but log the issue
      }
    }

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('App regained visibility - invalidating queries');
        queryClient.invalidateQueries();
      }
    };

    const handleFocus = () => {
      console.log('Window focused - invalidating queries');
      queryClient.invalidateQueries();
    };

    const handleOnline = () => {
      console.log('Network reconnected - invalidating queries');
      queryClient.invalidateQueries();
    };

    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        console.log('Page restored from cache (iOS) - invalidating queries');
        queryClient.invalidateQueries();
      }
    };

    // Enhanced error handling for mobile
    const handleError = (event: ErrorEvent) => {
      console.error('Global error caught:', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error,
        isMobile,
        timestamp: new Date().toISOString()
      });

      // Mobile-specific error recovery
      if (isMobile && event.error?.message?.includes('memory')) {
        console.log('Memory error detected on mobile, triggering cleanup');
        // Force garbage collection if available
        if ((window as any).gc) {
          try {
            (window as any).gc();
          } catch (e) {
            console.warn('Manual GC failed:', e);
          }
        }
      }
    };

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('online', handleOnline);
    window.addEventListener('error', handleError);

    if (isIOS && isSafari) {
      window.addEventListener('pageshow', handlePageShow);
    }

    // Mobile-specific: reduce emergency refresh timeout
    const emergencyRefresh = setTimeout(() => {
      if (document.hidden && isMobile) {
        console.log('Emergency refresh - mobile app may be stuck');
        queryClient.invalidateQueries();
      }
    }, isMobile ? 15000 : 30000); // 15s for mobile, 30s for desktop

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('error', handleError);
      
      if (isIOS && isSafari) {
        window.removeEventListener('pageshow', handlePageShow);
      }
      
      clearTimeout(emergencyRefresh);
    };
  }, []);

  useEffect(() => {
    // Simple app initialization with error handling
    const initializeApp = () => {
      try {
        console.log('App initialized successfully');
      } catch (error) {
        console.error('App initialization error:', error);
      }
    };

    setTimeout(initializeApp, 100);
  }, []);

  return (
    <ErrorBoundary fallback={
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-foreground">App Initialization Error</h2>
          <p className="text-muted-foreground">
            There was an issue starting the app. This might be due to network connectivity or device limitations.
          </p>
          <div className="space-y-2">
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 w-full"
            >
              Restart App
            </button>
            <button 
              onClick={() => {
                try {
                  localStorage.clear();
                  sessionStorage.clear();
                  window.location.reload();
                } catch (e) {
                  window.location.reload();
                }
              }}
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 w-full text-sm"
            >
              Clear Data & Restart
            </button>
          </div>
        </div>
      </div>
    }>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <TooltipProvider>
            <AuthProvider>
              <NutritionProvider>
                <NotificationProvider>
                  <Toaster />
                  <BrowserRouter>
                    <Routes>
                      <Route path="/" element={<Index />} />
                      <Route path="/home" element={<Layout><Home /></Layout>} />
                      <Route path="/camera" element={<Layout><Camera /></Layout>} />
                      <Route path="/analytics" element={<Layout><Analytics /></Layout>} />
                      <Route path="/coach" element={<Layout><Coach /></Layout>} />
                      <Route path="/profile" element={<Layout><Profile /></Layout>} />
                      <Route path="/hydration" element={<Layout><Hydration /></Layout>} />
                      <Route path="/supplements" element={<Layout><Supplements /></Layout>} />
                      <Route path="/progress/calories" element={<Layout><ProgressCalories /></Layout>} />
                      <Route path="/progress/protein" element={<Layout><ProgressProtein /></Layout>} />
                      <Route path="/progress/carbs" element={<Layout><ProgressCarbs /></Layout>} />
                      <Route path="/progress/fat" element={<Layout><ProgressFat /></Layout>} />
                      <Route path="/progress/hydration" element={<Layout><ProgressHydration /></Layout>} />
                      <Route path="/progress/supplements" element={<Layout><ProgressSupplements /></Layout>} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </BrowserRouter>
                </NotificationProvider>
              </NutritionProvider>
            </AuthProvider>
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;

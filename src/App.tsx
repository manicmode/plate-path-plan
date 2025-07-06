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
import Log from "./pages/Log";
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
import { useEffect, useRef } from "react";
import ErrorBoundary from "./components/ErrorBoundary";

// Create query client with improved mobile lifecycle handling
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false, // Disable automatic refetch to prevent conflicts
      refetchOnReconnect: true,
      retry: (failureCount, error) => {
        const maxRetries = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? 1 : 3;
        return failureCount < maxRetries;
      },
    },
  },
});

function App() {
  const lastFocusTime = useRef<number>(0);
  const isRefreshing = useRef<boolean>(false);

  useEffect(() => {
    // Improved app lifecycle management
    const handleVisibilityChange = () => {
      const now = Date.now();
      
      if (!document.hidden) {
        // Only refresh if more than 30 seconds have passed since last focus
        if (now - lastFocusTime.current > 30000 && !isRefreshing.current) {
          console.log('App regained focus after significant time - refreshing data');
          isRefreshing.current = true;
          
          // Delay refresh to allow UI to settle
          setTimeout(() => {
            queryClient.invalidateQueries();
            isRefreshing.current = false;
          }, 500);
        }
        lastFocusTime.current = now;
      }
    };

    const handleFocus = () => {
      const now = Date.now();
      if (now - lastFocusTime.current > 30000 && !isRefreshing.current) {
        console.log('Window focused after delay - refreshing data');
        isRefreshing.current = true;
        
        setTimeout(() => {
          queryClient.invalidateQueries();
          isRefreshing.current = false;
        }, 500);
      }
      lastFocusTime.current = now;
    };

    const handleOnline = () => {
      if (!isRefreshing.current) {
        console.log('Network reconnected - refreshing data');
        isRefreshing.current = true;
        
        setTimeout(() => {
          queryClient.invalidateQueries();
          isRefreshing.current = false;
        }, 1000);
      }
    };

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('online', handleOnline);

    // iOS Safari specific handling
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
      window.addEventListener('pageshow', (event) => {
        if (event.persisted) {
          console.log('Page restored from cache - refreshing data');
          if (!isRefreshing.current) {
            isRefreshing.current = true;
            setTimeout(() => {
              queryClient.invalidateQueries();
              isRefreshing.current = false;
            }, 1000);
          }
        }
      });
    }

    // Initialize last focus time
    lastFocusTime.current = Date.now();

    // Cleanup function
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  useEffect(() => {
    // Simple app initialization
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
          <h2 className="text-2xl font-bold text-foreground">App Loading Error</h2>
          <p className="text-muted-foreground">
            There was an issue loading the app. Please refresh the page.
          </p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            Refresh Page
          </button>
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
                      <Route path="/log" element={<Layout><Log /></Layout>} />
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

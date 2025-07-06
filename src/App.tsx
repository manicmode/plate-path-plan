
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
import { useEffect } from "react";
import ErrorBoundary from "./components/ErrorBoundary";

// Optimized query client for mobile
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 10, // 10 minutes
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      retry: (failureCount, error) => {
        // Only retry on network errors, max 2 times
        return failureCount < 2 && error?.message?.includes('fetch');
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: 1,
    },
  },
});

function App() {
  useEffect(() => {
    console.log('App mounted successfully');
    
    // Mobile-specific optimizations
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
      console.log('Mobile device detected, applying optimizations');
      
      // Prevent zoom on input focus (iOS Safari)
      const viewport = document.querySelector('meta[name=viewport]');
      if (viewport) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no');
      }
    }

    return () => {
      console.log('App unmounting');
    };
  }, []);

  return (
    <ErrorBoundary fallback={
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <h2 className="text-2xl font-bold text-foreground">App Error</h2>
          <p className="text-muted-foreground">
            Something went wrong. Please refresh the page.
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
